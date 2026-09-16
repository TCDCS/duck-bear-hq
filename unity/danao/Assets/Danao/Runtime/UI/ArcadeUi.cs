using System.Collections.Generic;
using Danao.Arenas;
using Danao.Core;
using Danao.Fighters;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UI;

namespace Danao.UI
{
    public sealed class ArcadeUi : MonoBehaviour
    {
        private enum ScreenState { Title, Join, Character, Setup, Fight, Result, Help }
        private sealed class HudEntry { public FighterController Fighter; public Text Hp; public Image Fill; }

        private DanaoGame _game;
        private Canvas _canvas;
        private Font _font;
        private RectTransform _screen;
        private ScreenState _state;
        private readonly List<Text> _options = new List<Text>();
        private readonly List<Text> _joinLabels = new List<Text>();
        private readonly List<Text> _characterLabels = new List<Text>();
        private readonly List<HudEntry> _hud = new List<HudEntry>();
        private readonly PlayerLoadout[] _loadouts =
        {
            new PlayerLoadout(CharacterId.Hero,CostumeId.Arcade),
            new PlayerLoadout(CharacterId.Stephen,CostumeId.Arcade),
            new PlayerLoadout(CharacterId.Zachary,CostumeId.Arcade),
            new PlayerLoadout(CharacterId.Mulan,CostumeId.Arcade)
        };
        private readonly bool[] _ready = new bool[4];
        private readonly float[] _navCooldown = new float[4];
        private Text _objectiveLabel;
        private GameObject _joinContinue;
        private int _selected;
        private LocalMode _mode = LocalMode.OneVsOne;
        private ArenaId _arena = ArenaId.WrestlingArena;
        private bool _healthDamage = true;
        private bool _bruising = true;
        private bool _hazards = true;

        public void Configure(DanaoGame game)
        {
            _game=game;
            _font=Font.CreateDynamicFontFromOSFont(new[]{"Noto Sans CJK SC","Microsoft YaHei","PingFang SC","Arial Unicode MS","Arial"},48);
            if(_font==null) _font=Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            var canvasGo=new GameObject("ArcadeCanvas"); canvasGo.transform.SetParent(transform,false);
            _canvas=canvasGo.AddComponent<Canvas>(); _canvas.renderMode=RenderMode.ScreenSpaceOverlay; _canvas.sortingOrder=50;
            var scaler=canvasGo.AddComponent<CanvasScaler>(); scaler.uiScaleMode=CanvasScaler.ScaleMode.ScaleWithScreenSize; scaler.referenceResolution=new Vector2(1920,1080); scaler.matchWidthOrHeight=.5f;
            canvasGo.AddComponent<GraphicRaycaster>();
            ShowTitle();
        }

        private void Update()
        {
            if(_state==ScreenState.Fight) return;
            if(_state==ScreenState.Join){ UpdateJoin(); return; }
            if(_state==ScreenState.Character){ UpdateCharacter(); return; }
            ReadMenu(out var up,out var down,out var left,out var right,out var accept,out var back);
            if(up) Move(-1); if(down) Move(1); if(left) Adjust(-1); if(right) Adjust(1); if(accept) Activate(); if(back) Back();
        }

        private void UpdateJoin()
        {
            if(_game.InputHub.PollJoin()) RefreshJoin();
            var accept=(Keyboard.current!=null&&Keyboard.current.enterKey.wasPressedThisFrame)||AnySouth();
            if(_game.InputHub.JoinedCount>=2&&accept){ ShowCharacter(); return; }
            if((Keyboard.current!=null&&Keyboard.current.escapeKey.wasPressedThisFrame)||AnyEast()) ShowTitle();
        }

        private void UpdateCharacter()
        {
            var joined=Mathf.Clamp(_game.InputHub.JoinedCount,0,4); var allReady=joined>=2;
            for(var i=0;i<joined;i++)
            {
                _navCooldown[i]-=Time.deltaTime; var input=_game.InputHub.ReadSlot(i);
                if(!_ready[i]&&_navCooldown[i]<=0f)
                {
                    if(input.Move.x>.55f){ CycleCharacter(i,1); _navCooldown[i]=.22f; }
                    else if(input.Move.x<-.55f){ CycleCharacter(i,-1); _navCooldown[i]=.22f; }
                    else if(input.Move.y>.55f){ CycleCostume(i,1); _navCooldown[i]=.22f; }
                    else if(input.Move.y<-.55f){ CycleCostume(i,-1); _navCooldown[i]=.22f; }
                }
                if(input.Jump&&!_ready[i]){ _ready[i]=true; RefreshCharacterLabels(); }
                if(input.Dodge&&_ready[i]){ _ready[i]=false; RefreshCharacterLabels(); }
                if(!_ready[i]) allReady=false;
            }
            if(allReady) ShowSetup();
            if(Keyboard.current!=null&&Keyboard.current.escapeKey.wasPressedThisFrame) ShowJoin();
        }

