using System.Collections.Generic;
using Danao.Arenas;
using Danao.Core;
using Danao.Fighters;
using UnityEngine;

namespace Danao.Objectives
{
    public sealed class KingOfRingObjective : ObjectiveController
    {
        private readonly float[] _seconds = new float[4];
        private Vector3 _centre;
        private const float Radius = 3.1f;
        public override string HudText => "KING OF THE RING · HOLD THE CENTRE FOR 30s";

        public void Configure(IReadOnlyList<FighterController> fighters, LocalMatchConfig config, ArenaRuntime arena)
        {
            base.Configure(fighters, config);
            _centre = arena.Root.transform.position + Vector3.up * .52f;
            var zone = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            zone.name = "KingZone";
            zone.transform.SetParent(transform, false);
            zone.transform.position = _centre;
            zone.transform.localScale = new Vector3(Radius, .05f, Radius);
            Object.Destroy(zone.GetComponent<Collider>());
            var shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            zone.GetComponent<Renderer>().material = new Material(shader) { color = new Color(.9f, .72f, .12f) };
        }

        public override void TickObjective(float deltaTime)
        {
            if (Finished) return;
            var occupant = -1;
            var count = 0;
            for (var i = 0; i < Fighters.Count; i++)
            {
                if (Fighters[i].Health.IsEliminated) continue;
                var p = Fighters[i].transform.position - _centre;
                if (new Vector2(p.x, p.z).magnitude <= Radius) { occupant = Fighters[i].Slot; count++; }
            }
            if (count != 1 || occupant < 0 || occupant >= _seconds.Length) return;
            _seconds[occupant] += deltaTime;
            if (ObjectiveRules.KingComplete(_seconds[occupant])) FinishSlot(occupant, "IS KING OF THE RING!");
        }
    }
}
