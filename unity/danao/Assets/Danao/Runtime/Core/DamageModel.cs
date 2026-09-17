using UnityEngine;

namespace Danao.Core
{
    public static class DamageModel
    {
        public static int Apply(int currentHp, int rawDamage, bool enabled)
        {
            currentHp = Mathf.Clamp(currentHp, 0, MatchSettings.StartingHp);
            if (!enabled) return currentHp;
            return Mathf.Clamp(currentHp - Mathf.Max(0, rawDamage), 0, MatchSettings.StartingHp);
        }
    }
}
