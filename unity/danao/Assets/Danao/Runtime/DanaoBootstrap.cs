using UnityEngine;

namespace Danao
{
    public static class DanaoBootstrap
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        public static void EnsureBooted()
        {
            if (Object.FindFirstObjectByType<DanaoGame>() != null) return;
            new GameObject("DanaoGame").AddComponent<DanaoGame>();
        }
    }
}
