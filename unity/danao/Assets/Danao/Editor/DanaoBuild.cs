#if UNITY_EDITOR
using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;

namespace Danao.Editor
{
    public static class DanaoBuild
    {
        private const string ScenePath = "Assets/Danao/Generated/Boot.unity";
        private const string WebOutput = "Build/Web";

        [MenuItem("Danao/Build/Web")]
        public static void BuildWeb()
        {
            DanaoProjectConfigurator.EnsureProject();
            Directory.CreateDirectory("Assets/Danao/Generated");
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
            AssetDatabase.Refresh();

            Directory.CreateDirectory(WebOutput);
            // Keep the four canonical Unity filenames uncompressed. R2 and the
            // browser launcher address Danao.data/framework.js/wasm directly.
            PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Disabled;
            PlayerSettings.WebGL.decompressionFallback = false;

            var options = new BuildPlayerOptions
            {
                scenes = new[] { ScenePath },
                locationPathName = WebOutput,
                target = BuildTarget.WebGL,
                options = BuildOptions.None
            };
            var report = BuildPipeline.BuildPlayer(options);
            if (report.summary.result != BuildResult.Succeeded)
                throw new InvalidOperationException($"Dǎnào WebGL build failed: {report.summary.result} ({report.summary.totalErrors} errors)");
        }
    }
}
#endif
