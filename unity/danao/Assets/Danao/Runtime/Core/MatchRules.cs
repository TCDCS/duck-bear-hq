namespace Danao.Core
{
    public enum LocalMode
    {
        OneVsOne,
        TwoVsTwo,
        FreeForAll,
        RoyalRumble
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
    }

    public sealed class LocalMatchConfig
    {
        public LocalMode Mode = LocalMode.OneVsOne;
        public MatchSettings Settings = new MatchSettings();

        public int PlayerCount => MatchRules.NormalisePlayerCount(Mode, Settings.ActivePlayers);
        public bool UsesTeams => Mode == LocalMode.TwoVsTwo;
        public bool UsesRingOut => Mode == LocalMode.RoyalRumble || Settings.RingOut || !Settings.HealthDamage;
    }
}
