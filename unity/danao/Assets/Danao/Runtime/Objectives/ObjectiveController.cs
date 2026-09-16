using System.Collections.Generic;
using Danao.Arenas;
using Danao.Core;
using Danao.Fighters;
using UnityEngine;

namespace Danao.Objectives
{
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
        public virtual string HudText => string.Empty;

        public virtual void Configure(IReadOnlyList<FighterController> fighters, LocalMatchConfig config)
        {
            Fighters = fighters;
            Config = config;
        }

        public abstract void TickObjective(float deltaTime);
        public int ScoreForSlot(int slot) => slot >= 0 && slot < Scores.Length ? Scores[slot] : 0;

        protected void FinishSlot(int slot, string verb)
        {
            Finished = true;
            var name = slot >= 0 && slot < Fighters.Count ? Fighters[slot].DisplayName.ToUpperInvariant() : "SOMEONE";
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
