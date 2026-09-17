using System.Collections.Generic;
using Danao.Weapons;
using UnityEngine;

namespace Danao.Arenas
{
    public enum ArenaId
    {
        DublinDocks,
        LondonUnderground,
        MangoMarket,
        TempleCourtyard,
        SichuanTeaHouse,
        IceFestival,
        HouseParty,
        ToyFactory,
        CruiseShip,
        MadCircus,
        WrestlingArena
    }

    public enum ArenaHazardKind
    {
        CraneHook,
        PassingTrain,
        RollingFruit,
        GongPulse,
        SlidingScreens,
        IceSlip,
        SpeakerPulse,
        ConveyorPuncher,
        ShipSway,
        CircusBounce,
        WrestlingRopes
    }

    public sealed class ArenaDefinition
    {
        public ArenaId Id;
        public string DisplayName;
        public Color Primary;
        public Color Secondary;
        public Vector2 Size;
        public ArenaHazardKind Hazard;
        public WeaponKind[] WeaponPool;
    }

    public static class ArenaCatalog
    {
        private static readonly ArenaDefinition[] Definitions =
        {
            Def(ArenaId.DublinDocks, "Dublin Docks", "2F6E68", "E0A446", ArenaHazardKind.CraneHook, WeaponKind.Mop, WeaponKind.Bin, WeaponKind.FoldingChair, WeaponKind.FoamExtinguisher, WeaponKind.Baguette, WeaponKind.BowlingBall),
            Def(ArenaId.LondonUnderground, "London Underground", "9D2335", "D9B44A", ArenaHazardKind.PassingTrain, WeaponKind.Umbrella, WeaponKind.Suitcase, WeaponKind.FoamBlaster, WeaponKind.PlungerLauncher, WeaponKind.TrafficCone, WeaponKind.FryingPan),
            Def(ArenaId.MangoMarket, "Mango Market", "E07D2B", "49A078", ArenaHazardKind.RollingFruit, WeaponKind.GiantMango, WeaponKind.Baguette, WeaponKind.GiantFish, WeaponKind.Kettle, WeaponKind.SillySausage, WeaponKind.WaterBlaster),
            Def(ArenaId.TempleCourtyard, "Temple Courtyard", "A94442", "D9B65D", ArenaHazardKind.GongPulse, WeaponKind.Mop, WeaponKind.Umbrella, WeaponKind.InflatableHammer, WeaponKind.SuctionCupLauncher, WeaponKind.Cushion, WeaponKind.SpringBoxingGlove),
            Def(ArenaId.SichuanTeaHouse, "Sichuan Tea House", "B23A48", "3C8D68", ArenaHazardKind.SlidingScreens, WeaponKind.Kettle, WeaponKind.FryingPan, WeaponKind.Mop, WeaponKind.BubbleCannon, WeaponKind.SillySausage, WeaponKind.ToyGuitar),
            Def(ArenaId.IceFestival, "Ice Festival", "66A7D5", "D7F0F4", ArenaHazardKind.IceSlip, WeaponKind.PoolNoodle, WeaponKind.Cushion, WeaponKind.TennisBallLauncher, WeaponKind.FoamBlaster, WeaponKind.GiantFish, WeaponKind.BowlingBall),
            Def(ArenaId.HouseParty, "Duck & Bear House Party", "7A4FA3", "E7A44A", ArenaHazardKind.SpeakerPulse, WeaponKind.Speaker, WeaponKind.Cushion, WeaponKind.ToyGuitar, WeaponKind.PartyPopperBlaster, WeaponKind.NoveltyFloppy, WeaponKind.SillySausage),
            Def(ArenaId.ToyFactory, "Toy Factory", "3378A4", "E65F5C", ArenaHazardKind.ConveyorPuncher, WeaponKind.SpringBoxingGlove, WeaponKind.ToyCrate, WeaponKind.InflatableHammer, WeaponKind.FoamBlaster, WeaponKind.MagnetGun, WeaponKind.RubberChicken),
            Def(ArenaId.CruiseShip, "Cruise Ship", "2E6E9E", "F4E3B2", ArenaHazardKind.ShipSway, WeaponKind.Suitcase, WeaponKind.Umbrella, WeaponKind.Bin, WeaponKind.WaterBlaster, WeaponKind.FoamExtinguisher, WeaponKind.GiantFish),
            Def(ArenaId.MadCircus, "Mad Circus", "C03E77", "F0C14B", ArenaHazardKind.CircusBounce, WeaponKind.ConfettiCannon, WeaponKind.RubberChicken, WeaponKind.InflatableHammer, WeaponKind.PartyPopperBlaster, WeaponKind.Anvil, WeaponKind.NoveltyFloppy),
            Def(ArenaId.WrestlingArena, "Wrestling Arena", "2F3D72", "D93A45", ArenaHazardKind.WrestlingRopes, WeaponKind.BoxingGlove, WeaponKind.FoldingChair, WeaponKind.FryingPan, WeaponKind.NoveltyFloppy, WeaponKind.FoamBlaster, WeaponKind.Bazooka, WeaponKind.BowlingBall, WeaponKind.WrestlingTable)
        };

        public static IReadOnlyList<ArenaDefinition> All => Definitions;

        public static ArenaDefinition For(ArenaId id)
        {
            for (var i = 0; i < Definitions.Length; i++) if (Definitions[i].Id == id) return Definitions[i];
            return Definitions[0];
        }

        private static ArenaDefinition Def(ArenaId id, string name, string primary, string secondary, ArenaHazardKind hazard, params WeaponKind[] pool)
        {
            ColorUtility.TryParseHtmlString("#" + primary, out var p);
            ColorUtility.TryParseHtmlString("#" + secondary, out var s);
            return new ArenaDefinition { Id = id, DisplayName = name, Primary = p, Secondary = s, Size = new Vector2(18f, 15f), Hazard = hazard, WeaponPool = pool };
        }
    }
}
