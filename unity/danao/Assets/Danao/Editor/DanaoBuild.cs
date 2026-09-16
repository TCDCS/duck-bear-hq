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

        [MenuItem("Danao/Build/Web")]
        public static void BuildWeb() => Build(BuildTarget.WebGL, "Build/Web");

        [MenuItem("Danao/Build/Windows x64")]
        public static void BuildWindows() => Build(BuildTarget.StandaloneWindows64, "Build/Windows/Danao.exe");

        public static void Build(BuildTarget target, string output)
        {
            DanaoProjectConfigurator.EnsureProject();
            Directory.CreateDirectory("Assets/Danao/Generated");
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
            AssetDatabase.Refresh();

            if (target == BuildTarget.WebGL)
            {
                Directory.CreateDirectory(output);
                // Keep the four canonical Unity filenames uncompressed. R2 and the
                // browser launcher address Danao.data/framework.js/wasm directly.
                PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Disabled;
                PlayerSettings.WebGL.decompressionFallback = false;
            }
            else
            {
                var directory = Path.GetDirectoryName(output);
                if (!string.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);
            }

            var options = new BuildPlayerOptions
            {
                scenes = new[] { ScenePath },
                locationPathName = output,
                target = target,
                options = BuildOptions.None
            };
            var report = BuildPipeline.BuildPlayer(options);
            if (report.summary.result != BuildResult.Succeeded)
                throw new InvalidOperationException($"Dǎnào build failed: {report.summary.result} ({report.summary.totalErrors} errors)");
        }
    }
}
#endif
