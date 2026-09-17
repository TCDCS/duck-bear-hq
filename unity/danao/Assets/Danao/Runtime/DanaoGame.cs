using System;
using System.Collections.Generic;
using Danao.Arenas;
using Danao.Audio;
using Danao.CameraSystem;
using Danao.Core;
using Danao.Fighters;
using Danao.Input;
using Danao.Online;
using Danao.Save;
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
        private DanaoRoomClient _roomClient;
        private DanaoSaveService _saveService;
        private NetworkMatchBridge _networkBridge;
        private LocalMatch _match;
        private ArenaRuntime _arena;
        private LocalMatchConfig _config;
        private SharedArenaCamera _arenaCamera;
        private bool _onlineMatch;
        private int _onlineMatchId = -1;

        public static DanaoGame Instance { get; private set; }
        public LocalInputHub InputHub => _input;
        public DanaoRoomClient RoomClient => _roomClient;
        public DanaoSaveService SaveService => _saveService;
        public bool OnlineMatchActive => _onlineMatch;

        private void Awake()
        {
            DanaoBootDebug.Mark("awake-start");
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);
            Application.targetFrameRate = 60;
            Time.fixedDeltaTime = 1f / 60f;
            _input = gameObject.AddComponent<LocalInputHub>();
            DanaoBootDebug.Mark("input-ready");
            DanaoBootDebug.Mark("audio-start");
            _audio = gameObject.AddComponent<ProceduralAudio>();
            DanaoBootDebug.Mark("audio-ready");
            _roomClient = gameObject.AddComponent<DanaoRoomClient>();
            DanaoBootDebug.Mark("room-ready");
            _saveService = gameObject.AddComponent<DanaoSaveService>();
            DanaoBootDebug.Mark("save-ready");
            _roomClient.RoomChanged += OnOnlineRoomChanged;
            _roomClient.ResultReceived += OnOnlineResult;
            DanaoBootDebug.Mark("ui-start");
            _ui = gameObject.AddComponent<ArcadeUi>();
            _ui.Configure(this);
            DanaoBootDebug.Mark("ui-ready");
            BuildMenuBackdrop();
            DanaoBootDebug.Mark("backdrop-ready");
            _audio.PlayTitleMusic();
            DanaoBootDebug.Mark("music-ready");
            _saveService.SyncCloud();
            DanaoBootDebug.Mark("cloud-sync-started");
            DanaoBootDebug.Mark("awake-complete");
        }

        private void Update()
        {
            if (_match == null) return;
            if (_onlineMatch)
            {
                var input = _input.ReadSlot(0);
                if (input.Pause) { LeaveOnlineRoom(); _ui.ShowTitle(); return; }
                _networkBridge?.TickLocalInput(input);
                if (_networkBridge != null && _networkBridge.IsHost) _match.Tick();
                _networkBridge?.SetMatchStatus(_match.Finished ? "results" : "fight", _match.ObjectiveHudText);
                _ui.RefreshHud(_config.Settings, _match.ObjectiveHudText);
                return;
            }
            for (var i = 0; i < _fighters.Count; i++)
            {
                var input = _input.ReadSlot(i);
                if (input.Pause) { ReturnToMenu(); _ui.ShowTitle(); return; }
                _fighters[i].TickInput(input);
            }
            _match.Tick();
            _ui.RefreshHud(_config.Settings, _match.ObjectiveHudText);
        }

        public void StartLocalMatch(LocalMatchConfig config)
        {
            if (config == null) return;
            _saveService?.CaptureMatch(config);
            DestroyRuntimeWorld();
            _onlineMatch = false;
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
            FinishWorldSetup(config);
        }

        public void StartOnlineMatch(RoomDto room)
        {
            if (room == null || room.players == null || room.players.Length < 2) return;
            if (_onlineMatch && _onlineMatchId == room.matchId) return;
            _saveService?.CaptureOnlineRoom(room, _roomClient.PlayerId);
            DestroyRuntimeWorld();
            _onlineMatch = true;
            _onlineMatchId = room.matchId;
            var mode = ParseMode(room.settings?.mode);
            var arenaId = ParseArena(room.settings?.arena);
            var playerCount = Mathf.Clamp(room.players.Length, 2, 4);
            var settings = new MatchSettings
            {
                ActivePlayers = playerCount,
                HealthDamage = room.settings == null || room.settings.healthDamage,
                VisibleBruising = room.settings == null || room.settings.visibleBruising,
                ArenaHazards = room.settings == null || room.settings.arenaHazards,
                FriendlyFire = room.settings != null && room.settings.friendlyFire,
                TeamMode = mode == LocalMode.TwoVsTwo,
                RingOut = mode == LocalMode.RoyalRumble || (room.settings != null && !room.settings.healthDamage)
            };
            var loadouts = new PlayerLoadout[4];
            for (var i = 0; i < loadouts.Length; i++) loadouts[i] = new PlayerLoadout(CharacterId.Hero, CostumeId.Arcade);
            _config = new LocalMatchConfig { Mode=mode, Arena=arenaId, Settings=settings, Loadouts=loadouts };
            _worldRoot = new GameObject("DanaoOnlineMatch");
            _arena = ArenaBuilder.Build(arenaId, _worldRoot.transform, settings);
            _fighters.Clear();
            for (var i = 0; i < playerCount; i++)
            {
                var p = room.players[i];
                if (p.id < 0 || p.id >= _arena.SpawnPoints.Count) continue;
                var fighter = FighterFactory.Create(p.id, new PlayerLoadout(ParseCharacter(p.character),ParseCostume(p.costume)), _arena.SpawnPoints[p.id], settings);
                fighter.transform.SetParent(_worldRoot.transform, true);
                _fighters.Add(fighter);
            }
            FinishWorldSetup(_config);
            _networkBridge = _worldRoot.AddComponent<NetworkMatchBridge>();
            _networkBridge.Configure(_roomClient, _fighters, _roomClient.PlayerId, _match);
        }

        private void FinishWorldSetup(LocalMatchConfig config)
        {
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
            if (_onlineMatch)
            {
                if (_networkBridge != null && _networkBridge.IsHost)
                    _roomClient.SendResult(new MatchResultDto { winner=_match.WinnerSlot, winnerTeam=_match.WinnerTeam, reason=result });
                return;
            }
            var localWon = _match.WinnerSlot == 0 || (_match.WinnerTeam >= 0 && _fighters.Count > 0 && _fighters[0].Team == _match.WinnerTeam);
            _saveService?.RecordMatch(localWon, 0);
            _ui.ShowResult(result);
        }

        private void OnOnlineRoomChanged(RoomDto room)
        {
            if(room==null)return;
            if(room.phase=="fight")StartOnlineMatch(room);
            else if(_onlineMatch&&room.phase=="lobby"){DestroyRuntimeWorld();BuildMenuBackdrop();_audio.PlayTitleMusic();}
        }

        private bool DidLocalPlayerWin(MatchResultDto result)
        {
            if (result == null) return false;
            if (result.winner == _roomClient.PlayerId) return true;
            if (result.winnerTeam < 0) return false;
            for (var i = 0; i < _fighters.Count; i++)
            {
                var fighter = _fighters[i];
                if (fighter != null && fighter.Slot == _roomClient.PlayerId) return fighter.Team == result.winnerTeam;
            }
            return false;
        }

        private void OnOnlineResult(MatchResultDto result)
        {
            if(!_onlineMatch)return;
            foreach(var fighter in _fighters)if(fighter!=null)fighter.SetControlSuppressed(true);
            var text=result?.reason;
            if(string.IsNullOrWhiteSpace(text)&&result!=null&&result.winner>=0&&_roomClient.Room?.players!=null)
                foreach(var p in _roomClient.Room.players)if(p.id==result.winner){text=p.name.ToUpperInvariant()+" WINS!";break;}
            if(string.IsNullOrWhiteSpace(text))text="ROUND OVER!";
            _audio.Play(SfxId.Victory);_ui.ShowResult(text);
            _saveService.RecordMatch(DidLocalPlayerWin(result),0);
        }

        public void Rematch()
        {
            if (_onlineMatch) { if (_roomClient.IsHost) _roomClient.SendRematch(); return; }
            if (_match == null) return;
            _match.ResetRound();
            _ui.ShowFight(_fighters, _config.Settings);
            _audio.PlayFightMusic();
            _audio.Play(SfxId.RoundStart);
        }

        public void LeaveOnlineRoom(){_roomClient?.Leave();DestroyRuntimeWorld();BuildMenuBackdrop();_audio.PlayTitleMusic();}
        public void ReturnToMenu(){DestroyRuntimeWorld();BuildMenuBackdrop();_audio.PlayTitleMusic();}

        private void DestroyRuntimeWorld()
        {
            if (_match != null) _match.MatchFinished -= OnMatchFinished;
            _match = null;_arena = null;_config = null;_networkBridge = null;_onlineMatch = false;_fighters.Clear();
            if (_worldRoot != null) Destroy(_worldRoot);_worldRoot = null;
            if (_menuBackdrop != null) Destroy(_menuBackdrop);_menuBackdrop = null;
        }

        private static LocalMode ParseMode(string value)
        {
            if(value=="TwoVsTwo"||value=="TeamKnockout")return LocalMode.TwoVsTwo;
            if(value=="RoyalRumble")return LocalMode.RoyalRumble;if(value=="MangoGrab")return LocalMode.MangoGrab;if(value=="HotBomb")return LocalMode.HotBomb;if(value=="KingOfTheRing")return LocalMode.KingOfRing;if(value=="Heist")return LocalMode.Heist;if(value=="OneVsOne")return LocalMode.OneVsOne;return LocalMode.FreeForAll;
        }
        private static ArenaId ParseArena(string value)=>Enum.TryParse(value,true,out ArenaId id)?id:ArenaId.WrestlingArena;
        private static CharacterId ParseCharacter(string value)=>Enum.TryParse(value,true,out CharacterId id)?id:CharacterId.Hero;
        private static CostumeId ParseCostume(string value)=>Enum.TryParse(value,true,out CostumeId id)?id:CostumeId.Arcade;

        private void BuildMenuBackdrop()
        {
            if (_menuBackdrop != null) return;
            _menuBackdrop = new GameObject("MenuBackdrop");
            var floor = GameObject.CreatePrimitive(PrimitiveType.Cube);floor.name = "BackdropFloor";floor.transform.SetParent(_menuBackdrop.transform, false);floor.transform.position = new Vector3(0f,-1f,0f);floor.transform.localScale = new Vector3(28f,.5f,22f);
            RuntimeMaterial.Paint(floor.GetComponent<Renderer>(), new Color(.055f,.04f,.09f));
            var light = new GameObject("BackdropLight").AddComponent<Light>();light.transform.SetParent(_menuBackdrop.transform, false);light.type = LightType.Directional;light.transform.rotation = Quaternion.Euler(48f,-32f,0f);light.intensity = 1.35f;light.color = new Color(1f,.75f,.52f);
            var cameraGo = new GameObject("MenuCamera");cameraGo.transform.SetParent(_menuBackdrop.transform, false);cameraGo.transform.position = new Vector3(0f,7f,-16f);cameraGo.transform.rotation = Quaternion.Euler(20f,0f,0f);var camera = cameraGo.AddComponent<Camera>();camera.clearFlags = CameraClearFlags.SolidColor;camera.backgroundColor = new Color(.025f,.018f,.05f);camera.fieldOfView = 48f;
        }

        private void OnDestroy(){if(_roomClient!=null){_roomClient.RoomChanged-=OnOnlineRoomChanged;_roomClient.ResultReceived-=OnOnlineResult;}}
    }
}
