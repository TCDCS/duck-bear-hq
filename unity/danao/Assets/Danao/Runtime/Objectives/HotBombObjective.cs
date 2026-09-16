using System.Collections.Generic;
using Danao.Arenas;
using Danao.Combat;
using Danao.Core;
using Danao.Fighters;
using UnityEngine;

namespace Danao.Objectives
{
    public sealed class HotBombObjective : ObjectiveController
    {
        private int _holder;
        private float _timer = 8f;
        private Transform _bomb;
        public override string HudText => $"HOT BOMB · P{_holder + 1} {_timer:0.0}s · FIRST TO {ObjectiveRules.HotBombTarget}";

        public void Configure(IReadOnlyList<FighterController> fighters, LocalMatchConfig config, ArenaRuntime arena)
        {
            base.Configure(fighters, config);
            _holder = 0;
            var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            go.name = "HotBomb";
            go.transform.SetParent(transform, false);
            go.transform.localScale = Vector3.one * .55f;
            var shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            go.GetComponent<Renderer>().material = new Material(shader) { color = new Color(.12f, .12f, .15f) };
            Object.Destroy(go.GetComponent<Collider>());
            _bomb = go.transform;
            FighterCombat.FighterHit += OnFighterHit;
        }

        private void OnDestroy() { FighterCombat.FighterHit -= OnFighterHit; }
        private void OnFighterHit(int attacker, int target)
        {
            if (Finished) return;
            if (attacker == _holder && target >= 0 && target < Fighters.Count)
            {
                _holder = target;
                _timer = Mathf.Max(_timer, 2.5f);
            }
        }

        public override void TickObjective(float deltaTime)
        {
            if (Finished || Fighters.Count == 0) return;
            if (_holder >= Fighters.Count || Fighters[_holder].Health.IsEliminated) _holder = NextAlive(_holder);
            if (_bomb != null) _bomb.position = Fighters[_holder].transform.position + Vector3.up * 1.75f;
            _timer -= deltaTime;
            if (_timer > 0f) return;
            Fighters[_holder].Health.ApplyDamage(24, (Vector3.up + Vector3.forward * .2f) * 15f, -1);
            var scorer = NextAlive(_holder);
            Scores[scorer] = ObjectiveRules.AddHotBombPoint(Scores[scorer]);
            if (Scores[scorer] >= ObjectiveRules.HotBombTarget)
            {
                FinishSlot(scorer, "WINS HOT BOMB!");
                return;
            }
            _holder = scorer;
            _timer = 8f;
        }

        private int NextAlive(int from)
        {
            for (var i = 1; i <= Fighters.Count; i++)
            {
                var n = (from + i) % Fighters.Count;
                if (!Fighters[n].Health.IsEliminated) return n;
            }
            return 0;
        }
    }
}
