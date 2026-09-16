using System.Collections.Generic;
using Danao.Core;
using Danao.Fighters;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UI;

namespace Danao.UI
{
    public sealed class ArcadeUi : MonoBehaviour
    {
        private enum ScreenState { Title, Join, Setup, Fight, Result, Help }

        private sealed class HudEntry
        {
            public FighterController Fighter;
            public Text Hp;
            public Image Fill;
        }

        private DanaoGame _game;
        private Canvas _canvas;
        private Font _font;
        private RectTransform _screen;
        private ScreenState _state;
        private readonly List<Text> _options = new List<Text>();
        private readonly List<HudEntry> _hud = new List<HudEntry>();
        private readonly List<Text> _joinSlots = new List<Text>();
        private int _selected;
        private LocalMode _mode = LocalMode.OneVsOne;
        private bool _healthDamage = true;
        private bool _bruising = true;
        private bool _hazards = true;

        public void Configure(DanaoGame game)
        {
            _game = game;
            _font = BuildFont();
            BuildCanvas();
            ShowTitle();
        }

        private Font BuildFont()
        {
            var dynamic = Font.CreateDynamicFontFromOSFont(new[] { "Noto Sans CJK SC", "Microsoft YaHei", "PingFang SC", "Arial Unicode MS", "Arial" }, 48);
            return dynamic != null ? dynamic : Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        }

        private void BuildCanvas()
        {
            var canvasGo = new GameObject("ArcadeCanvas");
            canvasGo.transform.SetParent(transform, false);
            _canvas = canvasGo.AddComponent<Canvas>();
            _canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            _canvas.sortingOrder = 50;
            var scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920, 1080);
            scaler.matchWidthOrHeight = .5f;
            canvasGo.AddComponent<GraphicRaycaster>();
        }

        private void Update()
        {
            if (_state == ScreenState.Fight) return;
            if (_state == ScreenState.Join)
            {
                if (_game.InputHub.PollJoin()) RefreshJoinScreen();
                var continuePressed = (Keyboard.current != null && Keyboard.current.enterKey.wasPressedThisFrame) || AnySouthButtonPressed();
                if (_game.InputHub.JoinedCount >= 2 && continuePressed) { ShowSetup(); return; }
                if (Keyboard.current != null && Keyboard.current.escapeKey.wasPressedThisFrame) { ShowTitle(); return; }
                if (Gamepad.all.Count > 0 && Gamepad.all[0].buttonEast.wasPressedThisFrame) { ShowTitle(); return; }
                return;
            }

            var up = false;
            var down = false;
            var left = false;
            var right = false;
            var accept = false;
            var back = false;

            if (Keyboard.current != null)
            {
                up |= Keyboard.current.upArrowKey.wasPressedThisFrame || Keyboard.current.wKey.wasPressedThisFrame;
                down |= Keyboard.current.downArrowKey.wasPressedThisFrame || Keyboard.current.sKey.wasPressedThisFrame;
                left |= Keyboard.current.leftArrowKey.wasPressedThisFrame || Keyboard.current.aKey.wasPressedThisFrame;
                right |= Keyboard.current.rightArrowKey.wasPressedThisFrame || Keyboard.current.dKey.wasPressedThisFrame;
                accept |= Keyboard.current.enterKey.wasPressedThisFrame || Keyboard.current.spaceKey.wasPressedThisFrame;
                back |= Keyboard.current.escapeKey.wasPressedThisFrame;
            }
            if (Gamepad.all.Count > 0)
            {
                var pad = Gamepad.all[0];
                up |= pad.dpad.up.wasPressedThisFrame;
                down |= pad.dpad.down.wasPressedThisFrame;
                left |= pad.dpad.left.wasPressedThisFrame;
                right |= pad.dpad.right.wasPressedThisFrame;
                accept |= pad.buttonSouth.wasPressedThisFrame;
                back |= pad.buttonEast.wasPressedThisFrame;
            }

            if (up) MoveSelection(-1);
            if (down) MoveSelection(1);
            if (left) Adjust(-1);
            if (right) Adjust(1);
            if (accept) Activate();
            if (back) Back();
        }

