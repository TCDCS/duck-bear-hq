using Danao.Combat;
using Danao.Core;
using Danao.Fighters;
using UnityEngine;

namespace Danao.Arenas
{
    public sealed class ArenaHazardController : MonoBehaviour
    {
        private ArenaDefinition _definition;
        private MatchSettings _settings;
        private ArenaRuntime _runtime;
        private Transform _prop;
        private Vector3 _propBase;
        private float _nextPulse;
        private float _nextContact;
        public bool SimulationAuthority { get; private set; } = true;

        public void Configure(ArenaDefinition definition, MatchSettings settings, ArenaRuntime runtime)
        {
            _definition=definition; _settings=settings; _runtime=runtime;
            BuildHazardProp();
        }

        public void SetSimulationAuthority(bool authority) => SimulationAuthority = authority;

        private void BuildHazardProp()
        {
            switch(_definition.Hazard)
            {
                case ArenaHazardKind.CraneHook:
                    _prop=ArenaBuilder.CreateCylinder(transform,"CraneHook",new Vector3(0f,2.2f,0f),new Vector3(.45f,.7f,.45f),_definition.Secondary).transform; break;
                case ArenaHazardKind.PassingTrain:
                    _prop=ArenaBuilder.CreateBox(transform,"PassingTrain",new Vector3(-12f,1.2f,0f),new Vector3(5f,2.2f,2.3f),new Color(.72f,.12f,.18f)).transform; break;
                case ArenaHazardKind.RollingFruit:
                    var fruit=GameObject.CreatePrimitive(PrimitiveType.Sphere); fruit.name="RollingMango"; fruit.transform.SetParent(transform,false); fruit.transform.localScale=Vector3.one*1.6f; ArenaBuilder.Paint(fruit,new Color(1f,.58f,.13f)); _prop=fruit.transform; break;
                case ArenaHazardKind.GongPulse:
                    _prop=ArenaBuilder.CreateCylinder(transform,"Gong",new Vector3(0f,2.4f,5f),new Vector3(1.7f,.18f,1.7f),_definition.Secondary).transform; _prop.localRotation=Quaternion.Euler(90f,0f,0f); break;
                case ArenaHazardKind.SlidingScreens:
                    _prop=ArenaBuilder.CreateBox(transform,"SlidingScreen",new Vector3(0f,1.5f,0f),new Vector3(.35f,2.5f,5f),new Color(.82f,.72f,.56f)).transform; break;
                case ArenaHazardKind.SpeakerPulse:
                    _prop=ArenaBuilder.CreateBox(transform,"PartySpeaker",new Vector3(0f,1f,5f),new Vector3(1.5f,2f,1.2f),new Color(.08f,.08f,.12f)).transform; break;
                case ArenaHazardKind.ConveyorPuncher:
                    _prop=ArenaBuilder.CreateBox(transform,"BoxingMachine",new Vector3(-6f,1.1f,0f),new Vector3(1.2f,1.2f,1.2f),_definition.Secondary).transform; break;
                case ArenaHazardKind.CircusBounce:
                    _prop=ArenaBuilder.CreateCylinder(transform,"BouncePad",new Vector3(0f,.72f,0f),new Vector3(2.1f,.15f,2.1f),new Color(.18f,.18f,.22f)).transform; break;
            }
            if(_prop!=null) _propBase=_prop.localPosition;
        }

