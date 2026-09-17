using System.Runtime.InteropServices;
using UnityEngine;

namespace Danao
{
    public static class DanaoBootDebug
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        [DllImport("__Internal")]
        private static extern void DanaoDebugMark(string stage);
#endif

        public static void Mark(string stage)
        {
            Debug.Log("[DANAO_BOOT] " + stage);
#if UNITY_WEBGL && !UNITY_EDITOR
            DanaoDebugMark(stage);
#endif
        }
    }

    public static class DanaoBootstrap
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        public static void MarkBeforeScene()
        {
            DanaoBootDebug.Mark("before-scene");
        }

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        public static void EnsureBooted()
        {
            DanaoBootDebug.Mark("after-scene");
            if (Object.FindFirstObjectByType<DanaoGame>() != null) return;
            new GameObject("DanaoGame").AddComponent<DanaoGame>();
        }
    }
}
