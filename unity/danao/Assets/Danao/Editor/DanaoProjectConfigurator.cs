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
        private const string PipelinePath = GeneratedFolder + "/DanaoURP.asset";

        static DanaoProjectConfigurator()
        {
            EditorApplication.delayCall += EnsureProject;
        }

        public static void EnsureProject()
        {
            Directory.CreateDirectory(GeneratedFolder);
            EnsureUrp();
            PlayerSettings.companyName = "Duck & Bear";
            PlayerSettings.productName = "打闹 Dǎnào";
            PlayerSettings.colorSpace = ColorSpace.Linear;
            PlayerSettings.defaultScreenWidth = 1920;
            PlayerSettings.defaultScreenHeight = 1080;
        }

        public static UniversalRenderPipelineAsset EnsureUrp()
        {
            var existing = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(PipelinePath);
            if (existing != null)
            {
                GraphicsSettings.defaultRenderPipeline = existing;
                QualitySettings.renderPipeline = existing;
                return existing;
            }

            var asset = ScriptableObject.CreateInstance<UniversalRenderPipelineAsset>();
            asset.name = "DanaoURP";
            asset.renderScale = 1f;
            asset.msaaSampleCount = 4;
            asset.shadowDistance = 32f;
            asset.supportsHDR = true;
            asset.useSRPBatcher = true;
            var rendererData = asset.LoadBuiltinRendererData();
            AssetDatabase.CreateAsset(asset, PipelinePath);
            if (rendererData != null && !AssetDatabase.Contains(rendererData))
            {
                rendererData.name = "DanaoUniversalRenderer";
                AssetDatabase.AddObjectToAsset(rendererData, asset);
            }
            AssetDatabase.SaveAssets();
            GraphicsSettings.defaultRenderPipeline = asset;
            QualitySettings.renderPipeline = asset;
            return asset;
        }
    }
}
#endif
