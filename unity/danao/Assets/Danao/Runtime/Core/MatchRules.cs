using Danao.Arenas;
using Danao.Fighters;

namespace Danao.Core
{
    public enum LocalMode
    {
        OneVsOne,
        TwoVsTwo,
        FreeForAll,
        RoyalRumble,
        MangoGrab,
        HotBomb,
        KingOfRing,
        Heist
    }

    public static class MatchRules
    {
        public static int TeamForSlot(int slot, bool teamMode)
        {
            if (!teamMode) return slot;
            return slot < 2 ? 0 : 1;
        }

        public static int NormalisePlayerCount(LocalMode mode, int requested)
        {
            if (mode == LocalMode.OneVsOne) return 2;
            if (mode == LocalMode.TwoVsTwo) return 4;
            return requested < 2 ? 2 : requested > 4 ? 4 : requested;
        }

        public static bool IsModeAllowed(LocalMode mode, int joinedPlayers)
        {
            if (mode == LocalMode.OneVsOne) return joinedPlayers == 2;
            if (mode == LocalMode.TwoVsTwo) return joinedPlayers == 4;
            return joinedPlayers >= 2 && joinedPlayers <= 4;
        }

        public static LocalMode NextAllowedMode(LocalMode current, int direction, int joinedPlayers)
        {
            var values = (LocalMode[])System.Enum.GetValues(typeof(LocalMode));
            var step = direction < 0 ? -1 : 1;
            var index = (int)current;
            for (var i = 0; i < values.Length; i++)
            {
                index = (index + step + values.Length) % values.Length;
                if (IsModeAllowed(values[index], joinedPlayers)) return values[index];
            }
            return current;
        }

        public static bool UsesElimination(LocalMode mode)
        {
            return mode == LocalMode.OneVsOne || mode == LocalMode.TwoVsTwo || mode == LocalMode.FreeForAll || mode == LocalMode.RoyalRumble;
        }
    }

    public sealed class LocalMatchConfig
    {
        public LocalMode Mode = LocalMode.OneVsOne;
        public ArenaId Arena = ArenaId.WrestlingArena;
        public MatchSettings Settings = new MatchSettings();
        public PlayerLoadout[] Loadouts =
        {
            new PlayerLoadout(CharacterId.Hero, CostumeId.Arcade),
            new PlayerLoadout(CharacterId.Stephen, CostumeId.Arcade),
            new PlayerLoadout(CharacterId.Zachary, CostumeId.Arcade),
            new PlayerLoadout(CharacterId.Mulan, CostumeId.Arcade)
        };

        public int PlayerCount => MatchRules.NormalisePlayerCount(Mode, Settings.ActivePlayers);
        public bool UsesTeams => Mode == LocalMode.TwoVsTwo;
        public bool UsesRingOut => Mode == LocalMode.RoyalRumble || Settings.RingOut || !Settings.HealthDamage;
        public bool UsesElimination => MatchRules.UsesElimination(Mode);
    }
}
