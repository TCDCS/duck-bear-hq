using System;
using System.Collections.Generic;
using Danao.Arenas;
using Danao.Fighters;
using Danao.Objectives;
using UnityEngine;

namespace Danao.Core
{
    public sealed class LocalMatch
    {
        private readonly List<FighterController> _fighters;
        private readonly ArenaRuntime _arena;
        private readonly LocalMatchConfig _config;
        private readonly Vector3[] _spawns;
        private readonly float[] _respawnTimers = new float[4];
        private ObjectiveController _objective;

        public bool Finished { get; private set; }
        public string ResultText { get; private set; } = string.Empty;
        public int WinnerSlot { get; private set; } = -1;
        public int WinnerTeam { get; private set; } = -1;
        public string ObjectiveHudText => _objective != null ? _objective.HudText : string.Empty;
        public event Action<string> MatchFinished;

        public LocalMatch(List<FighterController> fighters, ArenaRuntime arena, LocalMatchConfig config)
        {
            _fighters = fighters;
            _arena = arena;
            _config = config;
            _spawns = new Vector3[4];
            for (var i = 0; i < fighters.Count; i++)
            {
                var fighter = fighters[i];
                if (fighter == null || fighter.Slot < 0 || fighter.Slot >= _spawns.Length || fighter.Slot >= arena.SpawnPoints.Count) continue;
                _spawns[fighter.Slot] = arena.SpawnPoints[fighter.Slot];
            }
            CreateObjective();
        }

        public void Tick()
        {
            if (Finished) return;
            CheckRingOuts();
            if (_config.UsesElimination) TickElimination();
            else TickObjective();
        }

        public ObjectiveNetworkState CaptureObjectiveState() => _objective != null ? _objective.CaptureNetworkState() : null;

        public void ApplyObjectiveState(ObjectiveNetworkState state)
        {
            if (_objective == null || state == null) return;
            _objective.ApplyNetworkState(state);
            Finished = state.finished;
            ResultText = state.resultText ?? string.Empty;
            WinnerSlot = state.winnerSlot;
            WinnerTeam = -1;
        }

        public void SetSimulationAuthority(bool authority) => _objective?.SetSimulationAuthority(authority);

        private void TickElimination()
        {
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
                if (!(team0 && team1))
                {
                    var winnerTeam = team0 ? 0 : team1 ? 1 : -1;
                    End(team0 ? "TEAM 1 WINS!" : team1 ? "TEAM 2 WINS!" : "DOUBLE KNOCKOUT!", -1, winnerTeam);
                }
            }
            else if (remaining.Count <= 1 && _fighters.Count > 1)
            {
                var winnerSlot = remaining.Count == 1 ? remaining[0].Slot : -1;
                End(remaining.Count == 1 ? $"{remaining[0].DisplayName.ToUpperInvariant()} WINS!" : "DOUBLE KNOCKOUT!", winnerSlot, -1);
            }
        }

        private void TickObjective()
        {
            TickRespawns();
            if (_objective == null) return;
            _objective.TickObjective(Time.deltaTime);
            if (_objective.Finished) End(_objective.ResultText, _objective.WinnerSlot, -1);
        }

        private void TickRespawns()
        {
            for (var i = 0; i < _fighters.Count; i++)
            {
                var fighter = _fighters[i];
                if (fighter == null || fighter.Slot < 0 || fighter.Slot >= _respawnTimers.Length) continue;
                var slot = fighter.Slot;
                if (!fighter.Health.IsEliminated) { _respawnTimers[slot] = 0f; continue; }
                _respawnTimers[slot] += Time.deltaTime;
                if (_respawnTimers[slot] < 2.2f) continue;
                fighter.ResetFighter(_spawns[slot]);
                _respawnTimers[slot] = 0f;
            }
        }

        private void CheckRingOuts()
        {
            foreach (var fighter in _fighters)
            {
                if (fighter == null || fighter.Health.IsEliminated) continue;
                var p = fighter.transform.position;
                var outside = Mathf.Abs(p.x - _arena.RingBounds.center.x) > _arena.RingBounds.extents.x + .4f || Mathf.Abs(p.z - _arena.RingBounds.center.z) > _arena.RingBounds.extents.z + .4f;
                var belowFloor = p.y < _arena.RingFloorY + .15f;
                var fellWorld = p.y < -2.5f;
                if ((_config.UsesRingOut && outside && belowFloor) || fellWorld)
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

        private void End(string text, int winnerSlot = -1, int winnerTeam = -1)
        {
            Finished = true;
            ResultText = text;
            WinnerSlot = winnerSlot;
            WinnerTeam = winnerTeam;
            foreach (var fighter in _fighters) fighter.SetControlSuppressed(true);
            MatchFinished?.Invoke(text);
        }

        public void ResetRound()
        {
            if (_objective != null) UnityEngine.Object.Destroy(_objective.gameObject);
            _objective = null;
            for (var i = 0; i < _fighters.Count; i++)
            {
                if (_fighters[i] == null || _fighters[i].Slot < 0 || _fighters[i].Slot >= _spawns.Length) continue;
                _fighters[i].ResetFighter(_spawns[_fighters[i].Slot]);
                _respawnTimers[_fighters[i].Slot] = 0f;
            }
            if (_config.Arena == ArenaId.WrestlingArena) WrestlingArena.SpawnWeapons(_arena);
            else ArenaBuilder.SpawnWeapons(_arena, ArenaCatalog.For(_config.Arena));
            Finished = false;
            ResultText = string.Empty;
            WinnerSlot = -1;
            WinnerTeam = -1;
            CreateObjective();
        }

        private void CreateObjective()
        {
            if (_config.UsesElimination) return;
            _objective = ObjectiveFactory.Create(_arena.Root, _fighters, _config, _arena);
        }
    }
}
