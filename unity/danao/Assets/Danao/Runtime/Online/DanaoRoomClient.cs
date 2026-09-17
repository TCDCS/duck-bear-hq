using System;
using System.Collections;
using System.Text;
using Danao.Fighters;
using UnityEngine;
using UnityEngine.Networking;

namespace Danao.Online
{
    public sealed class DanaoRoomClient : MonoBehaviour
    {
        [Serializable] private sealed class TypeCommand { public string type; public TypeCommand(string value){type=value;} }
        [Serializable] private sealed class ReadyCommand { public string type="ready"; public bool ready; public ReadyCommand(bool value){ready=value;} }
        [Serializable] private sealed class LockCommand { public string type="lock"; public bool locked; public LockCommand(bool value){locked=value;} }

        private const string CodeKey="danao.reconnect.code";
        private const string TokenKey="danao.reconnect.token";
        private IOnlineSocket _socket;
        private bool _busy;

        public RoomDto Room { get; private set; }
        public int PlayerId { get; private set; } = -1;
        public string Token { get; private set; }
        public bool Connected => _socket != null && _socket.IsOpen;
        public bool Busy => _busy;
        public bool IsHost => Room != null && Room.hostId == PlayerId;
        public string ServerBaseOverride { get; set; }
        public string InviteUrl => Room == null ? string.Empty : HttpBase + "/games/danao/?room=" + Room.code;

        public event Action<RoomDto> RoomChanged;
        public event Action<int,InputFrameDto> InputReceived;
        public event Action<NetworkSnapshot> SnapshotReceived;
        public event Action<int,NetworkSnapshot> HostChanged;
        public event Action<MatchResultDto> ResultReceived;
        public event Action<bool> BusyChanged;
        public event Action<string> Error;
        public event Action ConnectedChanged;

        private string HttpBase
        {
            get
            {
                if(!string.IsNullOrWhiteSpace(ServerBaseOverride)) return ServerBaseOverride.TrimEnd('/');
                if(Uri.TryCreate(Application.absoluteURL,UriKind.Absolute,out var page) && (page.Scheme=="http"||page.Scheme=="https")) return page.GetLeftPart(UriPartial.Authority);
                return PlayerPrefs.GetString("danao.server.base","https://duck-bear-hq.zachary-chambers2.workers.dev").TrimEnd('/');
            }
        }

        private void Update() => _socket?.Pump();

        public void CreateRoom(string playerName, CharacterId character, CostumeId costume)
        {
            if(_busy)return;
            StartCoroutine(CreateOrJoin("/api/danao/create",OnlineProtocol.Json(new CreateRoomRequest(playerName,character.ToString(),costume.ToString()))));
        }

        public void JoinRoom(string code,string playerName,CharacterId character,CostumeId costume)
        {
            if(_busy)return;
            code=(code??string.Empty).Trim();
            if(code.Length!=4){Error?.Invoke("Enter the four-digit room code.");return;}
            StartCoroutine(CreateOrJoin("/api/danao/join",OnlineProtocol.Json(new JoinRoomRequest(code,playerName,character.ToString(),costume.ToString()))));
        }

        public bool ReconnectLastRoom()
        {
            var code=PlayerPrefs.GetString(CodeKey,string.Empty);var token=PlayerPrefs.GetString(TokenKey,string.Empty);
            if(code.Length!=4||token.Length<16)return false;
            PlayerId=-1;Token=token;Room=new RoomDto{code=code};ConnectSocket();return true;
        }

        private IEnumerator CreateOrJoin(string path,string jsonBody)
        {
            SetBusy(true);
            using(var request=new UnityWebRequest(HttpBase+path,"POST"))
            {
                request.uploadHandler=new UploadHandlerRaw(Encoding.UTF8.GetBytes(jsonBody));
                request.downloadHandler=new DownloadHandlerBuffer();
                request.SetRequestHeader("Content-Type","application/json");
                request.SetRequestHeader("Accept","application/json");
                yield return request.SendWebRequest();
                if(request.responseCode<200||request.responseCode>=300)
                {
                    var problem=OnlineProtocol.Parse<ErrorResponse>(request.downloadHandler.text);
                    Error?.Invoke(problem?.error??("Room request failed ("+request.responseCode+")."));SetBusy(false);yield break;
                }
                var response=OnlineProtocol.Parse<RoomJoinResponse>(request.downloadHandler.text);
                if(response==null||response.room==null||string.IsNullOrEmpty(response.token))
                {Error?.Invoke("The room service returned an invalid response.");SetBusy(false);yield break;}
                Room=response.room;PlayerId=response.id;Token=response.token;
                PlayerPrefs.SetString(CodeKey,Room.code);PlayerPrefs.SetString(TokenKey,Token);PlayerPrefs.Save();
                RoomChanged?.Invoke(Room);ConnectSocket();
            }
            SetBusy(false);
        }

