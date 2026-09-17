using Danao.Weapons;
using NUnit.Framework;

namespace Danao.Tests.EditMode
{
    public sealed class WeaponDefinitionTests
    {
        [TestCase(WeaponKind.BoxingGlove)]
        [TestCase(WeaponKind.FoldingChair)]
        [TestCase(WeaponKind.FryingPan)]
        [TestCase(WeaponKind.NoveltyFloppy)]
        [TestCase(WeaponKind.FoamBlaster)]
        [TestCase(WeaponKind.Bazooka)]
        [TestCase(WeaponKind.BowlingBall)]
        [TestCase(WeaponKind.WrestlingTable)]
        public void OrdinaryHitsNeverOneShot(WeaponKind kind)
        {
            var definition = WeaponDefinition.For(kind);
            Assert.Greater(definition.Damage, 0);
            Assert.Less(definition.Damage, 100);
        }

        [Test]
        public void BazookaCentreDamageIsCappedAtTwentyFour() => Assert.AreEqual(24, WeaponDefinition.For(WeaponKind.Bazooka).Damage);
    }
}
