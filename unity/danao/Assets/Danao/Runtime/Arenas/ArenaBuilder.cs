using Danao.Core;
using Danao.Weapons;
using UnityEngine;

namespace Danao.Arenas
{
    public static class ArenaBuilder
    {
        public static ArenaRuntime Build(ArenaId id, Transform parent, MatchSettings settings)
        {
            if (id == ArenaId.WrestlingArena) return WrestlingArena.Build(parent, settings);
            var definition = ArenaCatalog.For(id);
            var runtime = new ArenaRuntime { Settings = settings };
            var root = new GameObject(definition.DisplayName.Replace(" ", string.Empty));
            root.transform.SetParent(parent, false);
            runtime.Root = root;
            runtime.RingFloorY = .5f;
            runtime.RingBounds = new Bounds(new Vector3(0f,.5f,0f), new Vector3(definition.Size.x, 3f, definition.Size.y));

            CreateBox(root.transform, "ArenaFloor", new Vector3(0f,0f,0f), new Vector3(definition.Size.x,.8f,definition.Size.y), definition.Primary);
            CreateBoundary(root.transform, definition);
            BuildTheme(root.transform, definition);
            BuildLights(root.transform, definition);

            var x = definition.Size.x * .28f;
            var z = definition.Size.y * .28f;
            runtime.SpawnPoints.Add(new Vector3(-x,1.55f,-z));
            runtime.SpawnPoints.Add(new Vector3(x,1.55f,z));
            runtime.SpawnPoints.Add(new Vector3(-x,1.55f,z));
            runtime.SpawnPoints.Add(new Vector3(x,1.55f,-z));

            runtime.WeaponSpawns.AddRange(new[]
            {
                new Vector3(-x,.95f,0f), new Vector3(x,.95f,0f), new Vector3(0f,.95f,-z), new Vector3(0f,.95f,z),
                new Vector3(-x*.65f,.95f,-z*.65f), new Vector3(x*.65f,.95f,z*.65f), new Vector3(-x*.65f,.95f,z*.65f), new Vector3(x*.65f,.95f,-z*.65f)
            });
            SpawnWeapons(runtime, definition);
            root.AddComponent<ArenaHazardController>().Configure(definition, settings, runtime);
            return runtime;
        }

        public static void SpawnWeapons(ArenaRuntime runtime, ArenaDefinition definition)
        {
            runtime.ClearWeapons();
            for (var i = 0; i < runtime.WeaponSpawns.Count; i++)
            {
                var kind = definition.WeaponPool[i % definition.WeaponPool.Length];
                runtime.Weapons.Add(WeaponFactory.Spawn(kind, runtime.WeaponSpawns[i]));
            }
        }

        private static void CreateBoundary(Transform root, ArenaDefinition definition)
        {
            var halfX = definition.Size.x * .5f;
            var halfZ = definition.Size.y * .5f;
            var wall = Color.Lerp(definition.Primary, Color.black, .35f);
            CreateBox(root, "NorthRail", new Vector3(0f,1f,halfZ), new Vector3(definition.Size.x,.8f,.35f), wall);
            CreateBox(root, "SouthRail", new Vector3(0f,1f,-halfZ), new Vector3(definition.Size.x,.8f,.35f), wall);
            CreateBox(root, "EastRail", new Vector3(halfX,1f,0f), new Vector3(.35f,.8f,definition.Size.y), wall);
            CreateBox(root, "WestRail", new Vector3(-halfX,1f,0f), new Vector3(.35f,.8f,definition.Size.y), wall);
        }

