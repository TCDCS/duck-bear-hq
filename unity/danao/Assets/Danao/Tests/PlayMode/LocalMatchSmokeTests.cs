using System.Collections;
using Danao.Arenas;
using Danao.Core;
using Danao.Fighters;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;

namespace Danao.Tests.PlayMode
{
    public sealed class LocalMatchSmokeTests
    {
        [UnityTest]
        public IEnumerator FighterStartsAtOneHundredHp()
        {
            var settings = new MatchSettings();
            var fighter = FighterFactory.Create(0, "Stephen", Vector3.up * 2f, settings);
            yield return null;
            Assert.AreEqual(100, fighter.Health.CurrentHp);
            Object.Destroy(fighter.gameObject);
        }

        [UnityTest]
        public IEnumerator DamageOffKeepsHealthAtOneHundred()
        {
            var settings = new MatchSettings { HealthDamage = false };
            var fighter = FighterFactory.Create(0, "Gaby", Vector3.up * 2f, settings);
            fighter.Health.ApplyDamage(24, Vector3.forward * 2f, 1);
            yield return null;
            Assert.AreEqual(100, fighter.Health.CurrentHp);
            Object.Destroy(fighter.gameObject);
        }

        [UnityTest]
        public IEnumerator WrestlingArenaCreatesEightWeapons()
        {
            var root = new GameObject("ArenaTest");
            var arena = WrestlingArena.Build(root.transform, new MatchSettings());
            yield return null;
            Assert.AreEqual(8, arena.Weapons.Count);
            Object.Destroy(root);
            foreach (var weapon in arena.Weapons) if (weapon != null) Object.Destroy(weapon.gameObject);
        }
    }
}
