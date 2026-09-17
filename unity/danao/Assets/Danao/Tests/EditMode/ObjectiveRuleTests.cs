using Danao.Objectives;
using NUnit.Framework;

namespace Danao.Tests.EditMode
{
    public sealed class ObjectiveRuleTests
    {
        [Test]
        public void MangoGrabEndsAtTen()
        {
            Assert.IsFalse(ObjectiveRules.MangoComplete(9));
            Assert.IsTrue(ObjectiveRules.MangoComplete(10));
        }

        [Test]
        public void KingOfRingEndsAtThirtySeconds()
        {
            Assert.IsFalse(ObjectiveRules.KingComplete(29.99f));
            Assert.IsTrue(ObjectiveRules.KingComplete(30f));
        }

        [Test]
        public void HeistEndsAtThreeReturns()
        {
            Assert.IsFalse(ObjectiveRules.HeistComplete(2));
            Assert.IsTrue(ObjectiveRules.HeistComplete(3));
        }

        [Test]
        public void HotBombScoresOnePointPerDetonation()
        {
            Assert.AreEqual(3, ObjectiveRules.AddHotBombPoint(2));
        }
    }
}
