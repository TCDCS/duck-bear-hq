using Danao.Core;
using UnityEngine;

namespace Danao.Weapons
{
    public static class WeaponFactory
    {
        private static readonly Color[] Palette =
        {
            new Color(.93f,.23f,.26f), new Color(.24f,.68f,.94f), new Color(.98f,.71f,.18f), new Color(.47f,.79f,.42f),
            new Color(.72f,.43f,.87f), new Color(.95f,.45f,.66f), new Color(.24f,.76f,.72f), new Color(.78f,.52f,.29f)
        };

        public static PickupWeapon Spawn(WeaponKind kind, Vector3 position)
        {
            var definition = WeaponDefinition.For(kind);
            var root = new GameObject($"Weapon_{kind}");
            root.transform.position = position;
            var body = root.AddComponent<Rigidbody>();
            body.mass = definition.Heavy ? 9f : 3f;
            var collider = root.AddComponent<BoxCollider>();
            collider.size = ColliderSize(kind, definition);
            BuildVisual(root.transform, kind, definition);
            var weapon = root.AddComponent<PickupWeapon>();
            weapon.Configure(definition);
            return weapon;
        }

        private static Vector3 ColliderSize(WeaponKind kind, WeaponDefinition d)
        {
            if (kind == WeaponKind.WrestlingTable) return new Vector3(1.7f,.25f,1f);
            if (kind == WeaponKind.BowlingBall || kind == WeaponKind.GiantMango) return Vector3.one * .7f;
            if (kind == WeaponKind.Anvil || kind == WeaponKind.Bin || kind == WeaponKind.ToyCrate) return new Vector3(.9f,.8f,.9f);
            if (kind == WeaponKind.FoldingChair) return new Vector3(.9f,1.1f,.18f);
            if (d.Ranged) return new Vector3(.46f,.46f,1.25f);
            if (d.Heavy) return new Vector3(.7f,.65f,.85f);
            return new Vector3(.45f,.45f,1f);
        }