        private void Update()
        {
            if(!SimulationAuthority||_settings==null||!_settings.ArenaHazards) return;
            var t=Time.time;
            switch(_definition.Hazard)
            {
                case ArenaHazardKind.CraneHook:
                    _prop.localPosition=_propBase+new Vector3(Mathf.Sin(t*1.15f)*6f,Mathf.Sin(t*2.3f)*.35f,0f); ContactSphere(_prop.position,1.1f,7,10f); break;
                case ArenaHazardKind.PassingTrain:
                    _prop.localPosition=new Vector3(Mathf.Repeat(t*5f+12f,24f)-12f,_propBase.y,0f); ContactBox(_prop.position,new Vector3(2.6f,1.2f,1.3f),13,14f); break;
                case ArenaHazardKind.RollingFruit:
                    _prop.localPosition=new Vector3(Mathf.Sin(t*.8f)*7f,1.2f,Mathf.Cos(t*.55f)*4.5f); ContactSphere(_prop.position,1.25f,9,11f); break;
                case ArenaHazardKind.GongPulse:
                    if(t>=_nextPulse){_nextPulse=t+4.5f; RadialPulse(new Vector3(0f,1f,3.8f),7f,5,9f);} break;
                case ArenaHazardKind.SlidingScreens:
                    _prop.localPosition=_propBase+new Vector3(Mathf.Sin(t*1.25f)*6f,0f,0f); ContactBox(_prop.position,new Vector3(.5f,1.5f,2.6f),8,10f); break;
                case ArenaHazardKind.IceSlip:
                    if(t>=_nextPulse){_nextPulse=t+.18f; foreach(var f in Fighters()) if(!f.Health.IsEliminated) f.Body.AddForce(new Vector3(f.Body.linearVelocity.x,0f,f.Body.linearVelocity.z)*.025f,ForceMode.VelocityChange);} break;
                case ArenaHazardKind.SpeakerPulse:
                    if(t>=_nextPulse){_nextPulse=t+3.2f; RadialPulse(_prop.position,8f,4,10.5f);} break;
                case ArenaHazardKind.ConveyorPuncher:
                    _prop.localPosition=_propBase+new Vector3(Mathf.PingPong(t*5.5f,12f),0f,0f); ContactBox(_prop.position,new Vector3(.8f,.8f,.8f),10,12f); Conveyor(); break;
                case ArenaHazardKind.ShipSway:
                    if(t>=_nextPulse){_nextPulse=t+.16f; var force=Mathf.Sin(t*.9f)*.42f; foreach(var f in Fighters()) if(!f.Health.IsEliminated) f.Body.AddForce(Vector3.right*force,ForceMode.VelocityChange);} break;
                case ArenaHazardKind.CircusBounce:
                    if(t>=_nextPulse){_nextPulse=t+.12f; foreach(var hit in Physics.OverlapSphere(transform.TransformPoint(Vector3.zero),2.2f)){var f=hit.GetComponentInParent<FighterController>(); if(f!=null&&!f.Health.IsEliminated) f.Body.AddForce(Vector3.up*.75f,ForceMode.VelocityChange);}} break;
            }
        }

        private FighterController[] Fighters() => Object.FindObjectsByType<FighterController>(FindObjectsSortMode.None);

        private void Conveyor()
        {
            foreach(var f in Fighters())
            {
                var p=f.transform.position;
                if(Mathf.Abs(p.x)<5.2f&&Mathf.Abs(p.z)<1.5f&&!f.Health.IsEliminated) f.Body.AddForce(Vector3.right*.11f,ForceMode.VelocityChange);
            }
        }

        private void ContactSphere(Vector3 centre,float radius,int damage,float knockback)
        {
            if(Time.time<_nextContact) return;
            foreach(var hit in Physics.OverlapSphere(centre,radius,~0,QueryTriggerInteraction.Ignore))
            {
                var health=hit.GetComponentInParent<FighterHealth>(); if(health==null||health.IsEliminated) continue;
                var dir=(health.transform.position-centre).normalized; health.ApplyDamage(damage,(dir+Vector3.up*.2f).normalized*knockback,-1); _nextContact=Time.time+.35f; break;
            }
        }

        private void ContactBox(Vector3 centre,Vector3 half,int damage,float knockback)
        {
            if(Time.time<_nextContact) return;
            foreach(var hit in Physics.OverlapBox(centre,half,Quaternion.identity,~0,QueryTriggerInteraction.Ignore))
            {
                var health=hit.GetComponentInParent<FighterHealth>(); if(health==null||health.IsEliminated) continue;
                var dir=(health.transform.position-centre).normalized; health.ApplyDamage(damage,(dir+Vector3.up*.15f).normalized*knockback,-1); _nextContact=Time.time+.4f; break;
            }
        }

        private void RadialPulse(Vector3 centre,float radius,int damage,float knockback)
        {
            foreach(var f in Fighters())
            {
                if(f.Health.IsEliminated) continue;
                var delta=f.transform.position-centre; var distance=delta.magnitude; if(distance>radius) continue;
                var falloff=1f-distance/radius; f.Health.ApplyDamage(Mathf.Max(1,Mathf.RoundToInt(damage*falloff)),(delta.normalized+Vector3.up*.18f).normalized*(knockback*falloff),-1);
            }
        }
    }
}
