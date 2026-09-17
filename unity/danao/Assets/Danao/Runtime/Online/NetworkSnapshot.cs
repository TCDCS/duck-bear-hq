using System;
using System.Collections.Generic;
using Danao.Fighters;
using Danao.Objectives;
using UnityEngine;

namespace Danao.Online
{
    [Serializable] public sealed class FighterSnapshot
    {
        public int slot;
        public float x, y, z;
        public float qx, qy, qz, qw;
        public float vx, vy, vz;
        public float avx, avy, avz;
        public int hp;
        public bool eliminated;
        public string weaponId;

        public Vector3 Position => new Vector3(x,y,z);
        public Quaternion Rotation => new Quaternion(qx,qy,qz,qw);
        public Vector3 Velocity => new Vector3(vx,vy,vz);
        public Vector3 AngularVelocity => new Vector3(avx,avy,avz);
    }

    [Serializable] public sealed class NetworkSnapshot
    {
        public int seq;
        public int matchId;
        public string phase;
        public string objective;
        public FighterSnapshot[] fighters;
        public ObjectiveNetworkState objectiveState;

        public static NetworkSnapshot Capture(int sequence, int match, string matchPhase, IReadOnlyList<FighterController> source, string objectiveText="", ObjectiveNetworkState objectiveNetworkState=null)
        {
            var result=new NetworkSnapshot{seq=sequence,matchId=match,phase=matchPhase,objective=objectiveText,objectiveState=objectiveNetworkState,fighters=new FighterSnapshot[source.Count]};
            for(var i=0;i<source.Count;i++)
            {
                var fighter=source[i];var body=fighter.Body;var p=fighter.transform.position;var q=fighter.transform.rotation;
                result.fighters[i]=new FighterSnapshot{slot=fighter.Slot,x=p.x,y=p.y,z=p.z,qx=q.x,qy=q.y,qz=q.z,qw=q.w,vx=body.linearVelocity.x,vy=body.linearVelocity.y,vz=body.linearVelocity.z,avx=body.angularVelocity.x,avy=body.angularVelocity.y,avz=body.angularVelocity.z,hp=fighter.Health.CurrentHp,eliminated=fighter.Health.IsEliminated,weaponId=fighter.Combat?.Held?.Definition!=null?fighter.Combat.Held.Definition.Kind.ToString():string.Empty};
            }
            return result;
        }
    }
}
