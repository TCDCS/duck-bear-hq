using System.Collections.Generic;
using Danao.Arenas;
using Danao.Core;
using Danao.Fighters;
using UnityEngine;

namespace Danao.Objectives
{
    public sealed class MangoGrabObjective : ObjectiveController
    {
        private ArenaRuntime _arena;
        private readonly List<MangoObjectiveToken> _tokens = new List<MangoObjectiveToken>();
        public override string HudText => $"MANGO GRAB · FIRST TO {ObjectiveRules.MangoTarget}";

        public void Configure(IReadOnlyList<FighterController> fighters, LocalMatchConfig config, ArenaRuntime arena)
        {
            base.Configure(fighters, config);
            _arena = arena;
            for (var i = 0; i < 6; i++) SpawnToken(i);
        }

        private void SpawnToken(int index)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            go.name = "GoldenMango";
            go.transform.SetParent(transform, false);
            go.transform.localScale = new Vector3(.45f, .58f, .42f);
            var shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            go.GetComponent<Renderer>().material = new Material(shader) { color = new Color(1f, .66f, .08f) };
            go.GetComponent<Collider>().isTrigger = true;
            var token = go.AddComponent<MangoObjectiveToken>();
            token.Configure(this, index);
            _tokens.Add(token);
            Reposition(token, index);
        }

        internal void Collect(MangoObjectiveToken token, FighterController fighter)
        {
            if (!SimulationAuthority || Finished || fighter == null) return;
            var slot = fighter.Slot;
            if (slot < 0 || slot >= Scores.Length) return;
            Scores[slot]++;
            if (ObjectiveRules.MangoComplete(Scores[slot]))
            {
                FinishSlot(slot, "WINS THE MANGO GRAB!");
                return;
            }
            Reposition(token, Scores[slot] + token.Index * 3);
        }

        private void Reposition(MangoObjectiveToken token, int seed)
        {
            if (_arena?.WeaponSpawns == null || _arena.WeaponSpawns.Count == 0) return;
            var p = _arena.WeaponSpawns[(seed * 5 + 3) % _arena.WeaponSpawns.Count];
            token.transform.position = p + Vector3.up * .55f;
        }

        public override ObjectiveNetworkState CaptureNetworkState()
        {
            var state = base.CaptureNetworkState();
            state.points = new ObjectivePointState[_tokens.Count];
            for (var i = 0; i < _tokens.Count; i++) state.points[i] = ObjectivePointState.From(_tokens[i].Index, _tokens[i].transform.position);
            return state;
        }

        public override void ApplyNetworkState(ObjectiveNetworkState state)
        {
            base.ApplyNetworkState(state);
            if (state?.points == null) return;
            for (var i = 0; i < state.points.Length; i++)
            {
                var point = state.points[i];
                if (point == null) continue;
                for (var j = 0; j < _tokens.Count; j++)
                    if (_tokens[j].Index == point.index) { _tokens[j].transform.position = point.Position; break; }
            }
        }

        public override void TickObjective(float deltaTime) { }
    }

    public sealed class MangoObjectiveToken : MonoBehaviour
    {
        private MangoGrabObjective _owner;
        public int Index { get; private set; }
        public void Configure(MangoGrabObjective owner, int index) { _owner = owner; Index = index; }
        private void OnTriggerEnter(Collider other)
        {
            var fighter = other.GetComponentInParent<FighterController>();
            if (fighter != null) _owner.Collect(this, fighter);
        }
    }
}
