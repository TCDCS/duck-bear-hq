using System.Collections.Generic;

namespace Danao.Weapons
{
    public enum WeaponKind
    {
        BoxingGlove,
        SpringBoxingGlove,
        InflatableHammer,
        RubberChicken,
        PoolNoodle,
        FryingPan,
        FoldingChair,
        Mop,
        Baguette,
        GiantFish,
        Umbrella,
        ToyGuitar,
        SillySausage,
        NoveltyFloppy,
        FoamBlaster,
        WaterBlaster,
        SuctionCupLauncher,
        ConfettiCannon,
        BubbleCannon,
        TennisBallLauncher,
        MagnetGun,
        PlungerLauncher,
        PartyPopperBlaster,
        Bazooka,
        BowlingBall,
        TrafficCone,
        Bin,
        Suitcase,
        Kettle,
        Cushion,
        FoamExtinguisher,
        Anvil,
        GiantMango,
        WrestlingTable,
        Speaker,
        ToyCrate
    }

    public sealed class WeaponDefinition
    {
        public WeaponKind Kind;
        public string DisplayName;
        public int Damage;
        public float Knockback;
        public float Cooldown;
        public bool Ranged;
        public bool Heavy;
        public int Ammo;
        public float ProjectileSpeed;
        public float ExplosionRadius;
        public float CarrySpeedMultiplier = 1f;

        private static readonly Dictionary<WeaponKind, WeaponDefinition> Definitions = new Dictionary<WeaponKind, WeaponDefinition>
        {
            [WeaponKind.BoxingGlove] = Melee(WeaponKind.BoxingGlove, "Boxing Glove", 8, 8.5f, .32f),
            [WeaponKind.SpringBoxingGlove] = Melee(WeaponKind.SpringBoxingGlove, "Spring Boxing Glove", 10, 12f, .55f),
            [WeaponKind.InflatableHammer] = Melee(WeaponKind.InflatableHammer, "Inflatable Hammer", 11, 11f, .60f),
            [WeaponKind.RubberChicken] = Melee(WeaponKind.RubberChicken, "Rubber Chicken", 7, 8f, .35f),
            [WeaponKind.PoolNoodle] = Melee(WeaponKind.PoolNoodle, "Pool Noodle", 6, 7.5f, .28f),
            [WeaponKind.FryingPan] = Melee(WeaponKind.FryingPan, "Frying Pan", 12, 9.2f, .48f),
            [WeaponKind.FoldingChair] = Melee(WeaponKind.FoldingChair, "Folding Chair", 14, 10.5f, .58f),
            [WeaponKind.Mop] = Melee(WeaponKind.Mop, "Mop", 8, 8.6f, .40f),
            [WeaponKind.Baguette] = Melee(WeaponKind.Baguette, "Baguette", 7, 7.8f, .34f),
            [WeaponKind.GiantFish] = Melee(WeaponKind.GiantFish, "Giant Fish", 12, 10.5f, .54f),
            [WeaponKind.Umbrella] = Melee(WeaponKind.Umbrella, "Umbrella", 9, 9.5f, .43f),
            [WeaponKind.ToyGuitar] = Melee(WeaponKind.ToyGuitar, "Toy Guitar", 13, 10.2f, .58f),
            [WeaponKind.SillySausage] = Melee(WeaponKind.SillySausage, "Silly Sausage", 8, 9.4f, .36f),
            [WeaponKind.NoveltyFloppy] = Melee(WeaponKind.NoveltyFloppy, "Floppy Nonsense", 10, 13.5f, .46f),

            [WeaponKind.FoamBlaster] = RangedWeapon(WeaponKind.FoamBlaster, "Foam Blaster", 6, 5.4f, .22f, 10, 21f),
            [WeaponKind.WaterBlaster] = RangedWeapon(WeaponKind.WaterBlaster, "Water Blaster", 4, 7.8f, .20f, 14, 18f),
            [WeaponKind.SuctionCupLauncher] = RangedWeapon(WeaponKind.SuctionCupLauncher, "Suction Cup Launcher", 7, 7f, .42f, 8, 17f),
            [WeaponKind.ConfettiCannon] = RangedWeapon(WeaponKind.ConfettiCannon, "Confetti Cannon", 5, 9.2f, .55f, 6, 16f),
            [WeaponKind.BubbleCannon] = RangedWeapon(WeaponKind.BubbleCannon, "Bubble Cannon", 4, 6.8f, .30f, 10, 14f),
            [WeaponKind.TennisBallLauncher] = RangedWeapon(WeaponKind.TennisBallLauncher, "Tennis Ball Launcher", 7, 6.5f, .27f, 10, 22f),
            [WeaponKind.MagnetGun] = RangedWeapon(WeaponKind.MagnetGun, "Magnet Gun", 3, 14f, .62f, 6, 19f),
            [WeaponKind.PlungerLauncher] = RangedWeapon(WeaponKind.PlungerLauncher, "Plunger Launcher", 8, 8.3f, .48f, 7, 17f),
            [WeaponKind.PartyPopperBlaster] = RangedWeapon(WeaponKind.PartyPopperBlaster, "Party Popper Blaster", 5, 8f, .25f, 12, 20f),
            [WeaponKind.Bazooka] = RangedWeapon(WeaponKind.Bazooka, "Cartoon Bazooka", 24, 16f, 1.05f, 2, 17f, 4.6f),

            [WeaponKind.BowlingBall] = HeavyWeapon(WeaponKind.BowlingBall, "Bowling Ball", 16, 12f, .80f, .83f),
            [WeaponKind.TrafficCone] = HeavyWeapon(WeaponKind.TrafficCone, "Traffic Cone", 8, 8f, .42f, .94f),
            [WeaponKind.Bin] = HeavyWeapon(WeaponKind.Bin, "Bin", 15, 11f, .74f, .80f),
            [WeaponKind.Suitcase] = HeavyWeapon(WeaponKind.Suitcase, "Suitcase", 13, 10f, .62f, .86f),
            [WeaponKind.Kettle] = HeavyWeapon(WeaponKind.Kettle, "Kettle", 10, 9f, .50f, .92f),
            [WeaponKind.Cushion] = HeavyWeapon(WeaponKind.Cushion, "Cushion", 5, 7f, .30f, .97f),
            [WeaponKind.FoamExtinguisher] = HeavyWeapon(WeaponKind.FoamExtinguisher, "Foam Extinguisher", 11, 10.4f, .64f, .86f),
            [WeaponKind.Anvil] = HeavyWeapon(WeaponKind.Anvil, "Anvil", 22, 15f, 1.10f, .68f),
            [WeaponKind.GiantMango] = HeavyWeapon(WeaponKind.GiantMango, "Giant Mango", 17, 12.8f, .78f, .78f),
            [WeaponKind.WrestlingTable] = HeavyWeapon(WeaponKind.WrestlingTable, "Wrestling Table", 18, 12.4f, .95f, .72f),
            [WeaponKind.Speaker] = HeavyWeapon(WeaponKind.Speaker, "Speaker", 14, 11f, .68f, .82f),
            [WeaponKind.ToyCrate] = HeavyWeapon(WeaponKind.ToyCrate, "Toy Crate", 16, 11.5f, .75f, .80f)
        };

