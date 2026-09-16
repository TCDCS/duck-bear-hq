using System.Collections.Generic;

namespace Danao.Weapons
{
    public enum WeaponKind
    {
        BoxingGlove,
        FoldingChair,
        FryingPan,
        NoveltyFloppy,
        FoamBlaster,
        Bazooka,
        BowlingBall,
        WrestlingTable
    }

    public sealed class WeaponDefinition
    {
        public WeaponKind Kind;
        public string DisplayName;
        public int Damage;
        public float Knockback;
        public float Cooldown;
        public bool Ranged;
        public int Ammo;
        public float ProjectileSpeed;
        public float ExplosionRadius;

        private static readonly Dictionary<WeaponKind, WeaponDefinition> Definitions = new Dictionary<WeaponKind, WeaponDefinition>
        {
            [WeaponKind.BoxingGlove] = New(WeaponKind.BoxingGlove, "Boxing Glove", 8, 8.5f, .32f),
            [WeaponKind.FoldingChair] = New(WeaponKind.FoldingChair, "Folding Chair", 14, 10.5f, .58f),
            [WeaponKind.FryingPan] = New(WeaponKind.FryingPan, "Frying Pan", 12, 9.2f, .48f),
            [WeaponKind.NoveltyFloppy] = New(WeaponKind.NoveltyFloppy, "Floppy Nonsense", 10, 13.5f, .46f),
            [WeaponKind.FoamBlaster] = NewRanged(WeaponKind.FoamBlaster, "Foam Blaster", 6, 5.4f, .22f, 10, 21f, 0f),
            [WeaponKind.Bazooka] = NewRanged(WeaponKind.Bazooka, "Cartoon Bazooka", 24, 16f, 1.05f, 2, 17f, 4.6f),
            [WeaponKind.BowlingBall] = New(WeaponKind.BowlingBall, "Bowling Ball", 16, 12f, .8f),
            [WeaponKind.WrestlingTable] = New(WeaponKind.WrestlingTable, "Wrestling Table", 18, 12.4f, .95f)
        };

        private static WeaponDefinition New(WeaponKind kind, string name, int damage, float knockback, float cooldown)
        {
            return new WeaponDefinition { Kind = kind, DisplayName = name, Damage = damage, Knockback = knockback, Cooldown = cooldown, Ammo = -1 };
        }

        private static WeaponDefinition NewRanged(WeaponKind kind, string name, int damage, float knockback, float cooldown, int ammo, float speed, float radius)
        {
            var d = New(kind, name, damage, knockback, cooldown);
            d.Ranged = true;
            d.Ammo = ammo;
            d.ProjectileSpeed = speed;
            d.ExplosionRadius = radius;
            return d;
        }

        public static WeaponDefinition For(WeaponKind kind)
        {
            var source = Definitions[kind];
            return new WeaponDefinition
            {
                Kind = source.Kind, DisplayName = source.DisplayName, Damage = source.Damage, Knockback = source.Knockback,
                Cooldown = source.Cooldown, Ranged = source.Ranged, Ammo = source.Ammo,
                ProjectileSpeed = source.ProjectileSpeed, ExplosionRadius = source.ExplosionRadius
            };
        }

        public static IEnumerable<WeaponKind> AllKinds => Definitions.Keys;
    }
}