        private void ReadMenu(out bool up,out bool down,out bool left,out bool right,out bool accept,out bool back)
        {
            up=down=left=right=accept=back=false;
            if(Keyboard.current!=null)
            {
                up|=Keyboard.current.upArrowKey.wasPressedThisFrame||Keyboard.current.wKey.wasPressedThisFrame; down|=Keyboard.current.downArrowKey.wasPressedThisFrame||Keyboard.current.sKey.wasPressedThisFrame;
                left|=Keyboard.current.leftArrowKey.wasPressedThisFrame||Keyboard.current.aKey.wasPressedThisFrame; right|=Keyboard.current.rightArrowKey.wasPressedThisFrame||Keyboard.current.dKey.wasPressedThisFrame;
                accept|=Keyboard.current.enterKey.wasPressedThisFrame||Keyboard.current.spaceKey.wasPressedThisFrame; back|=Keyboard.current.escapeKey.wasPressedThisFrame;
            }
            if(Gamepad.all.Count>0)
            {
                var p=Gamepad.all[0]; up|=p.dpad.up.wasPressedThisFrame; down|=p.dpad.down.wasPressedThisFrame; left|=p.dpad.left.wasPressedThisFrame; right|=p.dpad.right.wasPressedThisFrame; accept|=p.buttonSouth.wasPressedThisFrame; back|=p.buttonEast.wasPressedThisFrame;
            }
        }

        public void ShowTitle()
        {
            Clear(); _state=ScreenState.Title;
            AddText(_screen,"打闹",104,new Vector2(0,260),new Vector2(1000,150),FontStyle.Bold,TextAnchor.MiddleCenter,new Color(1f,.84f,.18f));
            AddText(_screen,"Dǎnào",42,new Vector2(0,180),new Vector2(800,80),FontStyle.Bold,TextAnchor.MiddleCenter,Color.white);
            AddText(_screen,"ARCADE PHYSICS · TERRIBLE DECISIONS",22,new Vector2(0,120),new Vector2(950,50),FontStyle.Bold,TextAnchor.MiddleCenter,new Color(.72f,.84f,1f));
            _options.Add(Option("LOCAL PLAY",20)); _options.Add(Option("HOW TO PLAY",-72)); _options.Add(Option("QUIT",-164)); _selected=0; Highlight();
        }

        private void ShowJoin()
        {
            Clear(); _state=ScreenState.Join;
            AddText(_screen,"WHO'S CAUSING TROUBLE?",50,new Vector2(0,330),new Vector2(1200,80),FontStyle.Bold,TextAnchor.MiddleCenter,new Color(1f,.84f,.18f));
            AddText(_screen,"PRESS START ON A CONTROLLER · ENTER/SPACE FOR KEYBOARD",23,new Vector2(0,250),new Vector2(1350,55),FontStyle.Bold,TextAnchor.MiddleCenter,Color.white);
            for(var i=0;i<4;i++){var panel=Panel(_screen,new Vector2((i-1.5f)*350f,60),new Vector2(300,250),new Color(.07f,.085f,.13f,.94f)); AddText(panel,$"P{i+1}",36,new Vector2(0,65),new Vector2(220,55),FontStyle.Bold,TextAnchor.MiddleCenter,PlayerColour(i)); _joinLabels.Add(AddText(panel,"PRESS START",21,new Vector2(0,-20),new Vector2(260,100),FontStyle.Bold,TextAnchor.MiddleCenter,new Color(.65f,.68f,.75f)));}
            AddText(_screen,"B / ESC: BACK",18,new Vector2(0,-455),new Vector2(450,40),FontStyle.Normal,TextAnchor.MiddleCenter,new Color(1f,1f,1f,.68f)); RefreshJoin();
        }

        private void RefreshJoin()
        {
            for(var i=0;i<_joinLabels.Count;i++){var joined=i<_game.InputHub.JoinedCount; _joinLabels[i].text=joined?_game.InputHub.SlotLabel(i)+"\nREADY":"PRESS START"; _joinLabels[i].color=joined?Color.white:new Color(.58f,.61f,.68f);}
            if(_game.InputHub.JoinedCount>=2&&_joinContinue==null){_joinContinue=Panel(_screen,new Vector2(0,-255),new Vector2(720,80),new Color(.48f,.13f,.66f,.94f)).gameObject; AddText(_joinContinue.GetComponent<RectTransform>(),"A / ENTER: CHARACTER SELECT",26,Vector2.zero,new Vector2(690,65),FontStyle.Bold,TextAnchor.MiddleCenter,new Color(1f,.9f,.3f));}
        }

