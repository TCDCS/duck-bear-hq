using System;
using Danao.Arenas;
using Danao.Weapons;
using NUnit.Framework;

namespace Danao.Tests.EditMode
{
    public sealed class ContentCatalogTests
    {
        [Test]
        public void LaunchHasElevenArenas()
        {
            Assert.AreEqual(11, ArenaCatalog.All.Count);
        }

        [Test]
        public void EveryArenaHasCuratedWeapons()
        {
            foreach (var arena in ArenaCatalog.All)
                Assert.GreaterOrEqual(arena.WeaponPool.Length, 4, arena.DisplayName);
        }

        [Test]
        public void LaunchHasThirtySixFormalWeaponKinds()
        {
            Assert.AreEqual(36, Enum.GetValues(typeof(WeaponKind)).Length);
        }

        [Test]
        public void EveryWeaponDoesPositiveNonLethalOrdinaryDamage()
        {
            foreach (WeaponKind kind in Enum.GetValues(typeof(WeaponKind)))
            {
                var definition = WeaponDefinition.For(kind);
                Assert.Greater(definition.Damage, 0, kind.ToString());
                Assert.Less(definition.Damage, 100, kind.ToString());
            }
        }
    }
}
