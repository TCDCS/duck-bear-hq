using Danao.Core;
using NUnit.Framework;

namespace Danao.Tests.EditMode
{
    public sealed class MatchRulesTests
    {
        [Test]
        public void TwoVsTwoPairsSlots()
        {
            Assert.AreEqual(0, MatchRules.TeamForSlot(0, true));
            Assert.AreEqual(0, MatchRules.TeamForSlot(1, true));
            Assert.AreEqual(1, MatchRules.TeamForSlot(2, true));
            Assert.AreEqual(1, MatchRules.TeamForSlot(3, true));
        }

        [Test]
        public void OneVsOneForcesTwoPlayers() => Assert.AreEqual(2, MatchRules.NormalisePlayerCount(LocalMode.OneVsOne, 4));

        [Test]
        public void TwoVsTwoForcesFourPlayers() => Assert.AreEqual(4, MatchRules.NormalisePlayerCount(LocalMode.TwoVsTwo, 2));

        [Test]
        public void TwoPlayersSkipTwoVsTwoWhenCyclingForward()
        {
            Assert.AreEqual(LocalMode.FreeForAll, MatchRules.NextAllowedMode(LocalMode.OneVsOne, 1, 2));
        }

        [Test]
        public void FourPlayersCanReachTwoVsTwo()
        {
            Assert.AreEqual(LocalMode.TwoVsTwo, MatchRules.NextAllowedMode(LocalMode.OneVsOne, 1, 4));
        }
    }
}