        private static void BuildTheme(Transform root, ArenaDefinition d)
        {
            switch (d.Id)
            {
                case ArenaId.DublinDocks:
                    CreateBox(root,"ContainerA",new Vector3(-6f,1.1f,4.6f),new Vector3(3.2f,2.1f,1.6f),d.Secondary);
                    CreateBox(root,"ContainerB",new Vector3(5.8f,1.1f,-4.6f),new Vector3(3.5f,2.1f,1.6f),Color.Lerp(d.Secondary,Color.red,.25f));
                    CreateBox(root,"CraneTower",new Vector3(0f,3.8f,6f),new Vector3(.7f,7f,.7f),Color.gray);
                    break;
                case ArenaId.LondonUnderground:
                    CreateBox(root,"PlatformStripe",new Vector3(0f,.46f,0f),new Vector3(d.Size.x*.85f,.08f,1.3f),d.Secondary);
                    CreateBox(root,"Roundel",new Vector3(0f,2.4f,6.1f),new Vector3(3f,1.2f,.2f),new Color(.1f,.32f,.7f));
                    break;
                case ArenaId.MangoMarket:
                    for(var i=-2;i<=2;i+=2) CreateBox(root,"MarketStall",new Vector3(i*2.5f,1.1f,5.2f),new Vector3(2.8f,2f,1.4f),i==0?d.Secondary:Color.Lerp(d.Secondary,Color.white,.2f));
                    break;
                case ArenaId.TempleCourtyard:
                    for(var i=-1;i<=1;i+=2){ CreateCylinder(root,"TemplePillar",new Vector3(i*6f,2.1f,4.5f),new Vector3(.8f,2.1f,.8f),d.Secondary); CreateCylinder(root,"TemplePillar",new Vector3(i*6f,2.1f,-4.5f),new Vector3(.8f,2.1f,.8f),d.Secondary); }
                    break;
                case ArenaId.SichuanTeaHouse:
                    CreateBox(root,"TeaCounter",new Vector3(0f,1.1f,5.4f),new Vector3(7f,1.7f,1.2f),d.Secondary);
                    CreateBox(root,"ScreenA",new Vector3(-5f,1.6f,0f),new Vector3(.3f,2.8f,4f),new Color(.8f,.72f,.55f));
                    break;
                case ArenaId.IceFestival:
                    for(var i=-2;i<=2;i++) CreateBox(root,"IceBlock",new Vector3(i*2.4f,.9f,5.2f),new Vector3(1.6f,1.4f,1.4f),Color.Lerp(d.Secondary,Color.cyan,.18f));
                    break;
                case ArenaId.HouseParty:
                    CreateBox(root,"Sofa",new Vector3(-5.5f,1f,4.8f),new Vector3(4f,1.5f,1.6f),new Color(.3f,.55f,.65f));
                    CreateBox(root,"PartyTable",new Vector3(3.5f,.8f,4.8f),new Vector3(3.2f,.25f,1.8f),d.Secondary);
                    break;
                case ArenaId.ToyFactory:
                    CreateBox(root,"Conveyor",new Vector3(0f,.65f,0f),new Vector3(10f,.35f,2.4f),new Color(.18f,.2f,.25f));
                    for(var i=-2;i<=2;i+=2) CreateBox(root,"ToyCrateScenery",new Vector3(i*3f,1f,5f),new Vector3(1.6f,1.6f,1.6f),d.Secondary);
                    break;
                case ArenaId.CruiseShip:
                    CreateBox(root,"Pool",new Vector3(0f,.45f,4.2f),new Vector3(6f,.12f,3f),new Color(.18f,.67f,.87f));
                    CreateBox(root,"Bar",new Vector3(-5f,1f,-4.8f),new Vector3(4f,1.5f,1.3f),d.Secondary);
                    break;
                case ArenaId.MadCircus:
                    for(var i=0;i<6;i++){ var a=i*Mathf.PI*2f/6f; CreateCylinder(root,"TentPole",new Vector3(Mathf.Cos(a)*6f,2.2f,Mathf.Sin(a)*5f),new Vector3(.3f,2.2f,.3f),i%2==0?d.Primary:d.Secondary); }
                    CreateCylinder(root,"Trampoline",new Vector3(0f,.62f,0f),new Vector3(2.2f,.18f,2.2f),new Color(.16f,.16f,.2f));
                    break;
            }
        }

        private static void BuildLights(Transform root, ArenaDefinition d)
        {
            var key = new GameObject("ArenaKeyLight").AddComponent<Light>();
            key.transform.SetParent(root,false);
            key.type = LightType.Directional;
            key.transform.rotation = Quaternion.Euler(52f,-28f,0f);
            key.intensity = 1.35f;
            key.color = Color.Lerp(Color.white,d.Secondary,.18f);
            var fill = new GameObject("ArenaFillLight").AddComponent<Light>();
            fill.transform.SetParent(root,false);
            fill.type = LightType.Point;
            fill.transform.position = new Vector3(0f,8f,0f);
            fill.range = 24f;
            fill.intensity = 7f;
            fill.color = Color.Lerp(d.Primary,Color.white,.35f);
        }

        internal static GameObject CreateBox(Transform parent,string name,Vector3 position,Vector3 scale,Color colour)
        {
            var go=GameObject.CreatePrimitive(PrimitiveType.Cube); go.name=name; go.transform.SetParent(parent,false); go.transform.localPosition=position; go.transform.localScale=scale; Paint(go,colour); return go;
        }

        internal static GameObject CreateCylinder(Transform parent,string name,Vector3 position,Vector3 scale,Color colour)
        {
            var go=GameObject.CreatePrimitive(PrimitiveType.Cylinder); go.name=name; go.transform.SetParent(parent,false); go.transform.localPosition=position; go.transform.localScale=scale; Paint(go,colour); return go;
        }

        internal static void Paint(GameObject go,Color colour)
        {
            RuntimeMaterial.Paint(go.GetComponent<Renderer>(), colour);
        }
    }
}