        private void ShowCharacter()
        {
            Clear(); _state=ScreenState.Character; for(var i=0;i<4;i++) _ready[i]=i>=_game.InputHub.JoinedCount;
            AddText(_screen,"PICK YOUR TROUBLEMAKER",48,new Vector2(0,330),new Vector2(1100,75),FontStyle.Bold,TextAnchor.MiddleCenter,new Color(1f,.84f,.18f));
            AddText(_screen,"LEFT/RIGHT: CHARACTER · UP/DOWN: COSTUME · A: READY · B: CHANGE",20,new Vector2(0,270),new Vector2(1350,48),FontStyle.Bold,TextAnchor.MiddleCenter,Color.white);
            for(var i=0;i<_game.InputHub.JoinedCount;i++){var panel=Panel(_screen,new Vector2((i-(_game.InputHub.JoinedCount-1)*.5f)*410f,35),new Vector2(360,350),new Color(.055f,.07f,.12f,.94f)); AddText(panel,$"PLAYER {i+1}",25,new Vector2(0,120),new Vector2(320,45),FontStyle.Bold,TextAnchor.MiddleCenter,PlayerColour(i)); _characterLabels.Add(AddText(panel,"",27,new Vector2(0,0),new Vector2(330,180),FontStyle.Bold,TextAnchor.MiddleCenter,Color.white));}
            RefreshCharacterLabels();
        }

        private void RefreshCharacterLabels()
        {
            for(var i=0;i<_characterLabels.Count;i++){var c=CharacterCatalog.For(_loadouts[i].Character); var o=CharacterCatalog.For(_loadouts[i].Costume); _characterLabels[i].text=$"{c.DisplayName.ToUpperInvariant()}\n\n{o.DisplayName.ToUpperInvariant()}\n\n{(_ready[i]?"✓ READY":"A / SPACE TO READY")}"; _characterLabels[i].color=_ready[i]?new Color(.55f,1f,.62f):Color.white;}
        }

        private void CycleCharacter(int slot,int dir){var n=CharacterCatalog.All.Count; _loadouts[slot].Character=(CharacterId)(((int)_loadouts[slot].Character+dir+n)%n); RefreshCharacterLabels();}
        private void CycleCostume(int slot,int dir){var n=CharacterCatalog.Costumes.Count; _loadouts[slot].Costume=(CostumeId)(((int)_loadouts[slot].Costume+dir+n)%n); RefreshCharacterLabels();}

        private void ShowSetup()
        {
            Clear(); _state=ScreenState.Setup; if(!MatchRules.IsModeAllowed(_mode,_game.InputHub.JoinedCount)) _mode=MatchRules.NextAllowedMode(_mode,1,_game.InputHub.JoinedCount);
            AddText(_screen,"LOCAL MAYHEM",48,new Vector2(0,350),new Vector2(900,75),FontStyle.Bold,TextAnchor.MiddleCenter,new Color(1f,.84f,.18f));
            _options.Add(Option("",205)); _options.Add(Option("",130)); _options.Add(Option("",55)); _options.Add(Option("",-20)); _options.Add(Option("",-95)); _options.Add(Option("START FIGHT",-205)); _options.Add(Option("BACK TO CHARACTERS",-295));
            _selected=0; RefreshSetup(); Highlight();
        }

        private void Adjust(int dir)
        {
            if(_state!=ScreenState.Setup) return;
            if(_selected==0) _mode=MatchRules.NextAllowedMode(_mode,dir,_game.InputHub.JoinedCount);
            else if(_selected==1){var n=ArenaCatalog.All.Count; _arena=(ArenaId)(((int)_arena+dir+n)%n);}
            else if(_selected==2) _healthDamage=!_healthDamage; else if(_selected==3) _bruising=!_bruising; else if(_selected==4) _hazards=!_hazards;
            RefreshSetup();
        }