        private void MoveSelection(int direction)
        {
            if (_options.Count == 0) return;
            _selected = (_selected + direction + _options.Count) % _options.Count;
            RefreshSelection();
        }

        private void RefreshSelection()
        {
            for (var i = 0; i < _options.Count; i++)
            {
                _options[i].color = i == _selected ? new Color(1f,.86f,.22f) : Color.white;
                _options[i].transform.localScale = i == _selected ? Vector3.one * 1.08f : Vector3.one;
            }
        }

        private void Activate()
        {
            if (_state == ScreenState.Title)
            {
                if (_selected == 0) ShowJoin();
                else if (_selected == 1) ShowHelp();
                else if (_selected == 2) Application.Quit();
                return;
            }
            if (_state == ScreenState.Help)
            {
                ShowTitle();
                return;
            }
            if (_state == ScreenState.Result)
            {
                if (_selected == 0) _game.Rematch();
                else ShowTitleAndReturnGame();
                return;
            }
            if (_state != ScreenState.Setup) return;
            if (_selected == 4) StartFight();
            if (_selected == 5) ShowJoin();
        }

        private void Adjust(int direction)
        {
            if (_state != ScreenState.Setup) return;
            if (_selected == 0)
            {
                var values = (LocalMode[])System.Enum.GetValues(typeof(LocalMode));
                var index = ((int)_mode + direction + values.Length) % values.Length;
                _mode = values[index];
                NormaliseModeForJoinedPlayers();
            }
            else if (_selected == 1) _healthDamage = !_healthDamage;
            else if (_selected == 2) _bruising = !_bruising;
            else if (_selected == 3) _hazards = !_hazards;
            RefreshSetupText();
        }

        private void Back()
        {
            if (_state == ScreenState.Title) return;
            if (_state == ScreenState.Setup) ShowJoin();
            else if (_state == ScreenState.Help) ShowTitle();
            else if (_state == ScreenState.Result) ShowTitleAndReturnGame();
        }

        public void ShowTitle()
        {
            ClearScreen();
            _state = ScreenState.Title;
            AddText(_screen, "打闹", 104, new Vector2(0, 260), new Vector2(1000, 150), FontStyle.Bold, TextAnchor.MiddleCenter, new Color(1f,.84f,.18f));
            AddText(_screen, "Dǎnào", 42, new Vector2(0, 180), new Vector2(800, 80), FontStyle.Bold, TextAnchor.MiddleCenter, Color.white);
            AddText(_screen, "ARCADE PHYSICS. TERRIBLE DECISIONS.", 22, new Vector2(0, 124), new Vector2(900, 50), FontStyle.Normal, TextAnchor.MiddleCenter, new Color(.75f,.85f,1f));
            _options.Add(AddOption("LOCAL PLAY", new Vector2(0, 20)));
            _options.Add(AddOption("HOW TO PLAY", new Vector2(0, -72)));
            _options.Add(AddOption("QUIT", new Vector2(0, -164)));
            _selected = 0;
            RefreshSelection();
        }

        private void ShowJoin()
        {
            ClearScreen();
            _state = ScreenState.Join;
            AddText(_screen, "WHO'S CAUSING TROUBLE?", 50, new Vector2(0, 330), new Vector2(1150, 80), FontStyle.Bold, TextAnchor.MiddleCenter, new Color(1f,.84f,.18f));
            AddText(_screen, "PRESS START ON A CONTROLLER · ENTER/SPACE FOR KEYBOARD", 23, new Vector2(0, 252), new Vector2(1250, 55), FontStyle.Bold, TextAnchor.MiddleCenter, Color.white);
            _joinSlots.Clear();
            for (var i = 0; i < 4; i++)
            {
                var x = (i - 1.5f) * 350f;
                var panel = AddPanel(_screen, new Vector2(x, 70), new Vector2(300,260), new Color(.07f,.085f,.13f,.94f));
                AddText(panel, $"P{i + 1}", 36, new Vector2(0,70), new Vector2(220,60), FontStyle.Bold, TextAnchor.MiddleCenter, PlayerColour(i));
                _joinSlots.Add(AddText(panel, "EMPTY", 21, new Vector2(0,-25), new Vector2(260,90), FontStyle.Bold, TextAnchor.MiddleCenter, new Color(.7f,.73f,.8f)));
            }
            AddText(_screen, "B / ESC: BACK", 18, new Vector2(0,-455), new Vector2(450,40), FontStyle.Normal, TextAnchor.MiddleCenter, new Color(1f,1f,1f,.68f));
            RefreshJoinScreen();
        }