        private static void BuildVisual(Transform parent, WeaponKind kind, WeaponDefinition d)
        {
            var colour = Palette[(int)kind % Palette.Length];
            switch (kind)
            {
                case WeaponKind.BoxingGlove:
                case WeaponKind.SpringBoxingGlove:
                    Part(parent,PrimitiveType.Sphere,new Vector3(0f,0f,.35f),new Vector3(.7f,.62f,.7f),new Color(.91f,.16f,.21f));
                    Part(parent,PrimitiveType.Cylinder,new Vector3(0f,0f,-.18f),new Vector3(.22f,.38f,.22f),new Color(.53f,.08f,.1f),Quaternion.Euler(90f,0f,0f));
                    if(kind==WeaponKind.SpringBoxingGlove) Part(parent,PrimitiveType.Cylinder,new Vector3(0f,0f,-.62f),new Vector3(.09f,.45f,.09f),Color.gray,Quaternion.Euler(90f,0f,0f));
                    break;
                case WeaponKind.FoldingChair:
                    Part(parent,PrimitiveType.Cube,Vector3.zero,new Vector3(.82f,.92f,.11f),new Color(.68f,.72f,.77f));
                    Part(parent,PrimitiveType.Cube,new Vector3(0f,-.55f,.24f),new Vector3(.82f,.12f,.55f),new Color(.57f,.61f,.67f));
                    break;
                case WeaponKind.FryingPan:
                    Part(parent,PrimitiveType.Cylinder,new Vector3(0f,0f,.28f),new Vector3(.55f,.09f,.55f),new Color(.18f,.19f,.22f),Quaternion.Euler(90f,0f,0f));
                    Part(parent,PrimitiveType.Cube,new Vector3(0f,0f,-.42f),new Vector3(.16f,.15f,.8f),new Color(.22f,.23f,.26f));
                    break;
                case WeaponKind.NoveltyFloppy:
                    Part(parent,PrimitiveType.Capsule,new Vector3(0f,0f,.12f),new Vector3(.26f,.55f,.26f),new Color(.94f,.36f,.66f),Quaternion.Euler(90f,0f,0f));
                    Part(parent,PrimitiveType.Sphere,new Vector3(0f,0f,.75f),Vector3.one*.34f,new Color(.98f,.46f,.71f));
                    Part(parent,PrimitiveType.Sphere,new Vector3(-.18f,0f,-.43f),Vector3.one*.28f,new Color(.88f,.29f,.58f));
                    Part(parent,PrimitiveType.Sphere,new Vector3(.18f,0f,-.43f),Vector3.one*.28f,new Color(.88f,.29f,.58f));
                    break;
                case WeaponKind.BowlingBall:
                    Part(parent,PrimitiveType.Sphere,Vector3.zero,Vector3.one*.68f,new Color(.24f,.18f,.55f)); break;
                case WeaponKind.GiantMango:
                    Part(parent,PrimitiveType.Sphere,Vector3.zero,new Vector3(.78f,.92f,.7f),new Color(1f,.57f,.12f));
                    Part(parent,PrimitiveType.Cube,new Vector3(.18f,.64f,0f),new Vector3(.12f,.28f,.12f),new Color(.26f,.5f,.22f)); break;
                case WeaponKind.WrestlingTable:
                    Part(parent,PrimitiveType.Cube,Vector3.zero,new Vector3(1.65f,.18f,.95f),new Color(.57f,.31f,.17f));
                    Part(parent,PrimitiveType.Cube,new Vector3(-.6f,-.38f,0f),new Vector3(.12f,.68f,.12f),new Color(.31f,.22f,.19f));
                    Part(parent,PrimitiveType.Cube,new Vector3(.6f,-.38f,0f),new Vector3(.12f,.68f,.12f),new Color(.31f,.22f,.19f)); break;
                case WeaponKind.Anvil:
                    Part(parent,PrimitiveType.Cube,new Vector3(0f,-.1f,0f),new Vector3(.8f,.55f,.75f),new Color(.28f,.3f,.34f));
                    Part(parent,PrimitiveType.Cube,new Vector3(.22f,.32f,0f),new Vector3(1.25f,.22f,.68f),new Color(.35f,.37f,.4f)); break;
                case WeaponKind.SillySausage:
                case WeaponKind.RubberChicken:
                case WeaponKind.PoolNoodle:
                case WeaponKind.Baguette:
                case WeaponKind.GiantFish:
                case WeaponKind.Mop:
                case WeaponKind.Umbrella:
                case WeaponKind.ToyGuitar:
                case WeaponKind.InflatableHammer:
                    Part(parent,PrimitiveType.Capsule,Vector3.zero,new Vector3(.22f,.65f,.22f),colour,Quaternion.Euler(90f,0f,0f));
                    Part(parent,PrimitiveType.Sphere,new Vector3(0f,0f,.7f),Vector3.one*.42f,Color.Lerp(colour,Color.white,.12f)); break;
                default:
                    if(d.Ranged)
                    {
                        Part(parent,PrimitiveType.Cube,Vector3.zero,new Vector3(.46f,.42f,.95f),colour);
                        Part(parent,PrimitiveType.Cylinder,new Vector3(0f,0f,.66f),new Vector3(.12f,.28f,.12f),Color.Lerp(colour,Color.white,.24f),Quaternion.Euler(90f,0f,0f));
                    }
                    else if(d.Heavy)
                    {
                        Part(parent,kind==WeaponKind.Kettle||kind==WeaponKind.Cushion?PrimitiveType.Sphere:PrimitiveType.Cube,Vector3.zero,new Vector3(.72f,.65f,.72f),colour);
                    }
                    else
                    {
                        Part(parent,PrimitiveType.Capsule,Vector3.zero,new Vector3(.25f,.62f,.25f),colour,Quaternion.Euler(90f,0f,0f));
                    }
                    break;
            }
        }

        private static void Part(Transform parent,PrimitiveType type,Vector3 localPosition,Vector3 localScale,Color colour,Quaternion? rotation=null)
        {
            var go=GameObject.CreatePrimitive(type); go.transform.SetParent(parent,false); go.transform.localPosition=localPosition; go.transform.localRotation=rotation??Quaternion.identity; go.transform.localScale=localScale;
            Object.Destroy(go.GetComponent<Collider>()); RuntimeMaterial.Paint(go.GetComponent<Renderer>(), colour);
        }
    }
}