        private void RefreshSetup()
        {
            if(_options.Count<7) return;
            _options[0].text=$"‹  MODE: {ModeName(_mode)}  ›"; _options[1].text=$"‹  ARENA: {ArenaCatalog.For(_arena).DisplayName.ToUpperInvariant()}  ›"; _options[2].text=$"‹  HEALTH DAMAGE: {OnOff(_healthDamage)}  ›"; _options[3].text=$"‹  VISIBLE BRUISING: {OnOff(_bruising)}  ›"; _options[4].text=$"‹  ARENA HAZARDS: {OnOff(_hazards)}  ›";
        }

        private void Activate()
        {
            if(_state==ScreenState.Title){if(_selected==0) ShowJoin(); else if(_selected==1) ShowHelp(); else Application.Quit(); return;}
            if(_state==ScreenState.Help){ShowTitle();return;} if(_state==ScreenState.Result){if(_selected==0)_game.Rematch();else ShowTitleAndReturn();return;} if(_state!=ScreenState.Setup)return;
            if(_selected==5) StartFight(); else if(_selected==6) ShowCharacter();
        }

        private void StartFight()
        {
            var settings=new MatchSettings{ActivePlayers=_game.InputHub.JoinedCount,HealthDamage=_healthDamage,VisibleBruising=_bruising,ArenaHazards=_hazards,TeamMode=_mode==LocalMode.TwoVsTwo,RingOut=_mode==LocalMode.RoyalRumble||!_healthDamage,FriendlyFire=_mode!=LocalMode.TwoVsTwo};
            var loadouts=new PlayerLoadout[4]; for(var i=0;i<4;i++)loadouts[i]=_loadouts[i].Clone();
            _game.StartLocalMatch(new LocalMatchConfig{Mode=_mode,Arena=_arena,Settings=settings,Loadouts=loadouts});
        }

        private void Back(){if(_state==ScreenState.Setup)ShowCharacter();else if(_state==ScreenState.Help)ShowTitle();else if(_state==ScreenState.Result)ShowTitleAndReturn();}
        private void Move(int dir){if(_options.Count==0)return;_selected=(_selected+dir+_options.Count)%_options.Count;Highlight();}
        private void Highlight(){for(var i=0;i<_options.Count;i++){_options[i].color=i==_selected?new Color(1f,.86f,.22f):Color.white;_options[i].transform.localScale=i==_selected?Vector3.one*1.07f:Vector3.one;}}

        public void ShowFight(IReadOnlyList<FighterController> fighters,MatchSettings settings)
        {
            Clear(); _state=ScreenState.Fight;
            for(var i=0;i<fighters.Count;i++){var fighter=fighters[i];var anchor=new Vector2(i%2==0?-650f:650f,i<2?430f:315f);var panel=Panel(_screen,anchor,new Vector2(520,105),new Color(.03f,.035f,.06f,.82f));AddText(panel,fighter.DisplayName.ToUpperInvariant(),24,new Vector2(-135,25),new Vector2(230,42),FontStyle.Bold,TextAnchor.MiddleLeft,Color.white);var hp=AddText(panel,"100 HP",26,new Vector2(140,25),new Vector2(170,42),FontStyle.Bold,TextAnchor.MiddleRight,Color.white);var back=Panel(panel,new Vector2(0,-26),new Vector2(450,24),new Color(.12f,.12f,.16f,.95f));var go=new GameObject("HealthFill");go.transform.SetParent(back,false);var r=go.AddComponent<RectTransform>();r.anchorMin=Vector2.zero;r.anchorMax=Vector2.one;r.offsetMin=r.offsetMax=Vector2.zero;var image=go.AddComponent<Image>();image.color=PlayerColour(i);image.type=Image.Type.Filled;image.fillMethod=Image.FillMethod.Horizontal;image.fillOrigin=0;_hud.Add(new HudEntry{Fighter=fighter,Hp=hp,Fill=image});}
            _objectiveLabel=AddText(_screen,"",21,new Vector2(0,455),new Vector2(900,42),FontStyle.Bold,TextAnchor.MiddleCenter,new Color(1f,.86f,.3f)); AddText(_screen,"START / ESC: MENU",17,new Vector2(0,-500),new Vector2(420,35),FontStyle.Normal,TextAnchor.MiddleCenter,new Color(1f,1f,1f,.66f)); RefreshHud(settings,string.Empty);
        }

        public void RefreshHud(MatchSettings settings,string objectiveText="")
        {
            foreach(var entry in _hud){if(entry.Fighter==null)continue;var h=entry.Fighter.Health;entry.Fill.fillAmount=settings.HealthDamage?h.CurrentHp/100f:1f;entry.Fill.color=h.IsEliminated?new Color(.22f,.22f,.24f):PlayerColour(entry.Fighter.Slot);entry.Hp.text=settings.HealthDamage?$"{h.CurrentHp} HP":"∞ HP";} if(_objectiveLabel!=null)_objectiveLabel.text=objectiveText;
        }

