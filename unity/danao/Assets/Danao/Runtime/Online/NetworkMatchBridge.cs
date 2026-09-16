using System.Collections.Generic;
using System.Text;
using Danao.Arenas;
using Danao.Core;
using Danao.Fighters;
using UnityEngine;

namespace Danao.Online
{
    public sealed class NetworkMatchBridge : MonoBehaviour
    {
        private const float SnapshotRate = 15f;
        private const int ClientSnapshotBudget = 22000;
        private DanaoRoomClient _client;
        private IReadOnlyList<FighterController> _fighters;
        private LocalMatch _match;
        private int _localSlot = -1;
        private bool _isHost;
        private int _inputSequence;
        private int _snapshotSequence;
        private float _nextSnapshot;
        private NetworkSnapshot _targetSnapshot;
        private string _phase = "fight";
        private string _objective = string.Empty;

        public bool IsHost => _isHost;
        public int LocalSlot => _localSlot;

        public void Configure(DanaoRoomClient client, IReadOnlyList<FighterController> fighters, int localSlot, LocalMatch match)
        {
            Unsubscribe();
            _client=client;
            _fighters=fighters;
            _localSlot=localSlot;
            _match=match;
            _isHost=client!=null&&client.IsHost;
            if(_client!=null)
            {
                _client.InputReceived+=OnInputReceived;
                _client.SnapshotReceived+=OnSnapshotReceived;
                _client.HostChanged+=OnHostChanged;
                _client.RoomChanged+=OnRoomChanged;
            }
            ApplyRole();
        }

        public void SetMatchStatus(string phase,string objective)
        {
            _phase=string.IsNullOrEmpty(phase)?"fight":phase;
            _objective=objective??string.Empty;
        }

        public void TickLocalInput(FighterInput input)
        {
            if(_client==null||_fighters==null||_localSlot<0)return;
            var fighter=FindFighter(_localSlot);if(fighter==null)return;
            fighter.TickInput(input);
            if(_isHost)return;
            _client.SendInput(new InputFrameDto{seq=++_inputSequence,moveX=input.Move.x,moveY=input.Move.y,jump=input.Jump,punch=input.Punch,grab=input.Grab,dodge=input.Dodge,fire=input.Fire,block=input.Block});
        }

        private void Update()
        {
            if(_client==null||_fighters==null||!_client.Connected)return;
            if(_isHost)
            {
                if(Time.unscaledTime<_nextSnapshot)return;
                _nextSnapshot=Time.unscaledTime+1f/SnapshotRate;
                var matchId=_client.Room?.matchId??0;
                var snapshot=NetworkSnapshot.Capture(++_snapshotSequence,matchId,_phase,_fighters,_objective,_match?.CaptureObjectiveState());
                var wrapped=OnlineProtocol.Json(new StateCommandDto{state=snapshot});
                if(Encoding.UTF8.GetByteCount(wrapped)<=ClientSnapshotBudget)_client.SendHostState(snapshot);
            }
            else if(_targetSnapshot!=null)
            {
                ApplySnapshot(_targetSnapshot,false);
            }
        }

        private void OnInputReceived(int playerId,InputFrameDto frame)
        {
            if(!_isHost||frame==null||_fighters==null)return;
            var fighter=FindFighter(playerId);if(fighter==null)return;
            fighter.TickInput(new FighterInput(new Vector2(frame.moveX,frame.moveY),frame.jump,frame.punch,frame.grab,frame.dodge,frame.fire,frame.block,false));
        }

        private void OnSnapshotReceived(NetworkSnapshot snapshot)
        {
            if(snapshot==null||_isHost)return;
            if(_targetSnapshot!=null&&snapshot.seq<=_targetSnapshot.seq)return;
            _targetSnapshot=snapshot;
        }

        private void OnHostChanged(int hostId,NetworkSnapshot retained)
        {
            var becomingHost=_client!=null&&hostId==_client.PlayerId;
            if(becomingHost&&retained!=null)ApplySnapshot(retained,true);
            _isHost=becomingHost;
            if(retained!=null)_snapshotSequence=Mathf.Max(_snapshotSequence,retained.seq);
            ApplyRole();
        }

        private void OnRoomChanged(RoomDto room)
        {
            if(room==null)return;
            var shouldHost=room.hostId==_client.PlayerId;
            if(shouldHost!=_isHost){_isHost=shouldHost;ApplyRole();}
        }

        private void ApplyRole()
        {
            _match?.SetSimulationAuthority(_isHost);
            SetArenaAuthority(_isHost);
            if(_fighters==null)return;
            for(var i=0;i<_fighters.Count;i++)
            {
                var fighter=_fighters[i];if(fighter==null)continue;
                fighter.SetCombatAuthority(_isHost);
                fighter.Health.SetDamageAuthority(_isHost);
                if(_isHost){fighter.Body.isKinematic=false;fighter.SetControlSuppressed(false);}
                else if(fighter.Slot!=_localSlot){fighter.SetControlSuppressed(true);fighter.Body.isKinematic=true;}
                else {fighter.Body.isKinematic=false;fighter.SetControlSuppressed(false);}
            }
        }

        private void SetArenaAuthority(bool authority)
        {
            foreach(var hazard in Object.FindObjectsByType<ArenaHazardController>(FindObjectsSortMode.None))
                hazard.SetSimulationAuthority(authority);
            foreach(var rope in Object.FindObjectsByType<RopeBouncer>(FindObjectsSortMode.None))
                rope.SetSimulationAuthority(authority);
        }

        private void ApplySnapshot(NetworkSnapshot snapshot,bool exact)
        {
            if(snapshot==null)return;
            if(snapshot.fighters!=null&&_fighters!=null)
            {
                for(var i=0;i<snapshot.fighters.Length;i++)
                {
                    var state=snapshot.fighters[i];if(state==null)continue;var fighter=FindFighter(state.slot);if(fighter==null)continue;
                    var isLocal=!_isHost&&fighter.Slot==_localSlot;var blend=exact?1f:(isLocal ? .22f : .48f);
                    fighter.transform.position=Vector3.Lerp(fighter.transform.position,state.Position,blend);
                    fighter.transform.rotation=Quaternion.Slerp(fighter.transform.rotation,state.Rotation,blend);
                    if(!fighter.Body.isKinematic)
                    {
                        fighter.Body.linearVelocity=Vector3.Lerp(fighter.Body.linearVelocity,state.Velocity,blend);
                        fighter.Body.angularVelocity=Vector3.Lerp(fighter.Body.angularVelocity,state.AngularVelocity,blend);
                    }
                    fighter.Health.ApplyNetworkState(state.hp,state.eliminated);
                }
            }
            _match?.ApplyObjectiveState(snapshot.objectiveState);
            _phase=snapshot.phase??_phase;_objective=snapshot.objective??_objective;
        }

        private FighterController FindFighter(int slot)
        {
            if(_fighters==null)return null;for(var i=0;i<_fighters.Count;i++)if(_fighters[i]!=null&&_fighters[i].Slot==slot)return _fighters[i];return null;
        }

        private void Unsubscribe()
        {
            if(_client==null)return;_client.InputReceived-=OnInputReceived;_client.SnapshotReceived-=OnSnapshotReceived;_client.HostChanged-=OnHostChanged;_client.RoomChanged-=OnRoomChanged;
        }
        private void OnDestroy()=>Unsubscribe();
    }
}
