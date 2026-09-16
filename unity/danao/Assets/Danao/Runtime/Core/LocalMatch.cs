using System;
using System.Collections.Generic;
using Danao.Arenas;
using Danao.Fighters;
using UnityEngine;

namespace Danao.Core
{
    public sealed class LocalMatch
    {
        private readonly List<FighterController> _fighters;
        private readonly ArenaRuntime _arena;
        private readonly LocalMatchConfig _config;
        private readonly Vector3[] _spawns;

        public bool Finished { get; private set; }
        public string ResultText { get; private set; } = string.Empty;
        public event Action<string> MatchFinished;

        public LocalMatch(List<FighterController> fighters, ArenaRuntime arena, LocalMatchConfig config)
        {
            _fighters = fighters;
            _arena = arena;
            _config = config;
            _spawns = new Vector3[fighters.Count];
            for (var i = 0; i < fighters.Count; i++) _spawns[i] = arena.SpawnPoints[i];
        }

        public void Tick()
        {
            if (Finished) return;
            CheckRingOuts();
            var remaining = AliveFighters();
            if (_config.UsesTeams)
            {
                var team0 = false;
                var team1 = false;
                foreach (var fighter in remaining)
                {
                    if (fighter.Team == 0) team0 = true;
                    if (fighter.Team == 1) team1 = true;
                }
                if (!(team0 && team1)) End(team0 ? "TEAM 1 WINS!" : "TEAM 2 WINS!");
            }
            else if (remaining.Count <= 1 && _fighters.Count > 1)
            {
                End(remaining.Count == 1 ? $"{remaining[0].DisplayName.ToUpperInvariant()} WINS!" : "DOUBLE KNOCKOUT!");
            }
        }

        private void CheckRingOuts()
        {
            foreach (var fighter in _fighters)
            {
                if (fighter == null || fighter.Health.IsEliminated) continue;
                var p = fighter.transform.position;
                var outsideRing = Mathf.Abs(p.x) > _arena.RingBounds.extents.x + .4f || Mathf.Abs(p.z) > _arena.RingBounds.extents.z + .4f;
                var fellOffRing = outsideRing && p.y < _arena.RingFloorY + .15f;
                var fellWorld = p.y < -2.5f;
                if ((_config.UsesRingOut && fellOffRing) || fellWorld)
                    fighter.Health.EliminateByRingOut();
            }
        }

        private List<FighterController> AliveFighters()
        {
            var list = new List<FighterController>();
            foreach (var fighter in _fighters)
                if (fighter != null && !fighter.Health.IsEliminated) list.Add(fighter);
            return list;
        }

        private void End(string text)
        {
            Finished = true;
            ResultText = text;
            foreach (var fighter in _fighters) fighter.SetControlSuppressed(true);
            MatchFinished?.Invoke(text);
        }

        public void ResetRound()
        {
            for (var i = 0; i < _fighters.Count; i++) _fighters[i].ResetFighter(_spawns[i]);
            WrestlingArena.SpawnWeapons(_arena);
            Finished = false;
            ResultText = string.Empty;
        }
    }
}
