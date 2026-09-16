using System;
using System.Collections.Generic;
using Danao.Arenas;
using Danao.Core;
using Danao.Fighters;
using UnityEngine;

namespace Danao.Objectives
{
    [Serializable]
    public sealed class ObjectivePointState
    {
        public int index;
        public float x;
        public float y;
        public float z;
        public Vector3 Position => new Vector3(x, y, z);
        public static ObjectivePointState From(int index, Vector3 position) => new ObjectivePointState { index=index, x=position.x, y=position.y, z=position.z };
    }

    [Serializable]
    public sealed class ObjectiveNetworkState
    {
        public string mode;
        public int[] scores = new int[4];
        public bool finished;
        public string resultText;
        public int holder = -1;
        public float timer;
        public int carrier = -1;
        public float[] seconds = new float[4];
        public ObjectivePointState[] points;
        public float objectX;
        public float objectY;
        public float objectZ;
        public Vector3 ObjectPosition => new Vector3(objectX, objectY, objectZ);
        public void SetObjectPosition(Vector3 position) { objectX=position.x; objectY=position.y; objectZ=position.z; }
    }

    public static class ObjectiveRules
    {
        public const int MangoTarget = 10;
        public const float KingTargetSeconds = 30f;
        public const int HeistTarget = 3;
        public const int HotBombTarget = 3;
        public static bool MangoComplete(int score) => score >= MangoTarget;
        public static bool KingComplete(float seconds) => seconds >= KingTargetSeconds;
        public static bool HeistComplete(int returns) => returns >= HeistTarget;
        public static int AddHotBombPoint(int score) => score + 1;
    }

    public abstract class ObjectiveController : MonoBehaviour
    {
        protected readonly int[] Scores = new int[4];
        protected IReadOnlyList<FighterController> Fighters;
        protected LocalMatchConfig Config;
        public bool Finished { get; protected set; }
        public string ResultText { get; protected set; } = string.Empty;
        public bool SimulationAuthority { get; private set; } = true;
        public virtual string HudText => string.Empty;

        public virtual void Configure(IReadOnlyList<FighterController> fighters, LocalMatchConfig config)
        {
            Fighters = fighters;
            Config = config;
        }

        public void SetSimulationAuthority(bool authority)
        {
            SimulationAuthority = authority;
            OnSimulationAuthorityChanged(authority);
        }

        protected virtual void OnSimulationAuthorityChanged(bool authority) { }
        public abstract void TickObjective(float deltaTime);
        public int ScoreForSlot(int slot) => slot >= 0 && slot < Scores.Length ? Scores[slot] : 0;

        public virtual ObjectiveNetworkState CaptureNetworkState()
        {
            return new ObjectiveNetworkState
            {
                mode = Config != null ? Config.Mode.ToString() : string.Empty,
                scores = (int[])Scores.Clone(),
                finished = Finished,
                resultText = ResultText
            };
        }

        public virtual void ApplyNetworkState(ObjectiveNetworkState state)
        {
            if (state == null) return;
            if (state.scores != null)
                for (var i = 0; i < Scores.Length; i++) Scores[i] = i < state.scores.Length ? Mathf.Max(0, state.scores[i]) : 0;
            Finished = state.finished;
            ResultText = state.resultText ?? string.Empty;
        }

        protected FighterController FighterForSlot(int slot)
        {
            if (Fighters == null) return null;
            for (var i = 0; i < Fighters.Count; i++)
            {
                var fighter = Fighters[i];
                if (fighter != null && fighter.Slot == slot) return fighter;
            }
            return null;
        }

        protected void FinishSlot(int slot, string verb)
        {
            Finished = true;
            var fighter = FighterForSlot(slot);
            var name = fighter != null ? fighter.DisplayName.ToUpperInvariant() : "SOMEONE";
            ResultText = $"{name} {verb}";
        }
    }

    public static class ObjectiveFactory
    {
        public static ObjectiveController Create(GameObject parent, IReadOnlyList<FighterController> fighters, LocalMatchConfig config, ArenaRuntime arena)
        {
            var go = new GameObject($"Objective_{config.Mode}");
            go.transform.SetParent(parent.transform, false);
            ObjectiveController objective;
            switch (config.Mode)
            {
                case LocalMode.MangoGrab:
                    var mango = go.AddComponent<MangoGrabObjective>(); mango.Configure(fighters, config, arena); objective = mango; break;
                case LocalMode.HotBomb:
                    var bomb = go.AddComponent<HotBombObjective>(); bomb.Configure(fighters, config, arena); objective = bomb; break;
                case LocalMode.KingOfRing:
                    var king = go.AddComponent<KingOfRingObjective>(); king.Configure(fighters, config, arena); objective = king; break;
                case LocalMode.Heist:
                    var heist = go.AddComponent<HeistObjective>(); heist.Configure(fighters, config, arena); objective = heist; break;
                default:
                    Object.Destroy(go); return null;
            }
            return objective;
        }
    }
}
