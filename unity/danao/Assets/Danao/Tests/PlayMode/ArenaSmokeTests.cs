using System;
using System.Collections;
using Danao.Arenas;
using Danao.Core;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;

namespace Danao.Tests.PlayMode
{
    public sealed class ArenaSmokeTests
    {
        [UnityTest]
        public IEnumerator EveryArenaBuildsFourSpawnsAndWeapons()
        {
            foreach (ArenaId id in Enum.GetValues(typeof(ArenaId)))
            {
                var parent = new GameObject("ArenaSmokeRoot");
                var arena = ArenaBuilder.Build(id, parent.transform, new MatchSettings());
                yield return null;
                Assert.NotNull(arena.Root, id.ToString());
                Assert.AreEqual(4, arena.SpawnPoints.Count, id.ToString());
                Assert.GreaterOrEqual(arena.WeaponSpawns.Count, 4, id.ToString());
                UnityEngine.Object.Destroy(parent);
                foreach (var weapon in arena.Weapons) if (weapon != null) UnityEngine.Object.Destroy(weapon.gameObject);
            }
        }
    }
}
