using System;
using System.Collections;
using System.Text;
using Danao.Core;
using Danao.Online;
using UnityEngine;
using UnityEngine.Networking;

namespace Danao.Save
{
    public sealed class DanaoSaveService : MonoBehaviour
    {
        [Serializable] private sealed class CloudEnvelope { public DanaoProfile profile; public int revision; public string updatedAt; }
        [Serializable] private sealed class PutBody { public int revision; public DanaoProfile profile; }
        [Serializable] private sealed class ConflictEnvelope { public string error; public CloudEnvelope current; }

        private const string LocalKey="danao.profile.v1";
        private bool _syncing;
        private bool _dirty;
        private int _cloudRevision;
        private string _serverBaseOverride;

        public DanaoProfile Profile { get; private set; }
        public bool SignedIn { get; private set; }
        public bool Syncing => _syncing;
        public bool Dirty => _dirty;
        public int CloudRevision => _cloudRevision;
        public string LastCloudMessage { get; private set; } = "LOCAL SAVE";
        public string ServerBaseOverride { get=>_serverBaseOverride; set=>_serverBaseOverride=value; }

        public event Action<DanaoProfile> ProfileChanged;
        public event Action<string> CloudStateChanged;

        private string HttpBase
        {
            get
            {
                if(!string.IsNullOrWhiteSpace(_serverBaseOverride))return _serverBaseOverride.TrimEnd('/');
                if(Uri.TryCreate(Application.absoluteURL,UriKind.Absolute,out var page)&&(page.Scheme=="http"||page.Scheme=="https"))return page.GetLeftPart(UriPartial.Authority);
                return PlayerPrefs.GetString("danao.server.base","https://duck-bear-hq.zachary-chambers2.workers.dev").TrimEnd('/');
            }
        }

        private void Awake()
        {
            Profile=LoadLocal();
            Profile.Normalise();
            SaveLocal();
        }

        public void SetProfile(DanaoProfile profile,bool queueCloud=true)
        {
            Profile=(profile??DanaoProfile.Default()).Clone();Profile.Normalise();_dirty|=queueCloud;SaveLocal();ProfileChanged?.Invoke(Profile);if(queueCloud&&SignedIn&&!_syncing)StartCoroutine(PushCloud(false));
        }

        public void CaptureMatch(LocalMatchConfig config)
        {
            if(config==null)return;
            var next=Profile.Clone();
            next.settings.healthDamage=config.Settings.HealthDamage;
            next.settings.visibleBruising=config.Settings.VisibleBruising;
            next.settings.arenaHazards=config.Settings.ArenaHazards;
            next.preferredMode=config.Mode.ToString();
            next.preferredArena=config.Arena.ToString();
            if(config.Loadouts!=null&&config.Loadouts.Length>0&&config.Loadouts[0]!=null)
            {
                next.selectedCharacter=config.Loadouts[0].Character.ToString();
                next.selectedCostume=config.Loadouts[0].Costume.ToString();
            }
            SetProfile(next,true);
        }

        public void CaptureOnlineRoom(RoomDto room,int playerId)
        {
            if(room==null)return;
            var next=Profile.Clone();
            if(room.settings!=null)
            {
                next.settings.healthDamage=room.settings.healthDamage;
                next.settings.visibleBruising=room.settings.visibleBruising;
                next.settings.arenaHazards=room.settings.arenaHazards;
                next.preferredMode=MapOnlineMode(room.settings.mode);
                next.preferredArena=room.settings.arena;
            }
            if(room.players!=null)
            {
                foreach(var p in room.players)
                {
                    if(p.id!=playerId)continue;
                    next.selectedCharacter=p.character;
                    next.selectedCostume=p.costume;
                    break;
                }
            }
            SetProfile(next,true);
        }

        private static string MapOnlineMode(string value)
        {
            if(value=="TwoVsTwo"||value=="TeamKnockout")return LocalMode.TwoVsTwo.ToString();
            if(value=="KingOfTheRing")return LocalMode.KingOfRing.ToString();
            if(Enum.TryParse(value,true,out LocalMode mode))return mode.ToString();
            return LocalMode.FreeForAll.ToString();
        }

        public void RecordMatch(bool won,int knockouts)
        {
            var next=Profile.Clone();next.stats.matches=Mathf.Min(1000000000,next.stats.matches+1);if(won)next.stats.wins=Mathf.Min(1000000000,next.stats.wins+1);next.stats.knockouts=Mathf.Clamp(next.stats.knockouts+Mathf.Max(0,knockouts),0,1000000000);SetProfile(next,true);
        }