        private void RefreshJoinScreen()
        {
            for (var i = 0; i < _joinSlots.Count; i++)
            {
                var joined = i < _game.InputHub.JoinedCount;
                _joinSlots[i].text = joined ? _game.InputHub.SlotLabel(i) + "\nREADY" : "PRESS START";
                _joinSlots[i].color = joined ? Color.white : new Color(.58f,.61f,.68f);
            }
            if (_game.InputHub.JoinedCount >= 2) AddOrReplaceJoinContinue();
        }

        private void AddOrReplaceJoinContinue()
        {
            var existing = GameObject.Find("JoinContinue");
            if (existing != null) return;
            var go = new GameObject("JoinContinue");
            go.transform.SetParent(_screen, false);
            var rect = go.AddComponent<RectTransform>();
            rect.anchorMin = rect.anchorMax = new Vector2(.5f,.5f);
            rect.anchoredPosition = new Vector2(0,-250);
            rect.sizeDelta = new Vector2(720,80);
            var image = go.AddComponent<Image>();
            image.color = new Color(.48f,.13f,.66f,.94f);
            AddText(rect, "A / ENTER: MATCH SETUP", 26, Vector2.zero, new Vector2(690,65), FontStyle.Bold, TextAnchor.MiddleCenter, new Color(1f,.9f,.3f));
        }

        private static bool AnySouthButtonPressed()
        {
            foreach (var pad in Gamepad.all) if (pad.buttonSouth.wasPressedThisFrame) return true;
            return false;
        }

        private void ShowSetup()
        {
            if (_game.InputHub.JoinedCount < 2) return;
            NormaliseModeForJoinedPlayers();
            ClearScreen();
            _state = ScreenState.Setup;
            AddText(_screen, "LOCAL MAYHEM", 52, new Vector2(0, 330), new Vector2(900, 90), FontStyle.Bold, TextAnchor.MiddleCenter, new Color(1f,.84f,.18f));
            AddText(_screen, $"{_game.InputHub.JoinedCount} PLAYERS JOINED", 22, new Vector2(0,270), new Vector2(650,45), FontStyle.Bold, TextAnchor.MiddleCenter, new Color(.71f,.84f,1f));
            _options.Add(AddOption("", new Vector2(0, 165)));
            _options.Add(AddOption("", new Vector2(0, 80)));
            _options.Add(AddOption("", new Vector2(0, -5)));
            _options.Add(AddOption("", new Vector2(0, -90)));
            _options.Add(AddOption("START FIGHT", new Vector2(0, -210)));
            _options.Add(AddOption("BACK TO PLAYERS", new Vector2(0, -300)));
            _selected = 0;
            RefreshSetupText();
            RefreshSelection();
        }

        private void NormaliseModeForJoinedPlayers()
        {
            var joined = Mathf.Clamp(_game.InputHub.JoinedCount, 2, 4);
            if (joined == 2 && _mode == LocalMode.TwoVsTwo) _mode = LocalMode.OneVsOne;
            if (joined == 3 && (_mode == LocalMode.OneVsOne || _mode == LocalMode.TwoVsTwo)) _mode = LocalMode.FreeForAll;
            if (joined == 4 && _mode == LocalMode.OneVsOne) _mode = LocalMode.FreeForAll;
        }

        private bool ModeAllowed(LocalMode mode)
        {
            var joined = _game.InputHub.JoinedCount;
            if (mode == LocalMode.OneVsOne) return joined == 2;
            if (mode == LocalMode.TwoVsTwo) return joined == 4;
            return joined >= 2 && joined <= 4;
        }