        private static WeaponDefinition Melee(WeaponKind kind, string name, int damage, float knockback, float cooldown)
        {
            return new WeaponDefinition { Kind = kind, DisplayName = name, Damage = damage, Knockback = knockback, Cooldown = cooldown, Ammo = -1 };
        }

        private static WeaponDefinition RangedWeapon(WeaponKind kind, string name, int damage, float knockback, float cooldown, int ammo, float speed, float radius = 0f)
        {
            var d = Melee(kind, name, damage, knockback, cooldown);
            d.Ranged = true;
            d.Ammo = ammo;
            d.ProjectileSpeed = speed;
            d.ExplosionRadius = radius;
            return d;
        }

        private static WeaponDefinition HeavyWeapon(WeaponKind kind, string name, int damage, float knockback, float cooldown, float carrySpeed)
        {
            var d = Melee(kind, name, damage, knockback, cooldown);
            d.Heavy = true;
            d.CarrySpeedMultiplier = carrySpeed;
            return d;
        }

        public static WeaponDefinition For(WeaponKind kind)
        {
            var source = Definitions[kind];
            return new WeaponDefinition
            {
                Kind = source.Kind,
                DisplayName = source.DisplayName,
                Damage = source.Damage,
                Knockback = source.Knockback,
                Cooldown = source.Cooldown,
                Ranged = source.Ranged,
                Heavy = source.Heavy,
                Ammo = source.Ammo,
                ProjectileSpeed = source.ProjectileSpeed,
                ExplosionRadius = source.ExplosionRadius,
                CarrySpeedMultiplier = source.CarrySpeedMultiplier
            };
        }

        public static IEnumerable<WeaponKind> AllKinds => Definitions.Keys;
    }
}
