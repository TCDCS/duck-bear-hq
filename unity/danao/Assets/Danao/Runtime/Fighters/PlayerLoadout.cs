namespace Danao.Fighters
{
    [System.Serializable]
    public sealed class PlayerLoadout
    {
        public CharacterId Character = CharacterId.Hero;
        public CostumeId Costume = CostumeId.Arcade;
        public PlayerLoadout() { }
        public PlayerLoadout(CharacterId character, CostumeId costume) { Character = character; Costume = costume; }
        public PlayerLoadout Clone() => new PlayerLoadout(Character, Costume);
    }
}
