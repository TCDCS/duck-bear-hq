using System.Collections.Generic;
using Danao.Combat;
using Danao.Core;
using UnityEngine;

namespace Danao.Fighters
{
    public static class FighterFactory
    {
        public static readonly string[] Roster = { "Hero", "Stephen", "Zachary", "Mulan", "Gaby", "Sara", "Mum", "Dad" };

        public static FighterController Create(int slot, string displayName, Vector3 spawn, MatchSettings settings)
        {
            var character = CharacterCatalog.ForName(displayName);
            return Create(slot, new PlayerLoadout(character.Id, CostumeId.Arcade), spawn, settings);
        }

        public static FighterController Create(int slot, PlayerLoadout loadout, Vector3 spawn, MatchSettings settings)
        {
            var character = CharacterCatalog.For(loadout.Character);
            var costume = CharacterCatalog.For(loadout.Costume);
            var baseColour = loadout.Costume == CostumeId.Arcade ? character.BaseColour : Color.Lerp(character.BaseColour, costume.Tint, .42f);

            var root = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            root.name = $"Fighter_{slot}_{character.DisplayName}";
            root.transform.position = spawn;
            root.transform.localScale = character.BodyScale;
            var rootCollider = root.GetComponent<Collider>();
            var rootRenderer = root.GetComponent<Renderer>();
            Paint(rootRenderer, baseColour);

            var rootBody = root.AddComponent<Rigidbody>();
            var knockdown = root.AddComponent<ArcadeKnockdown>();
            var health = root.AddComponent<FighterHealth>();
            root.AddComponent<FighterCombat>();
            var controller = root.AddComponent<FighterController>();

            var hand = new GameObject("HandAnchor").transform;
            hand.SetParent(root.transform, false);
            hand.localPosition = new Vector3(.62f, .25f, .72f);

            var renderers = new List<Renderer> { rootRenderer };
            AddHead(root.transform, knockdown, rootBody, rootCollider, renderers, baseColour, character.AccentColour);
            AddLimb(root.transform, knockdown, rootBody, rootCollider, renderers, "ArmL", new Vector3(-.62f,.25f,.08f), new Vector3(.22f,.62f,.22f), baseColour * .92f);
            AddLimb(root.transform, knockdown, rootBody, rootCollider, renderers, "ArmR", new Vector3(.62f,.25f,.08f), new Vector3(.22f,.62f,.22f), baseColour * .92f);
            AddLimb(root.transform, knockdown, rootBody, rootCollider, renderers, "LegL", new Vector3(-.28f,-.88f,.02f), new Vector3(.25f,.55f,.25f), baseColour * .78f);
            AddLimb(root.transform, knockdown, rootBody, rootCollider, renderers, "LegR", new Vector3(.28f,-.88f,.02f), new Vector3(.25f,.55f,.25f), baseColour * .78f);
            AddAccessory(root.transform, costume.AccessoryStyle, character.AccentColour);

            health.SetVisuals(renderers.ToArray(), baseColour);
            var team = MatchRules.TeamForSlot(slot, settings.TeamMode);
            controller.Configure(slot, team, character.DisplayName, settings, hand);
            return controller;
        }

        private static void AddHead(Transform parent, ArcadeKnockdown doll, Rigidbody rootBody, Collider rootCollider, List<Renderer> renderers, Color colour, Color accent)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            go.name = "Head";
            go.transform.SetParent(parent, false);
            go.transform.localPosition = new Vector3(0f,1.02f,0f);
            go.transform.localScale = Vector3.one * .68f;
            var renderer = go.GetComponent<Renderer>();
            Paint(renderer, Color.Lerp(colour, Color.white, .22f));
            renderers.Add(renderer);
            AddFace(go.transform, accent);
            SetAsRagdollLimb(go, doll, rootBody, rootCollider, 7f, 22f, 28f);
        }

        private static void AddFace(Transform head, Color accent)
        {
            foreach (var x in new[] { -.16f, .16f })
            {
                var eye = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                eye.name = "Eye";
                eye.transform.SetParent(head, false);
                eye.transform.localPosition = new Vector3(x,.08f,.46f);
                eye.transform.localScale = Vector3.one * .11f;
                Object.Destroy(eye.GetComponent<Collider>());
                Paint(eye.GetComponent<Renderer>(), new Color(.05f,.05f,.07f));
            }
            var brow = GameObject.CreatePrimitive(PrimitiveType.Cube);
            brow.name = "AccentMark";
            brow.transform.SetParent(head,false);
            brow.transform.localPosition = new Vector3(0f,.28f,.43f);
            brow.transform.localScale = new Vector3(.36f,.05f,.05f);
            Object.Destroy(brow.GetComponent<Collider>());
            Paint(brow.GetComponent<Renderer>(), accent);
        }

        private static void AddLimb(Transform parent, ArcadeKnockdown doll, Rigidbody rootBody, Collider rootCollider, List<Renderer> renderers, string name, Vector3 localPosition, Vector3 scale, Color colour)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            go.name = name;
            go.transform.SetParent(parent, false);
            go.transform.localPosition = localPosition;
            go.transform.localScale = scale;
            var renderer = go.GetComponent<Renderer>();
            Paint(renderer, colour);
            renderers.Add(renderer);
            SetAsRagdollLimb(go, doll, rootBody, rootCollider, 5f, 35f, 45f);
        }

        private static void SetAsRagdollLimb(GameObject go, ArcadeKnockdown doll, Rigidbody rootBody, Collider rootCollider, float mass, float low, float high)
        {
            var collider = go.GetComponent<Collider>();
            Physics.IgnoreCollision(rootCollider, collider, true);
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

        private static void AddAccessory(Transform parent, int style, Color accent)
        {
            if (style == 0) return;
            PrimitiveType type = style == 5 ? PrimitiveType.Sphere : PrimitiveType.Cube;
            var go = GameObject.CreatePrimitive(type);
            go.name = "CostumeAccessory";
            go.transform.SetParent(parent,false);
            switch(style)
            {
                case 1: go.transform.localPosition=new Vector3(0f,1.25f,0f); go.transform.localScale=new Vector3(.72f,.08f,.72f); break;
                case 2: go.transform.localPosition=new Vector3(0f,-.15f,.42f); go.transform.localScale=new Vector3(.8f,.18f,.12f); break;
                case 3: go.transform.localPosition=new Vector3(.18f,1.52f,0f); go.transform.localScale=new Vector3(.3f,.46f,.3f); break;
                case 4: go.transform.localPosition=new Vector3(0f,1.03f,.61f); go.transform.localScale=new Vector3(.32f,.12f,.34f); break;
                case 5: go.transform.localPosition=new Vector3(0f,1.47f,0f); go.transform.localScale=new Vector3(.95f,.22f,.4f); break;
                case 6: go.transform.localPosition=new Vector3(0f,1.58f,0f); go.transform.localScale=new Vector3(.08f,.45f,.08f); break;
                default: go.transform.localPosition=new Vector3(0f,.12f,-.5f); go.transform.localScale=new Vector3(.9f,1.35f,.08f); break;
            }
            Object.Destroy(go.GetComponent<Collider>());
            Paint(go.GetComponent<Renderer>(), accent);
        }

        private static void Paint(Renderer renderer, Color colour)
        {
            RuntimeMaterial.Paint(renderer, colour, .22f);
        }
    }
}