        private void RefreshSetupText()
        {
            if (_options.Count < 6) return;
            if (!ModeAllowed(_mode)) NormaliseModeForJoinedPlayers();
            _options[0].text = $"‹  MODE: {ModeName(_mode)}  ›";
            _options[1].text = $"‹  HEALTH DAMAGE: {OnOff(_healthDamage)}  ›";
            _options[2].text = $"‹  VISIBLE BRUISING: {OnOff(_bruising)}  ›";
            _options[3].text = $"‹  ARENA HAZARDS: {OnOff(_hazards)}  ›";
        }

        private void StartFight()
        {
            if (!ModeAllowed(_mode)) return;
            var settings = new MatchSettings
            {
                ActivePlayers = _game.InputHub.JoinedCount,
                HealthDamage = _healthDamage,
                VisibleBruising = _bruising,
                ArenaHazards = _hazards,
                TeamMode = _mode == LocalMode.TwoVsTwo,
                RingOut = _mode == LocalMode.RoyalRumble || !_healthDamage,
                FriendlyFire = _mode != LocalMode.TwoVsTwo
            };
            _game.StartLocalMatch(new LocalMatchConfig { Mode = _mode, Settings = settings });
        }

        public void ShowFight(IReadOnlyList<FighterController> fighters, MatchSettings settings)
        {
            ClearScreen();
            _state = ScreenState.Fight;
            _hud.Clear();
            for (var i = 0; i < fighters.Count; i++)
            {
                var fighter = fighters[i];
                var left = i % 2 == 0;
                var top = i < 2;
                var anchor = new Vector2(left ? -650f : 650f, top ? 430f : 315f);
                var panel = AddPanel(_screen, anchor, new Vector2(520,105), new Color(.03f,.035f,.06f,.82f));
                AddText(panel, fighter.DisplayName.ToUpperInvariant(), 24, new Vector2(-135,25), new Vector2(230,42), FontStyle.Bold, TextAnchor.MiddleLeft, Color.white);
                var hp = AddText(panel, "100 HP", 26, new Vector2(140,25), new Vector2(170,42), FontStyle.Bold, TextAnchor.MiddleRight, Color.white);
                var barBack = AddPanel(panel, new Vector2(0,-26), new Vector2(450,24), new Color(.12f,.12f,.16f,.95f));
                var fillGo = new GameObject("HealthFill");
                fillGo.transform.SetParent(barBack, false);
                var fillRect = fillGo.AddComponent<RectTransform>();
                fillRect.anchorMin = Vector2.zero;
                fillRect.anchorMax = Vector2.one;
                fillRect.offsetMin = Vector2.zero;
                fillRect.offsetMax = Vector2.zero;
                fillRect.pivot = new Vector2(0,.5f);
                var image = fillGo.AddComponent<Image>();
                image.color = PlayerColour(i);
                image.type = Image.Type.Filled;
                image.fillMethod = Image.FillMethod.Horizontal;
                image.fillOrigin = 0;
                _hud.Add(new HudEntry { Fighter = fighter, Hp = hp, Fill = image });
            }
            AddText(_screen, "START / ESC: MENU", 17, new Vector2(0,-500), new Vector2(420,35), FontStyle.Normal, TextAnchor.MiddleCenter, new Color(1f,1f,1f,.66f));
            RefreshHud(settings);
        }

        public void RefreshHud(MatchSettings settings)
        {
            foreach (var entry in _hud)
            {
                if (entry.Fighter == null) continue;
                var health = entry.Fighter.Health;
                entry.Fill.fillAmount = settings.HealthDamage ? health.CurrentHp / 100f : 1f;
                entry.Fill.color = health.IsEliminated ? new Color(.22f,.22f,.24f) : PlayerColour(entry.Fighter.Slot);
                entry.Hp.text = settings.HealthDamage ? $"{health.CurrentHp} HP" : "∞ HP";
            }
        }

        public void ShowResult(string text)
        {
            ClearScreen();
            _state = ScreenState.Result;
            AddText(_screen, text, 62, new Vector2(0,190), new Vector2(1100,100), FontStyle.Bold, TextAnchor.MiddleCenter, new Color(1f,.84f,.18f));
            _options.Add(AddOption("REMATCH", new Vector2(0,20)));
            _options.Add(AddOption("MAIN MENU", new Vector2(0,-85)));
            _selected = 0;
            RefreshSelection();
        }

