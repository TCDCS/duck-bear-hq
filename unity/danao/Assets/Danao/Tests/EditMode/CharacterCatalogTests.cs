using Danao.Fighters;
using NUnit.Framework;

namespace Danao.Tests.EditMode
{
    public sealed class CharacterCatalogTests
    {
        [Test]
        public void LaunchHasEightCharacters()
        {
            Assert.AreEqual(8, CharacterCatalog.All.Count);
        }

        [Test]
        public void CharactersShareCompetitiveBodyScale()
        {
            var expected = CharacterCatalog.All[0].BodyScale;
            foreach (var character in CharacterCatalog.All)
                Assert.AreEqual(expected, character.BodyScale, character.DisplayName);
        }

        [Test]
        public void LaunchHasEightCosmeticCostumes()
        {
            Assert.AreEqual(8, CharacterCatalog.Costumes.Count);
        }
    }
}
