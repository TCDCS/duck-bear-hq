#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;
using UnityEngine.Rendering;

namespace Danao.Editor
{
    public sealed class DanaoBuildSettings : IPreprocessBuildWithReport
    {
        public int callbackOrder => -1000;

        public void OnPreprocessBuild(BuildReport report)
        {
            EnsureAlwaysIncludedShader("Universal Render Pipeline/Lit");
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

        private static void EnsureAlwaysIncludedShader(string shaderName)
        {
            var shader=Shader.Find(shaderName);
            if(shader==null)throw new BuildFailedException($"Required Danao runtime shader is unavailable: {shaderName}");

            var graphicsSettings=new SerializedObject(GraphicsSettings.GetGraphicsSettings());
            var included=graphicsSettings.FindProperty("m_AlwaysIncludedShaders");
            if(included==null||!included.isArray)throw new BuildFailedException("Unity GraphicsSettings does not expose the always-included shader list.");

            for(var i=0;i<included.arraySize;i++)
                if(included.GetArrayElementAtIndex(i).objectReferenceValue==shader)return;

            var index=included.arraySize;
            included.InsertArrayElementAtIndex(index);
            included.GetArrayElementAtIndex(index).objectReferenceValue=shader;
            graphicsSettings.ApplyModifiedPropertiesWithoutUndo();
            AssetDatabase.SaveAssets();
        }
    }
}
#endif
