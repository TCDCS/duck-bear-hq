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
        private const string RendererAssetPath = "Assets/Danao/Generated/DanaoUniversalRenderer.asset";
        private const string RuntimeResourcesFolder = "Assets/Danao/Generated/Resources";
        private const string RuntimeMaterialPath = "Assets/Danao/Generated/Resources/DanaoRuntimeLit.mat";
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
            EnsureRuntimeMaterial();
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
            var rendererData = AssetDatabase.LoadAssetAtPath<ScriptableRendererData>(RendererAssetPath);
            var pipeline = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(PipelineAssetPath);
            if (pipeline == null)
            {
                pipeline = UniversalRenderPipelineAsset.Create(rendererData);
                pipeline.name = "Danao URP";
                AssetDatabase.CreateAsset(pipeline, PipelineAssetPath);
            }

            if (rendererData == null)
            {
                rendererData = pipeline.LoadBuiltinRendererData(RendererType.UniversalRenderer);
                var rendererDataPath = AssetDatabase.GetAssetPath(rendererData);
                if (!string.IsNullOrEmpty(rendererDataPath) && rendererDataPath != RendererAssetPath)
                {
                    var moveError = AssetDatabase.MoveAsset(rendererDataPath, RendererAssetPath);
                    if (!string.IsNullOrEmpty(moveError))
                        Debug.LogError("Could not persist Dǎnào Universal Renderer data: " + moveError);
                }
            }

            AssetDatabase.SaveAssets();

            if (GraphicsSettings.defaultRenderPipeline != pipeline)
                GraphicsSettings.defaultRenderPipeline = pipeline;
            if (QualitySettings.renderPipeline != pipeline)
                QualitySettings.renderPipeline = pipeline;
        }

        private static void EnsureRuntimeMaterial()
        {
            if (!AssetDatabase.IsValidFolder(RuntimeResourcesFolder))
            {
                Directory.CreateDirectory(RuntimeResourcesFolder);
                AssetDatabase.Refresh();
            }

            var shader = Shader.Find("Universal Render Pipeline/Lit");
            if (shader == null)
                throw new InvalidDataException("Dǎnào requires the Universal Render Pipeline/Lit shader.");

            var material = AssetDatabase.LoadAssetAtPath<Material>(RuntimeMaterialPath);
            if (material == null)
            {
                material = new Material(shader) { name = "Danao Runtime Lit" };
                AssetDatabase.CreateAsset(material, RuntimeMaterialPath);
            }
            else if (material.shader != shader)
            {
                material.shader = shader;
                EditorUtility.SetDirty(material);
            }

            AssetDatabase.SaveAssets();
        }

        private static void EnsureBootScene()
        {
            if (AssetDatabase.LoadAssetAtPath<SceneAsset>(BootScenePath) == null)
            {
                // Unity Build Automation opens the project with an unsaved untitled
                // scene. Replacing it is safe; opening another scene additively is not.
                var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
                EditorSceneManager.SaveScene(scene, BootScenePath);
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
