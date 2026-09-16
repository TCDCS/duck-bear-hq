using System.Collections.Generic;
using Danao.Combat;
using Danao.Core;
using UnityEngine;

namespace Danao.Fighters
{
    public static class FighterFactory
    {
        private static readonly Color[] Palette =
        {
            new Color(.15f,.82f,.75f), new Color(.96f,.49f,.33f), new Color(.35f,.61f,.95f), new Color(.82f,.45f,.91f),
            new Color(.45f,.82f,.36f), new Color(.96f,.73f,.22f), new Color(.93f,.42f,.62f), new Color(.55f,.58f,.66f)
        };

        public static readonly string[] Roster = { "Hero", "Stephen", "Zachary", "Mulan", "Gaby", "Sara", "Mum", "Dad" };

        public static FighterController Create(int slot, string displayName, Vector3 spawn, MatchSettings settings)
        {
            var root = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            root.name = $"Fighter_{slot}_{displayName}";
            root.transform.position = spawn;
            root.transform.localScale = new Vector3(.82f, 1f, .82f);
            var rootRenderer = root.GetComponent<Renderer>();
            var baseColour = Palette[slot % Palette.Length];
            rootRenderer.material = MakeMaterial(baseColour);

            var rootBody = root.AddComponent<Rigidbody>();
            var knockdown = root.AddComponent<ArcadeKnockdown>();
            var health = root.AddComponent<FighterHealth>();
            root.AddComponent<FighterCombat>();
            var controller = root.AddComponent<FighterController>();

            var hand = new GameObject("HandAnchor").transform;
            hand.SetParent(root.transform, false);
            hand.localPosition = new Vector3(.62f, .25f, .72f);

            var renderers = new List<Renderer> { rootRenderer };
            AddHead(root.transform, knockdown, rootBody, renderers, baseColour);
            AddLimb(root.transform, knockdown, rootBody, renderers, "ArmL", new Vector3(-.62f,.25f,.08f), new Vector3(.22f,.62f,.22f), baseColour * .92f);
            AddLimb(root.transform, knockdown, rootBody, renderers, "ArmR", new Vector3(.62f,.25f,.08f), new Vector3(.22f,.62f,.22f), baseColour * .92f);
            AddLimb(root.transform, knockdown, rootBody, renderers, "LegL", new Vector3(-.28f,-.88f,.02f), new Vector3(.25f,.55f,.25f), baseColour * .78f);
            AddLimb(root.transform, knockdown, rootBody, renderers, "LegR", new Vector3(.28f,-.88f,.02f), new Vector3(.25f,.55f,.25f), baseColour * .78f);

            health.SetVisuals(renderers.ToArray(), baseColour);
            var team = MatchRules.TeamForSlot(slot, settings.TeamMode);
            controller.Configure(slot, team, displayName, settings, hand);
            return controller;
        }

        private static void AddHead(Transform parent, ArcadeKnockdown doll, Rigidbody rootBody, List<Renderer> renderers, Color colour)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            go.name = "Head";
            go.transform.SetParent(parent, false);
            go.transform.localPosition = new Vector3(0f,1.02f,0f);
            go.transform.localScale = Vector3.one * .68f;
            var renderer = go.GetComponent<Renderer>();
            renderer.material = MakeMaterial(Color.Lerp(colour, Color.white, .22f));
            renderers.Add(renderer);
            SetAsRagdollLimb(go, doll, rootBody, 7f, 22f, 28f);
        }

        private static void AddLimb(Transform parent, ArcadeKnockdown doll, Rigidbody rootBody, List<Renderer> renderers, string name, Vector3 localPosition, Vector3 scale, Color colour)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            go.name = name;
            go.transform.SetParent(parent, false);
            go.transform.localPosition = localPosition;
            go.transform.localScale = scale;
            var renderer = go.GetComponent<Renderer>();
            renderer.material = MakeMaterial(colour);
            renderers.Add(renderer);
            SetAsRagdollLimb(go, doll, rootBody, 5f, 35f, 45f);
        }

        private static void SetAsRagdollLimb(GameObject go, ArcadeKnockdown doll, Rigidbody rootBody, float mass, float low, float high)
        {
            var collider = go.GetComponent<Collider>();
            var body = go.AddComponent<Rigidbody>();
            body.mass = mass;
            body.interpolation = RigidbodyInterpolation.Interpolate;
            var joint = go.AddComponent<CharacterJoint>();
            joint.connectedBody = rootBody;
            joint.enablePreprocessing = false;
            joint.lowTwistLimit = new SoftJointLimit { limit = -low };
            joint.highTwistLimit = new SoftJointLimit { limit = high };
            joint.swing1Limit = new SoftJointLimit { limit = high };
            joint.swing2Limit = new SoftJointLimit { limit = high };
            doll.RegisterLimb(body, collider);
        }

        private static Material MakeMaterial(Color colour)
        {
            var shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            var material = new Material(shader);
            material.color = colour;
            if (material.HasProperty("_Smoothness")) material.SetFloat("_Smoothness", .22f);
            return material;
        }
    }
}
