#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;

namespace Danao.Editor
{
    [InitializeOnLoad]
    public static class DanaoProjectConfigurator
    {
        static DanaoProjectConfigurator() { EditorApplication.delayCall += EnsureProject; }

        public static void EnsureProject()
        {
            PlayerSettings.companyName = "Duck & Bear";
            PlayerSettings.productName = "打闹 Dǎnào";
            PlayerSettings.colorSpace = ColorSpace.Linear;
            PlayerSettings.defaultScreenWidth = 1920;
            PlayerSettings.defaultScreenHeight = 1080;
        }
    }
}
#endif