        private void ShowHelp()
        {
            ClearScreen();
            _state = ScreenState.Help;
            AddText(_screen, "HOW TO CAUSE TROUBLE", 52, new Vector2(0,330), new Vector2(1000,80), FontStyle.Bold, TextAnchor.MiddleCenter, new Color(1f,.84f,.18f));
            var help = "MOVE  Left stick / WASD\nJUMP  A / Cross / Space\nPUNCH  X / Square / X\nGRAB + THROW  Y / Triangle / E\nDODGE  B / Circle / Shift\nFIRE  Right Trigger / F\nBLOCK  Left Trigger / Q\n\nKnock them down, throw the furniture, and try not to be the one outside the ring.";
            AddText(_screen, help, 28, new Vector2(0,20), new Vector2(1100,520), FontStyle.Normal, TextAnchor.MiddleCenter, Color.white);
            _options.Add(AddOption("BACK", new Vector2(0,-350)));
            _selected = 0;
            RefreshSelection();
        }

        private void ShowTitleAndReturnGame()
        {
            _game.ReturnToMenu();
            ShowTitle();
        }

        private static string ModeName(LocalMode mode)
        {
            switch (mode)
            {
                case LocalMode.OneVsOne: return "1v1";
                case LocalMode.TwoVsTwo: return "2v2";
                case LocalMode.FreeForAll: return "FREE-FOR-ALL";
                default: return "ROYAL RUMBLE";
            }
        }

        private static string OnOff(bool value) => value ? "ON" : "OFF";

        private void ClearScreen()
        {
            if (_screen != null) Destroy(_screen.gameObject);
            _options.Clear();
            _hud.Clear();
            _joinSlots.Clear();
            var screenGo = new GameObject("Screen");
            screenGo.transform.SetParent(_canvas.transform, false);
            _screen = screenGo.AddComponent<RectTransform>();
            _screen.anchorMin = Vector2.zero;
            _screen.anchorMax = Vector2.one;
            _screen.offsetMin = Vector2.zero;
            _screen.offsetMax = Vector2.zero;
        }

        private Text AddOption(string text, Vector2 position)
        {
            var panel = AddPanel(_screen, position, new Vector2(650,70), new Color(.08f,.1f,.16f,.9f));
            return AddText(panel, text, 30, Vector2.zero, new Vector2(620,60), FontStyle.Bold, TextAnchor.MiddleCenter, Color.white);
        }

        private RectTransform AddPanel(RectTransform parent, Vector2 position, Vector2 size, Color colour)
        {
            var go = new GameObject("Panel");
            go.transform.SetParent(parent, false);
            var rect = go.AddComponent<RectTransform>();
            rect.anchorMin = rect.anchorMax = new Vector2(.5f,.5f);
            rect.anchoredPosition = position;
            rect.sizeDelta = size;
            var image = go.AddComponent<Image>();
            image.color = colour;
            return rect;
        }

        private Text AddText(RectTransform parent, string text, int size, Vector2 position, Vector2 dimensions, FontStyle style, TextAnchor alignment, Color colour)
        {
            var go = new GameObject("Text");
            go.transform.SetParent(parent, false);
            var rect = go.AddComponent<RectTransform>();
            rect.anchorMin = rect.anchorMax = new Vector2(.5f,.5f);
            rect.anchoredPosition = position;
            rect.sizeDelta = dimensions;
            var label = go.AddComponent<Text>();
            label.font = _font;
            label.text = text;
            label.fontSize = size;
            label.fontStyle = style;
            label.alignment = alignment;
            label.color = colour;
            label.horizontalOverflow = HorizontalWrapMode.Overflow;
            label.verticalOverflow = VerticalWrapMode.Overflow;
            return label;
        }

        private static Color PlayerColour(int slot)
        {
            var colours = new[] { new Color(.16f,.82f,.75f), new Color(.95f,.34f,.3f), new Color(.35f,.61f,.95f), new Color(.86f,.48f,.93f) };
            return colours[Mathf.Abs(slot) % colours.Length];
        }
    }
}
