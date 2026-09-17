using System.Collections.Generic;
using Danao.Combat;
using Danao.Weapons;
using NUnit.Framework;
using UnityEngine;

namespace Danao.Tests.EditMode
{
    public sealed class ProjectileTargetTests
    {
        [Test]
        public void SameFighterCanOnlyBeDamagedOncePerExplosion()
        {
            var seen = new HashSet<FighterHealth>();
            var root = new GameObject("fighter");
            var health = root.AddComponent<FighterHealth>();

            Assert.IsTrue(Projectile.TryRegisterExplosionTarget(seen, health));
            Assert.IsFalse(Projectile.TryRegisterExplosionTarget(seen, health));

            Object.DestroyImmediate(root);
        }
    }
}
