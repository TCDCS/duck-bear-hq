using Danao.Core;
using NUnit.Framework;

namespace Danao.Tests.EditMode
{
    public sealed class DamageModelTests
    {
        [Test]
        public void DamageClampsAtZero() => Assert.AreEqual(0, DamageModel.Apply(5, 20, true));

        [Test]
        public void DamageOffPreservesHp() => Assert.AreEqual(100, DamageModel.Apply(100, 30, false));

        [Test]
        public void NegativeDamageCannotHeal() => Assert.AreEqual(72, DamageModel.Apply(72, -4, true));
    }
}
