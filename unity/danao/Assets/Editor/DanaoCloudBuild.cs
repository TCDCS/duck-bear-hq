#if UNITY_EDITOR
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;

namespace Danao.Editor
{
    public static class DanaoCloudBuild
    {
        private const string ScenePath = "Assets/Danao/Generated/Boot.unity";

        public static void PreExport()
        {
            DanaoProjectConfigurator.EnsureProject();

            Directory.CreateDirectory("Assets/Danao/Generated");
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            EditorSceneManager.SaveScene(scene, ScenePath);

            EditorBuildSettings.scenes = new[]
            {
                new EditorBuildSettingsScene(ScenePath, true)
            };

            if (EditorUserBuildSettings.activeBuildTarget == BuildTarget.WebGL)
                PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Gzip;

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
        }
    }
}
#endif
