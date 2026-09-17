using UnityEngine;

namespace Danao.Core
{
    internal static class RuntimeMaterial
    {
        public static void Paint(Renderer renderer, Color colour, float smoothness = .22f)
        {
            if (renderer == null) return;
            var material = renderer.material;
            if (material == null) return;

            if (material.HasProperty("_BaseColor")) material.SetColor("_BaseColor", colour);
            if (material.HasProperty("_Color")) material.SetColor("_Color", colour);
            if (material.HasProperty("_Smoothness")) material.SetFloat("_Smoothness", smoothness);
            else if (material.HasProperty("_Glossiness")) material.SetFloat("_Glossiness", smoothness);
        }
    }
}
