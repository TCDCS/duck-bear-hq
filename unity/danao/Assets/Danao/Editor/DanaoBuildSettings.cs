#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace Danao.Editor
{
    public sealed class DanaoBuildSettings : IPreprocessBuildWithReport
    {
        public int callbackOrder => -1000;
        public void OnPreprocessBuild(BuildReport report)
        {
            PlayerSettings.companyName="Duck & Bear";
            PlayerSettings.productName="打闹 · Dǎnào";
            PlayerSettings.bundleVersion="0.1.0";
            PlayerSettings.runInBackground=true;
            if(report.summary.platform==BuildTarget.WebGL)
            {
                PlayerSettings.WebGL.compressionFormat=WebGLCompressionFormat.Disabled;
                PlayerSettings.WebGL.decompressionFallback=false;
                PlayerSettings.WebGL.initialMemorySize=256;
                PlayerSettings.WebGL.maximumMemorySize=1024;
                PlayerSettings.WebGL.memoryGrowthMode=WebGLMemoryGrowthMode.Geometric;
                QualitySettings.vSyncCount=0;
                Application.targetFrameRate=60;
            }
        }
    }
}
#endif
