using System.Collections.Generic;
using UnityEngine;

namespace Danao.Fighters
{
    public enum CharacterId { Hero, Stephen, Zachary, Mulan, Gaby, Sara, Mum, Dad }
    public enum CostumeId { Arcade, KungFu, Wrestler, Pyjamas, RubberDuck, Panda, Space, MangoHero }

    public sealed class CharacterDefinition
    {
        public CharacterId Id;
        public string DisplayName;
        public Color BaseColour;
        public Color AccentColour;
        public Vector3 BodyScale = new Vector3(.82f, 1f, .82f);
    }

    public sealed class CostumeDefinition
    {
        public CostumeId Id;
        public string DisplayName;
        public Color Tint;
        public int AccessoryStyle;
    }

    public static class CharacterCatalog
    {
        private static readonly CharacterDefinition[] Characters =
        {
            Character(CharacterId.Hero, "Hero", "27C8B9", "FFD84F"),
            Character(CharacterId.Stephen, "Stephen", "F07B4B", "2D3448"),
            Character(CharacterId.Zachary, "Zachary", "4E88E8", "E7D067"),
            Character(CharacterId.Mulan, "Mulan", "B75ED8", "F4C9DD"),
            Character(CharacterId.Gaby, "Gaby", "6ABC5B", "F0CB62"),
            Character(CharacterId.Sara, "Sara", "E39A3B", "6A8FCB"),
            Character(CharacterId.Mum, "Mum", "E76891", "F1D5B5"),
            Character(CharacterId.Dad, "Dad", "697386", "A9C5A5")
        };

        private static readonly CostumeDefinition[] OutfitDefinitions =
        {
            Costume(CostumeId.Arcade, "Arcade Original", "FFFFFF", 0),
            Costume(CostumeId.KungFu, "Kung Fu Nonsense", "D94B3D", 1),
            Costume(CostumeId.Wrestler, "Ring Legend", "365BD6", 2),
            Costume(CostumeId.Pyjamas, "Punchy Pyjamas", "7668D7", 3),
            Costume(CostumeId.RubberDuck, "Rubber Duck", "FFD93C", 4),
            Costume(CostumeId.Panda, "Panda Problem", "E8E2D7", 5),
            Costume(CostumeId.Space, "Space Cadet", "9DE7EC", 6),
            Costume(CostumeId.MangoHero, "Mango Hero", "FF9F32", 7)
        };

        public static IReadOnlyList<CharacterDefinition> All => Characters;
        public static IReadOnlyList<CostumeDefinition> Costumes => OutfitDefinitions;

        public static CharacterDefinition For(CharacterId id) => Characters[(int)id];
        public static CostumeDefinition For(CostumeId id) => OutfitDefinitions[(int)id];

        public static CharacterDefinition ForName(string name)
        {
            for (var i = 0; i < Characters.Length; i++) if (Characters[i].DisplayName == name) return Characters[i];
            return Characters[0];
        }

        private static CharacterDefinition Character(CharacterId id, string name, string baseHex, string accentHex)
        {
            ColorUtility.TryParseHtmlString("#" + baseHex, out var body);
            ColorUtility.TryParseHtmlString("#" + accentHex, out var accent);
            return new CharacterDefinition { Id = id, DisplayName = name, BaseColour = body, AccentColour = accent };
        }

        private static CostumeDefinition Costume(CostumeId id, string name, string tintHex, int accessory)
        {
            ColorUtility.TryParseHtmlString("#" + tintHex, out var tint);
            return new CostumeDefinition { Id = id, DisplayName = name, Tint = tint, AccessoryStyle = accessory };
        }
    }
}
