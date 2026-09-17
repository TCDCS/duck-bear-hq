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
            _holder = Fighters.Count > 0 ? Fighters[0].Slot : 0;
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
            if (!SimulationAuthority || Finished) return;
            if (attacker == _holder && FighterForSlot(target) != null)
            {
                _holder = target;
                _timer = Mathf.Max(_timer, 2.5f);
            }
        }

        public override void TickObjective(float deltaTime)
        {
            if (!SimulationAuthority || Finished || Fighters.Count == 0) return;
            var holder = FighterForSlot(_holder);
            if (holder == null || holder.Health.IsEliminated)
            {
                _holder = NextAlive(_holder);
                holder = FighterForSlot(_holder);
                if (holder == null) return;
            }
            UpdateBombVisual(holder);
            _timer -= deltaTime;
            if (_timer > 0f) return;
            holder.Health.ApplyDamage(24, (Vector3.up + Vector3.forward * .2f) * 15f, -1);
            var scorer = NextAlive(_holder);
            if (scorer < 0) return;
            Scores[scorer] = ObjectiveRules.AddHotBombPoint(Scores[scorer]);
            if (Scores[scorer] >= ObjectiveRules.HotBombTarget)
            {
                FinishSlot(scorer, "WINS HOT BOMB!");
                return;
            }
            _holder = scorer;
            _timer = 8f;
        }

        public override ObjectiveNetworkState CaptureNetworkState()
        {
            var state = base.CaptureNetworkState();
            state.holder = _holder;
            state.timer = _timer;
            if (_bomb != null) state.SetObjectPosition(_bomb.position);
            return state;
        }

        public override void ApplyNetworkState(ObjectiveNetworkState state)
        {
            base.ApplyNetworkState(state);
            if (state == null) return;
            _holder = state.holder;
            _timer = Mathf.Max(0f, state.timer);
            var holder = FighterForSlot(_holder);
            if (holder != null) UpdateBombVisual(holder);
            else if (_bomb != null) _bomb.position = state.ObjectPosition;
        }

        private void UpdateBombVisual(FighterController holder)
        {
            if (_bomb != null && holder != null) _bomb.position = holder.transform.position + Vector3.up * 1.75f;
        }

        private int NextAlive(int fromSlot)
        {
            for (var step = 1; step <= 4; step++)
            {
                var slot = (fromSlot + step + 4) % 4;
                var fighter = FighterForSlot(slot);
                if (fighter != null && !fighter.Health.IsEliminated) return slot;
            }
            return -1;
        }
    }
}
