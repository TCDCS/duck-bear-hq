using UnityEngine;

namespace Danao.Fighters
{
    public readonly struct FighterInput
    {
        public readonly Vector2 Move;
        public readonly bool Jump;
        public readonly bool Punch;
        public readonly bool Grab;
        public readonly bool Dodge;
        public readonly bool Fire;
        public readonly bool Block;
        public readonly bool Pause;

        public FighterInput(Vector2 move, bool jump, bool punch, bool grab, bool dodge, bool fire, bool block, bool pause)
        {
            Move = move;
            Jump = jump;
            Punch = punch;
            Grab = grab;
            Dodge = dodge;
            Fire = fire;
            Block = block;
            Pause = pause;
        }
    }
}