        public void ShowResult(string text){Clear();_state=ScreenState.Result;AddText(_screen,text,62,new Vector2(0,190),new Vector2(1200,100),FontStyle.Bold,TextAnchor.MiddleCenter,new Color(1f,.84f,.18f));_options.Add(Option("REMATCH",20));_options.Add(Option("MAIN MENU",-85));_selected=0;Highlight();}
        private void ShowHelp(){Clear();_state=ScreenState.Help;AddText(_screen,"HOW TO CAUSE TROUBLE",52,new Vector2(0,330),new Vector2(1000,80),FontStyle.Bold,TextAnchor.MiddleCenter,new Color(1f,.84f,.18f));AddText(_screen,"MOVE  Left stick / WASD\nJUMP  A / Cross / Space\nPUNCH  X / Square / X\nGRAB + THROW  Y / Triangle / E\nDODGE  B / Circle / Shift\nFIRE  Right Trigger / F\nBLOCK  Left Trigger / Q\n\nKnock them down, throw whatever you can lift and use the arena against them.",28,new Vector2(0,20),new Vector2(1100,520),FontStyle.Normal,TextAnchor.MiddleCenter,Color.white);_options.Add(Option("BACK",-350));_selected=0;Highlight();}
        private void ShowTitleAndReturn(){_game.ReturnToMenu();ShowTitle();}

        private void Clear(){if(_screen!=null)Destroy(_screen.gameObject);_options.Clear();_hud.Clear();_joinLabels.Clear();_characterLabels.Clear();_objectiveLabel=null;_joinContinue=null;var go=new GameObject("Screen");go.transform.SetParent(_canvas.transform,false);_screen=go.AddComponent<RectTransform>();_screen.anchorMin=Vector2.zero;_screen.anchorMax=Vector2.one;_screen.offsetMin=_screen.offsetMax=Vector2.zero;}
        private Text Option(string text,float y){var p=Panel(_screen,new Vector2(0,y),new Vector2(750,62),new Color(.08f,.1f,.16f,.9f));return AddText(p,text,27,Vector2.zero,new Vector2(720,54),FontStyle.Bold,TextAnchor.MiddleCenter,Color.white);}
        private RectTransform Panel(RectTransform parent,Vector2 pos,Vector2 size,Color colour){var go=new GameObject("Panel");go.transform.SetParent(parent,false);var r=go.AddComponent<RectTransform>();r.anchorMin=r.anchorMax=new Vector2(.5f,.5f);r.anchoredPosition=pos;r.sizeDelta=size;go.AddComponent<Image>().color=colour;return r;}
        private Text AddText(RectTransform parent,string text,int size,Vector2 pos,Vector2 dims,FontStyle style,TextAnchor align,Color colour){var go=new GameObject("Text");go.transform.SetParent(parent,false);var r=go.AddComponent<RectTransform>();r.anchorMin=r.anchorMax=new Vector2(.5f,.5f);r.anchoredPosition=pos;r.sizeDelta=dims;var t=go.AddComponent<Text>();t.font=_font;t.text=text;t.fontSize=size;t.fontStyle=style;t.alignment=align;t.color=colour;t.horizontalOverflow=HorizontalWrapMode.Overflow;t.verticalOverflow=VerticalWrapMode.Overflow;return t;}
        private static bool AnySouth(){foreach(var p in Gamepad.all)if(p.buttonSouth.wasPressedThisFrame)return true;return false;} private static bool AnyEast(){foreach(var p in Gamepad.all)if(p.buttonEast.wasPressedThisFrame)return true;return false;}
        private static string OnOff(bool v)=>v?"ON":"OFF";
        private static string ModeName(LocalMode m){switch(m){case LocalMode.OneVsOne:return"1v1";case LocalMode.TwoVsTwo:return"2v2";case LocalMode.FreeForAll:return"FREE-FOR-ALL";case LocalMode.RoyalRumble:return"ROYAL RUMBLE";case LocalMode.MangoGrab:return"MANGO GRAB";case LocalMode.HotBomb:return"HOT BOMB";case LocalMode.KingOfRing:return"KING OF THE RING";default:return"HEIST";}}
        private static Color PlayerColour(int i){var c=new[]{new Color(.16f,.82f,.75f),new Color(.95f,.34f,.3f),new Color(.35f,.61f,.95f),new Color(.86f,.48f,.93f)};return c[Mathf.Abs(i)%c.Length];}
    }
}
