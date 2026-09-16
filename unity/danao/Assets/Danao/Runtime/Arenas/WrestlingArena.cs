using System.Collections.Generic;
using Danao.Core;
using Danao.Fighters;
using Danao.Weapons;
using UnityEngine;

namespace Danao.Arenas
{
    public sealed class ArenaRuntime
    {
        public GameObject Root;
        public readonly List<Vector3> SpawnPoints = new List<Vector3>();
        public readonly List<Vector3> WeaponSpawns = new List<Vector3>();
        public readonly List<PickupWeapon> Weapons = new List<PickupWeapon>();
        public Bounds RingBounds;
        public float RingFloorY;
        public MatchSettings Settings;

        public void ClearWeapons()
        {
            foreach (var weapon in Weapons)
                if (weapon != null) Object.Destroy(weapon.gameObject);
            Weapons.Clear();
        }
    }

    public static class WrestlingArena
    {
        private static readonly WeaponKind[] SliceWeapons =
        {
            WeaponKind.BoxingGlove, WeaponKind.FoldingChair, WeaponKind.FryingPan, WeaponKind.NoveltyFloppy,
            WeaponKind.FoamBlaster, WeaponKind.Bazooka, WeaponKind.BowlingBall, WeaponKind.WrestlingTable
        };

        public static ArenaRuntime Build(Transform parent, MatchSettings settings)
        {
            var runtime = new ArenaRuntime { Settings = settings };
            var root = new GameObject("WrestlingArena");
            root.transform.SetParent(parent, false);
            runtime.Root = root;
            runtime.RingFloorY = 1.25f;
            runtime.RingBounds = new Bounds(new Vector3(0f, runtime.RingFloorY, 0f), new Vector3(11.6f, 3f, 11.6f));

            CreateBox(root.transform, "RingsideFloor", new Vector3(0f,-.3f,0f), new Vector3(24f,.6f,20f), new Color(.09f,.1f,.14f));
            CreateBox(root.transform, "RingBase", new Vector3(0f,.55f,0f), new Vector3(12.6f,1.1f,12.6f), new Color(.14f,.16f,.22f));
            CreateBox(root.transform, "RingMat", new Vector3(0f,1.12f,0f), new Vector3(11.8f,.18f,11.8f), new Color(.88f,.88f,.91f));

            var postColour = new Color(.1f,.12f,.17f);
            foreach (var x in new[] { -5.8f, 5.8f })
            foreach (var z in new[] { -5.8f, 5.8f })
                CreateBox(root.transform, "RingPost", new Vector3(x,2.15f,z), new Vector3(.34f,2.5f,.34f), postColour);

            BuildRopes(root.transform, settings);
            BuildSteps(root.transform);
            BuildTurnbuckles(root.transform);
            BuildLights(root.transform);

            runtime.SpawnPoints.Add(new Vector3(-2.8f,2.2f,-2.5f));
            runtime.SpawnPoints.Add(new Vector3(2.8f,2.2f,2.5f));
            runtime.SpawnPoints.Add(new Vector3(-2.8f,2.2f,2.5f));
            runtime.SpawnPoints.Add(new Vector3(2.8f,2.2f,-2.5f));
            runtime.WeaponSpawns.AddRange(new[]
            {
                new Vector3(-4.4f,2f,0f), new Vector3(4.4f,2f,0f), new Vector3(0f,2f,-4.4f), new Vector3(0f,2f,4.4f),
                new Vector3(-7.5f,.8f,-3.5f), new Vector3(7.5f,.8f,3.5f), new Vector3(-7.5f,.8f,3.5f), new Vector3(7.5f,.8f,-3.5f)
            });
            SpawnWeapons(runtime);
            return runtime;
        }

        public static void SpawnWeapons(ArenaRuntime runtime)
        {
            runtime.ClearWeapons();
            for (var i = 0; i < runtime.WeaponSpawns.Count && i < SliceWeapons.Length; i++)
                runtime.Weapons.Add(WeaponFactory.Spawn(SliceWeapons[i], runtime.WeaponSpawns[i]));
        }

