using System.Collections.Generic;
using Danao.Arenas;
using Danao.Audio;
using Danao.CameraSystem;
using Danao.Core;
using Danao.Fighters;
using Danao.Input;
using Danao.UI;
using UnityEngine;

namespace Danao
{
    public sealed class DanaoGame : MonoBehaviour
    {
        private readonly List<FighterController> _fighters = new List<FighterController>();
        private GameObject _worldRoot;
        private GameObject _menuBackdrop;
        private LocalInputHub _input;
        private ProceduralAudio _audio;
        private ArcadeUi _ui;
        private LocalMatch _match;
        private ArenaRuntime _arena;
        private LocalMatchConfig _config;
        private SharedArenaCamera _arenaCamera;

        public static DanaoGame Instance { get; private set; }
        public LocalInputHub InputHub => _input;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            DontDestroyOnLoad(gameObject);
            Application.targetFrameRate = 60;
            Time.fixedDeltaTime = 1f / 60f;

            _input = gameObject.AddComponent<LocalInputHub>();
            _audio = gameObject.AddComponent<ProceduralAudio>();
            _ui = gameObject.AddComponent<ArcadeUi>();
            _ui.Configure(this);
            BuildMenuBackdrop();
            _audio.PlayTitleMusic();
        }

        private void Update()
        {
            if (_match == null) return;
            for (var i = 0; i < _fighters.Count; i++)
            {
                var input = _input.ReadSlot(i);
                if (input.Pause)
                {
                    ReturnToMenu();
                    _ui.ShowTitle();
                    return;
                }
                _fighters[i].TickInput(input);
            }
            _match.Tick();
            _ui.RefreshHud(_config.Settings, _match.ObjectiveHudText);
        }

        public void StartLocalMatch(LocalMatchConfig config)
        {
            DestroyRuntimeWorld();
            _config = config;
            _worldRoot = new GameObject("DanaoLocalMatch");
            _arena = ArenaBuilder.Build(config.Arena, _worldRoot.transform, config.Settings);
            _fighters.Clear();
            for (var i = 0; i < config.PlayerCount; i++)
            {
                var loadout = config.Loadouts != null && i < config.Loadouts.Length ? config.Loadouts[i] : new PlayerLoadout((CharacterId)(i % CharacterCatalog.All.Count), CostumeId.Arcade);
                var fighter = FighterFactory.Create(i, loadout, _arena.SpawnPoints[i], config.Settings);
                fighter.transform.SetParent(_worldRoot.transform, true);
                _fighters.Add(fighter);
            }

            var cameraGo = new GameObject("SharedArenaCamera");
            cameraGo.transform.SetParent(_worldRoot.transform, false);
            _arenaCamera = cameraGo.AddComponent<SharedArenaCamera>();
            _arenaCamera.Configure(_fighters);

            _match = new LocalMatch(_fighters, _arena, config);
            _match.MatchFinished += OnMatchFinished;
            _ui.ShowFight(_fighters, config.Settings);
            _audio.PlayFightMusic();
            _audio.Play(SfxId.RoundStart);
        }

        private void OnMatchFinished(string result)
        {
            _audio.Play(SfxId.Victory);
            _ui.ShowResult(result);
        }

        public void Rematch()
        {
            if (_match == null) return;
            _match.ResetRound();
            _ui.ShowFight(_fighters, _config.Settings);
            _audio.PlayFightMusic();
            _audio.Play(SfxId.RoundStart);
        }

        public void ReturnToMenu()
        {
            DestroyRuntimeWorld();
            BuildMenuBackdrop();
            _audio.PlayTitleMusic();
        }

        private void DestroyRuntimeWorld()
        {
            if (_match != null) _match.MatchFinished -= OnMatchFinished;
            _match = null;
            _arena = null;
            _config = null;
            _fighters.Clear();
            if (_worldRoot != null) Destroy(_worldRoot);
            _worldRoot = null;
            if (_menuBackdrop != null) Destroy(_menuBackdrop);
            _menuBackdrop = null;
        }

        private void BuildMenuBackdrop()
        {
            if (_menuBackdrop != null) return;
            _menuBackdrop = new GameObject("MenuBackdrop");
            var floor = GameObject.CreatePrimitive(PrimitiveType.Cube);
            floor.name = "BackdropFloor";
            floor.transform.SetParent(_menuBackdrop.transform, false);
            floor.transform.position = new Vector3(0f,-1f,0f);
            floor.transform.localScale = new Vector3(28f,.5f,22f);
            var shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            floor.GetComponent<Renderer>().material = new Material(shader) { color = new Color(.055f,.04f,.09f) };

            var light = new GameObject("BackdropLight").AddComponent<Light>();
            light.transform.SetParent(_menuBackdrop.transform, false);
            light.type = LightType.Directional;
            light.transform.rotation = Quaternion.Euler(48f,-32f,0f);
            light.intensity = 1.35f;
            light.color = new Color(1f,.75f,.52f);

            var cameraGo = new GameObject("MenuCamera");
            cameraGo.transform.SetParent(_menuBackdrop.transform, false);
            cameraGo.transform.position = new Vector3(0f,7f,-16f);
            cameraGo.transform.rotation = Quaternion.Euler(20f,0f,0f);
            var camera = cameraGo.AddComponent<Camera>();
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(.025f,.018f,.05f);
            camera.fieldOfView = 48f;
        }
    }
}