        private void ConnectSocket()
        {
            DisposeSocket();
#if UNITY_WEBGL && !UNITY_EDITOR
            _socket=gameObject.AddComponent<WebGlSocket>();
#else
            _socket=new DesktopSocket();
#endif
            _socket.Opened+=OnOpened;_socket.Message+=OnMessage;_socket.Closed+=OnClosed;_socket.Error+=OnSocketError;
            var http=new Uri(HttpBase);var scheme=http.Scheme=="https"?"wss":"ws";
            var socketUrl=scheme+"://"+http.Authority+"/api/danao/"+Uri.EscapeDataString(Room.code)+"/socket?token="+Uri.EscapeDataString(Token);
            _socket.Connect(socketUrl);
        }

        private void OnOpened(){ConnectedChanged?.Invoke();}
        private void OnClosed(string reason){ConnectedChanged?.Invoke();if(!string.IsNullOrEmpty(reason)&&!reason.StartsWith("1000:"))Error?.Invoke(reason);}
        private void OnSocketError(string message){Error?.Invoke(string.IsNullOrEmpty(message)?"Online connection error.":message);}

        private void OnMessage(string text)
        {
            var message=OnlineProtocol.Parse<SocketMessage>(text);
            if(message==null||string.IsNullOrEmpty(message.type)){Error?.Invoke("Ignored an invalid room message.");return;}
            switch(message.type)
            {
                case "welcome":
                    if(message.id>=0)PlayerId=message.id;
                    if(message.room!=null){Room=message.room;RoomChanged?.Invoke(Room);}
                    if(message.state!=null)SnapshotReceived?.Invoke(message.state);
                    break;
                case "room": if(message.room!=null){Room=message.room;RoomChanged?.Invoke(Room);} break;
                case "input": if(message.frame!=null)InputReceived?.Invoke(message.id,message.frame); break;
                case "snapshot": if(message.state!=null)SnapshotReceived?.Invoke(message.state); break;
                case "host": HostChanged?.Invoke(message.hostId,message.state); break;
                case "result": ResultReceived?.Invoke(message.result); break;
                case "error": Error?.Invoke(message.message??"Room error."); break;
            }
        }

        public void SendReady(bool ready)=>Send(OnlineProtocol.Json(new ReadyCommand(ready)));
        public void SendChoice(CharacterId character,CostumeId costume)=>Send(OnlineProtocol.Json(new ChoiceCommandDto{character=character.ToString(),costume=costume.ToString()}));
        public void SendSetup(RoomSettingsDto settings)=>Send(OnlineProtocol.Json(new SetupCommandDto{mode=settings.mode,arena=settings.arena,healthDamage=settings.healthDamage,visibleBruising=settings.visibleBruising,arenaHazards=settings.arenaHazards,friendlyFire=settings.friendlyFire}));
        public void SendStart()=>Send(OnlineProtocol.Json(new TypeCommand("start")));
        public void SendRematch()=>Send(OnlineProtocol.Json(new TypeCommand("rematch")));
        public void SendLocked(bool locked)=>Send(OnlineProtocol.Json(new LockCommand(locked)));
        public void SendInput(InputFrameDto input)=>Send(OnlineProtocol.Json(InputCommandDto.From(input)));
        public void SendHostState(NetworkSnapshot snapshot)=>Send(OnlineProtocol.Json(new StateCommandDto{state=snapshot}));
        public void SendResult(MatchResultDto result)=>Send(OnlineProtocol.Json(new ResultCommandDto{result=result}));

        public void Leave()
        {
            if(Connected)Send(OnlineProtocol.Json(new TypeCommand("leave")));
            PlayerPrefs.DeleteKey(CodeKey);PlayerPrefs.DeleteKey(TokenKey);PlayerPrefs.Save();Room=null;PlayerId=-1;Token=null;DisposeSocket();RoomChanged?.Invoke(null);ConnectedChanged?.Invoke();
        }

        private void Send(string text)
        {
            if(!Connected){Error?.Invoke("Not connected to a Danao room.");return;}
            _socket.Send(text);
        }

        private void SetBusy(bool value){if(_busy==value)return;_busy=value;BusyChanged?.Invoke(value);}
        private void DisposeSocket()
        {
            if(_socket==null)return;_socket.Opened-=OnOpened;_socket.Message-=OnMessage;_socket.Closed-=OnClosed;_socket.Error-=OnSocketError;_socket.Dispose();if(_socket is WebGlSocket behaviour&&behaviour!=null)Destroy(behaviour);_socket=null;
        }
        private void OnDestroy()=>DisposeSocket();
    }
}