        private static void BuildRopes(Transform root, MatchSettings settings)
        {
            var ropeColour = new Color(.92f,.16f,.22f);
            foreach (var y in new[] { 1.65f, 2.15f, 2.65f })
            {
                Rope(root, new Vector3(0f,y,-5.65f), new Vector3(11.2f,.09f,.09f), Vector3.forward, settings, ropeColour);
                Rope(root, new Vector3(0f,y,5.65f), new Vector3(11.2f,.09f,.09f), Vector3.back, settings, ropeColour);
                Rope(root, new Vector3(-5.65f,y,0f), new Vector3(.09f,.09f,11.2f), Vector3.right, settings, ropeColour);
                Rope(root, new Vector3(5.65f,y,0f), new Vector3(.09f,.09f,11.2f), Vector3.left, settings, ropeColour);
            }
        }

        private static void Rope(Transform root, Vector3 position, Vector3 scale, Vector3 inward, MatchSettings settings, Color colour)
        {
            var rope = CreateBox(root, "ElasticRope", position, scale, colour);
            rope.GetComponent<Collider>().isTrigger = true;
            rope.AddComponent<RopeBouncer>().Configure(inward, settings);
        }

        private static void BuildSteps(Transform root)
        {
            var colour = new Color(.42f,.44f,.5f);
            for (var i = 0; i < 3; i++)
                CreateBox(root, "SteelStep", new Vector3(7.25f,.15f + i * .22f,-4f), new Vector3(1.4f,.3f + i * .12f,1.6f - i * .18f), colour);
        }

        private static void BuildTurnbuckles(Transform root)
        {
            var colour = new Color(.15f,.43f,.84f);
            foreach (var x in new[] { -5.45f, 5.45f })
            foreach (var z in new[] { -5.45f, 5.45f })
                CreateBox(root, "Turnbuckle", new Vector3(x,2.15f,z), new Vector3(.52f,.72f,.52f), colour);
        }

        private static void BuildLights(Transform root)
        {
            var key = new GameObject("ArenaKeyLight").AddComponent<Light>();
            key.transform.SetParent(root, false);
            key.transform.position = new Vector3(-4f,10f,-6f);
            key.transform.rotation = Quaternion.Euler(48f,28f,0f);
            key.type = LightType.Directional;
            key.intensity = 1.45f;
            key.color = new Color(1f,.92f,.82f);

            var fill = new GameObject("ArenaFillLight").AddComponent<Light>();
            fill.transform.SetParent(root, false);
            fill.transform.position = new Vector3(4f,8f,5f);
            fill.type = LightType.Point;
            fill.range = 20f;
            fill.intensity = 10f;
            fill.color = new Color(.32f,.45f,1f);
        }

        private static GameObject CreateBox(Transform parent, string name, Vector3 position, Vector3 scale, Color colour)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = name;
            go.transform.SetParent(parent, false);
            go.transform.localPosition = position;
            go.transform.localScale = scale;
            var shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            go.GetComponent<Renderer>().material = new Material(shader) { color = colour };
            return go;
        }
    }

    public sealed class RopeBouncer : MonoBehaviour
    {
        private Vector3 _inward;
        private MatchSettings _settings;
        private float _next;

        public void Configure(Vector3 inward, MatchSettings settings)
        {
            _inward = inward;
            _settings = settings;
        }

        private void OnTriggerEnter(Collider other)
        {
            if (_settings == null || !_settings.ArenaHazards || Time.time < _next) return;
            var fighter = other.GetComponentInParent<FighterController>();
            if (fighter == null || fighter.Health.IsEliminated) return;
            _next = Time.time + .16f;
            fighter.Body.AddForce((_inward + Vector3.up * .16f).normalized * 5.5f, ForceMode.VelocityChange);
        }
    }
}