        public void SyncCloud()
        {
            if(_syncing)return;StartCoroutine(SyncRoutine());
        }

        private IEnumerator SyncRoutine()
        {
            SetSyncing(true,"CHECKING CLOUD");
            using(var session=UnityWebRequest.Get(HttpBase+"/api/public/session"))
            {
                session.SetRequestHeader("Accept","application/json");yield return session.SendWebRequest();
                if(session.responseCode<200||session.responseCode>=300){SignedIn=false;SetSyncing(false,"LOCAL SAVE");yield break;}
                var status=OnlineProtocol.Parse<SessionResponse>(session.downloadHandler.text);SignedIn=status!=null&&status.signedIn;
            }
            if(!SignedIn){SetSyncing(false,"LOCAL SAVE · SIGN IN ON DUCK & BEAR TO SYNC");yield break;}

            using(var request=UnityWebRequest.Get(HttpBase+"/api/danao/profile"))
            {
                request.SetRequestHeader("Accept","application/json");yield return request.SendWebRequest();
                if(request.responseCode<200||request.responseCode>=300){SetSyncing(false,"CLOUD UNAVAILABLE · SAVED LOCALLY");yield break;}
                var cloud=OnlineProtocol.Parse<CloudEnvelope>(request.downloadHandler.text);
                if(cloud==null||cloud.profile==null){SetSyncing(false,"CLOUD RESPONSE INVALID · SAVED LOCALLY");yield break;}
                cloud.profile.Normalise();_cloudRevision=Mathf.Max(0,cloud.revision);
                var cloudJson=JsonUtility.ToJson(cloud.profile);var merged=DanaoProfile.Merge(Profile,cloud.profile);var mergedJson=JsonUtility.ToJson(merged);
                Profile=merged;SaveLocal();ProfileChanged?.Invoke(Profile);
                _dirty=_dirty||mergedJson!=cloudJson;
            }
            if(_dirty){yield return PushCloudInternal(false);yield break;}
            SetSyncing(false,"CLOUD SAVED");
        }

        private IEnumerator PushCloud(bool retried)
        {
            if(_syncing)yield break;SetSyncing(true,"SAVING CLOUD");yield return PushCloudInternal(retried);
        }

        private IEnumerator PushCloudInternal(bool retried)
        {
            var body=JsonUtility.ToJson(new PutBody{revision=_cloudRevision,profile=Profile});
            using(var request=new UnityWebRequest(HttpBase+"/api/danao/profile","PUT"))
            {
                request.uploadHandler=new UploadHandlerRaw(Encoding.UTF8.GetBytes(body));request.downloadHandler=new DownloadHandlerBuffer();request.SetRequestHeader("Content-Type","application/json");request.SetRequestHeader("Accept","application/json");
                yield return request.SendWebRequest();
                if(request.responseCode>=200&&request.responseCode<300)
                {
                    var saved=OnlineProtocol.Parse<CloudEnvelope>(request.downloadHandler.text);if(saved!=null){_cloudRevision=Mathf.Max(_cloudRevision,saved.revision);if(saved.profile!=null){Profile=DanaoProfile.Merge(Profile,saved.profile);SaveLocal();ProfileChanged?.Invoke(Profile);}}_dirty=false;SetSyncing(false,"CLOUD SAVED");yield break;
                }
                if(request.responseCode==409&&!retried)
                {
                    var conflict=OnlineProtocol.Parse<ConflictEnvelope>(request.downloadHandler.text);if(conflict?.current?.profile!=null){_cloudRevision=Mathf.Max(0,conflict.current.revision);Profile=DanaoProfile.Merge(Profile,conflict.current.profile);SaveLocal();ProfileChanged?.Invoke(Profile);yield return PushCloudInternal(true);yield break;}
                }
                _dirty=true;SetSyncing(false,"CLOUD UNAVAILABLE · SAVED LOCALLY");
            }
        }

        public void SaveLocal()
        {
            if(Profile==null)Profile=DanaoProfile.Default();Profile.Normalise();PlayerPrefs.SetString(LocalKey,JsonUtility.ToJson(Profile));PlayerPrefs.Save();
        }

        private static DanaoProfile LoadLocal()
        {
            var json=PlayerPrefs.GetString(LocalKey,string.Empty);if(string.IsNullOrWhiteSpace(json))return DanaoProfile.Default();try{return JsonUtility.FromJson<DanaoProfile>(json)??DanaoProfile.Default();}catch{return DanaoProfile.Default();}
        }

        private void SetSyncing(bool value,string message)
        {
            _syncing=value;LastCloudMessage=message;CloudStateChanged?.Invoke(message);
        }
    }
}
