using UnityEngine;

namespace Danao.Weapons
{
    public static class WeaponFactory
    {
        public static PickupWeapon Spawn(WeaponKind kind, Vector3 position)
        {
            var definition = WeaponDefinition.For(kind);
            var root = new GameObject($"Weapon_{kind}");
            root.transform.position = position;
            var body = root.AddComponent<Rigidbody>();
            body.mass = 3f;
            var collider = root.AddComponent<BoxCollider>();
            collider.size = ColliderSize(kind);
            BuildVisual(root.transform, kind);
            var weapon = root.AddComponent<PickupWeapon>();
            weapon.Configure(definition);
            return weapon;
        }

        private static Vector3 ColliderSize(WeaponKind kind)
        {
            switch (kind)
            {
                case WeaponKind.FoldingChair: return new Vector3(.9f,1.1f,.18f);
                case WeaponKind.WrestlingTable: return new Vector3(1.7f,.25f,1f);
                case WeaponKind.BowlingBall: return Vector3.one * .65f;
                case WeaponKind.Bazooka: return new Vector3(.42f,.42f,1.45f);
                default: return new Vector3(.45f,.45f,1f);
            }
        }

        private static void BuildVisual(Transform parent, WeaponKind kind)
        {
            switch (kind)
            {
                case WeaponKind.BoxingGlove:
                    Part(parent, PrimitiveType.Sphere, new Vector3(0f,0f,.35f), new Vector3(.7f,.62f,.7f), new Color(.91f,.16f,.21f));
                    Part(parent, PrimitiveType.Cylinder, new Vector3(0f,0f,-.15f), new Vector3(.22f,.35f,.22f), new Color(.53f,.08f,.1f), Quaternion.Euler(90f,0f,0f));
                    break;
                case WeaponKind.FoldingChair:
                    Part(parent, PrimitiveType.Cube, Vector3.zero, new Vector3(.82f,.92f,.11f), new Color(.68f,.72f,.77f));
                    Part(parent, PrimitiveType.Cube, new Vector3(0f,-.55f,.24f), new Vector3(.82f,.12f,.55f), new Color(.57f,.61f,.67f));
                    break;
                case WeaponKind.FryingPan:
                    Part(parent, PrimitiveType.Cylinder, new Vector3(0f,0f,.28f), new Vector3(.55f,.09f,.55f), new Color(.18f,.19f,.22f), Quaternion.Euler(90f,0f,0f));
                    Part(parent, PrimitiveType.Cube, new Vector3(0f,0f,-.42f), new Vector3(.16f,.15f,.8f), new Color(.22f,.23f,.26f));
                    break;
                case WeaponKind.NoveltyFloppy:
                    Part(parent, PrimitiveType.Capsule, new Vector3(0f,0f,.12f), new Vector3(.26f,.55f,.26f), new Color(.94f,.36f,.66f), Quaternion.Euler(90f,0f,0f));
                    Part(parent, PrimitiveType.Sphere, new Vector3(0f,0f,.75f), Vector3.one * .34f, new Color(.98f,.46f,.71f));
                    Part(parent, PrimitiveType.Sphere, new Vector3(-.18f,0f,-.43f), Vector3.one * .28f, new Color(.88f,.29f,.58f));
                    Part(parent, PrimitiveType.Sphere, new Vector3(.18f,0f,-.43f), Vector3.one * .28f, new Color(.88f,.29f,.58f));
                    break;
                case WeaponKind.FoamBlaster:
                    Part(parent, PrimitiveType.Cube, Vector3.zero, new Vector3(.42f,.44f,1.05f), new Color(.24f,.69f,.94f));
                    Part(parent, PrimitiveType.Cylinder, new Vector3(0f,0f,.72f), new Vector3(.12f,.32f,.12f), new Color(.97f,.72f,.18f), Quaternion.Euler(90f,0f,0f));
                    break;
                case WeaponKind.Bazooka:
                    Part(parent, PrimitiveType.Cylinder, Vector3.zero, new Vector3(.28f,.82f,.28f), new Color(.27f,.61f,.35f), Quaternion.Euler(90f,0f,0f));
                    Part(parent, PrimitiveType.Cylinder, new Vector3(0f,0f,.75f), new Vector3(.38f,.12f,.38f), new Color(.17f,.36f,.22f), Quaternion.Euler(90f,0f,0f));
                    break;
                case WeaponKind.BowlingBall:
                    Part(parent, PrimitiveType.Sphere, Vector3.zero, Vector3.one * .65f, new Color(.24f,.18f,.55f));
                    break;
                case WeaponKind.WrestlingTable:
                    Part(parent, PrimitiveType.Cube, Vector3.zero, new Vector3(1.65f,.18f,.95f), new Color(.57f,.31f,.17f));
                    Part(parent, PrimitiveType.Cube, new Vector3(-.6f,-.38f,0f), new Vector3(.12f,.68f,.12f), new Color(.31f,.22f,.19f));
                    Part(parent, PrimitiveType.Cube, new Vector3(.6f,-.38f,0f), new Vector3(.12f,.68f,.12f), new Color(.31f,.22f,.19f));
                    break;
            }
        }

        private static void Part(Transform parent, PrimitiveType type, Vector3 localPosition, Vector3 localScale, Color colour, Quaternion? rotation = null)
        {
            var go = GameObject.CreatePrimitive(type);
            go.transform.SetParent(parent, false);
            go.transform.localPosition = localPosition;
            go.transform.localRotation = rotation ?? Quaternion.identity;
            go.transform.localScale = localScale;
            Object.Destroy(go.GetComponent<Collider>());
            var shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            go.GetComponent<Renderer>().material = new Material(shader) { color = colour };
        }
    }
}
