#if UNITY_EDITOR
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace Danao.Editor
{
    [InitializeOnLoad]
    public static class DanaoProjectConfigurator
    {
        private const string GeneratedFolder = "Assets/Danao/Generated";
        private const string PipelineAssetPath = "Assets/Danao/Generated/DanaoURP.asset";
        private const string BootScenePath = "Assets/Danao/Generated/Boot.unity";

        static DanaoProjectConfigurator() { EditorApplication.delayCall += EnsureProject; }

        public static void EnsureProject()
        {
            PlayerSettings.companyName = "Duck & Bear";
            PlayerSettings.productName = "打闹 Dǎnào";
            PlayerSettings.colorSpace = ColorSpace.Linear;
            PlayerSettings.defaultScreenWidth = 1920;
            PlayerSettings.defaultScreenHeight = 1080;
            EnsureGeneratedFolder();
            EnsureUniversalRenderPipeline();
            EnsureBootScene();
        }

        private static void EnsureGeneratedFolder()
        {
            if (AssetDatabase.IsValidFolder(GeneratedFolder)) return;
            Directory.CreateDirectory(GeneratedFolder);
            AssetDatabase.Refresh();
        }

        private static void EnsureUniversalRenderPipeline()
        {
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

        private static void EnsureBootScene()
        {
            if (AssetDatabase.LoadAssetAtPath<SceneAsset>(BootScenePath) == null)
            {
                var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Additive);
                EditorSceneManager.SaveScene(scene, BootScenePath);
                EditorSceneManager.CloseScene(scene, true);
                AssetDatabase.Refresh();
            }

            var scenes = EditorBuildSettings.scenes;
            if (scenes.Length == 1 && scenes[0].enabled && scenes[0].path == BootScenePath) return;
            EditorBuildSettings.scenes = new[]
            {
                new EditorBuildSettingsScene(BootScenePath, true)
            };
        }
    }
}
#endif
