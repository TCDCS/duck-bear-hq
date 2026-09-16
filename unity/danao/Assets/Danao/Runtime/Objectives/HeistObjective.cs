using System.Collections.Generic;
using Danao.Arenas;
using Danao.Core;
using Danao.Fighters;
using UnityEngine;

namespace Danao.Objectives
{
    public sealed class HeistObjective : ObjectiveController
    {
        private ArenaRuntime _arena;
        private int _carrier = -1;
        private Transform _loot;
        public override string HudText => $"HEIST · RETURN THE LOOT {ObjectiveRules.HeistTarget} TIMES";

        public void Configure(IReadOnlyList<FighterController> fighters, LocalMatchConfig config, ArenaRuntime arena)
        {
            base.Configure(fighters, config);
            _arena = arena;
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = "HeistLoot";
            go.transform.SetParent(transform, false);
            go.transform.localScale = Vector3.one * .65f;
            var shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            go.GetComponent<Renderer>().material = new Material(shader) { color = new Color(1f, .77f, .14f) };
            Object.Destroy(go.GetComponent<Collider>());
            _loot = go.transform;
            ResetLoot();
        }

        public override void TickObjective(float deltaTime)
        {
            if (Finished) return;
            if (_carrier < 0)
            {
                for (var i = 0; i < Fighters.Count; i++)
                {
                    if (Fighters[i].Health.IsEliminated) continue;
                    if (Vector3.Distance(Fighters[i].transform.position, _loot.position) < 1.2f) { _carrier = Fighters[i].Slot; break; }
                }
            }
            else
            {
                var fighter = FighterForSlot(_carrier);
                if (fighter == null) { ResetLoot(); return; }
                if (fighter.Health.IsEliminated) { _carrier = -1; return; }
                _loot.position = fighter.transform.position + Vector3.up * 1.3f;
                if (_carrier < 0 || _carrier >= _arena.SpawnPoints.Count) { ResetLoot(); return; }
                var home = _arena.SpawnPoints[_carrier];
                if (Vector3.Distance(fighter.transform.position, home) < 1.6f)
                {
                    Scores[_carrier]++;
                    if (ObjectiveRules.HeistComplete(Scores[_carrier])) { FinishSlot(_carrier, "WINS THE HEIST!"); return; }
                    ResetLoot();
                }
            }
        }

        private void ResetLoot()
        {
            _carrier = -1;
            if (_loot != null) _loot.position = _arena.Root.transform.position + Vector3.up * 1.1f;
        }
    }
}
