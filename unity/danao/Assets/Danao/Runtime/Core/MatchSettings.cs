using System;

namespace Danao.Core
{
    [Serializable]
    public sealed class MatchSettings
    {
        public const int StartingHp = 100;
        public bool HealthDamage = true;
        public bool VisibleBruising = true;
        public bool ArenaHazards = true;
        public bool TeamMode = false;
        public bool RingOut = false;
        public bool FriendlyFire = true;
        public int ActivePlayers = 2;

        public MatchSettings Clone() => (MatchSettings)MemberwiseClone();
    }
}
