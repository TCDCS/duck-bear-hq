#if UNITY_EDITOR
using System.IO;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace Danao.Editor
{
    [InitializeOnLoad]
    public static class DanaoProjectConfigurator
    {
        private const string GeneratedFolder = "Assets/Danao/Generated";
        private const string PipelineAssetPath = GeneratedFolder + "/DanaoURP.asset";

        static DanaoProjectConfigurator() { EditorApplication.delayCall += EnsureProject; }

        public static void EnsureProject()
        {
            PlayerSettings.companyName = "Duck & Bear";
            PlayerSettings.productName = "打闹 Dǎnào";
            PlayerSettings.colorSpace = ColorSpace.Linear;
            PlayerSettings.defaultScreenWidth = 1920;
            PlayerSettings.defaultScreenHeight = 1080;
            EnsureUniversalRenderPipeline();
        }

        private static void EnsureUniversalRenderPipeline()
        {
            if (!AssetDatabase.IsValidFolder(GeneratedFolder))
            {
                Directory.CreateDirectory(GeneratedFolder);
                AssetDatabase.Refresh();
            }

            var pipeline = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(PipelineAssetPath);
            if (pipeline == null)
            {
                pipeline = UniversalRenderPipelineAsset.Create();
                pipeline.name = "Danao URP";
                AssetDatabase.CreateAsset(pipeline, PipelineAssetPath);
                AssetDatabase.SaveAssets();
            }

            if (GraphicsSettings.defaultRenderPipeline != pipeline)
                GraphicsSettings.defaultRenderPipeline = pipeline;
            if (QualitySettings.renderPipeline != pipeline)
                QualitySettings.renderPipeline = pipeline;
        }
    }
}
#endif
