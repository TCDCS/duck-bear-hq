using System.Collections.Generic;
using Danao.Core;
using Danao.Fighters;
using UnityEngine;
using UnityEngine.InputSystem;

namespace Danao.Input
{
    public sealed class LocalInputHub : MonoBehaviour
    {
        private readonly Dictionary<int, Gamepad> _boundPads = new Dictionary<int, Gamepad>();
        private bool _keyboardJoined;

        public int JoinedCount => (_keyboardJoined ? 1 : 0) + _boundPads.Count;
        public bool KeyboardJoined => _keyboardJoined;

        public bool PollJoin()
        {
            var changed = false;
            if (!_keyboardJoined && !_boundPads.ContainsKey(0) && Keyboard.current != null)
            {
                var k = Keyboard.current;
                if (k.enterKey.wasPressedThisFrame || k.spaceKey.wasPressedThisFrame)
                {
                    _keyboardJoined = true;
                    changed = true;
                }
            }

            foreach (var pad in Gamepad.all)
            {
                if (IsBound(pad)) continue;
                if (!pad.startButton.wasPressedThisFrame) continue;
                if (JoinedCount >= 4) break;
                var slot = NextFreeSlot();
                if (slot < 0) break;
                _boundPads[slot] = pad;
                changed = true;
            }
            return changed;
        }

        public string SlotLabel(int slot)
        {
            if (_keyboardJoined && slot == 0) return "KEYBOARD";
            if (_boundPads.TryGetValue(slot, out var pad) && pad != null) return pad.displayName.ToUpperInvariant();
            return "EMPTY";
        }

        public FighterInput ReadSlot(int slot)
        {
            var move = Vector2.zero;
            var jump = false;
            var punch = false;
            var grab = false;
            var dodge = false;
            var fire = false;
            var block = false;
            var pause = false;

            if (_keyboardJoined && slot == 0 && Keyboard.current != null)
            {
                var k = Keyboard.current;
                move.x += (k.dKey.isPressed || k.rightArrowKey.isPressed ? 1f : 0f) - (k.aKey.isPressed || k.leftArrowKey.isPressed ? 1f : 0f);
                move.y += (k.wKey.isPressed || k.upArrowKey.isPressed ? 1f : 0f) - (k.sKey.isPressed || k.downArrowKey.isPressed ? 1f : 0f);
                jump |= k.spaceKey.wasPressedThisFrame;
                punch |= k.xKey.wasPressedThisFrame || k.jKey.wasPressedThisFrame;
                grab |= k.eKey.wasPressedThisFrame || k.kKey.wasPressedThisFrame;
                dodge |= k.leftShiftKey.wasPressedThisFrame || k.lKey.wasPressedThisFrame;
                fire |= k.fKey.wasPressedThisFrame;
                block |= k.qKey.isPressed;
                pause |= k.escapeKey.wasPressedThisFrame;
            }

            if (_boundPads.TryGetValue(slot, out var pad) && pad != null)
            {
                if (pad.leftStick.ReadValue().sqrMagnitude > move.sqrMagnitude) move = pad.leftStick.ReadValue();
                if (pad.dpad.ReadValue().sqrMagnitude > move.sqrMagnitude) move = pad.dpad.ReadValue();
                jump |= pad.buttonSouth.wasPressedThisFrame;
                punch |= pad.buttonWest.wasPressedThisFrame;
                grab |= pad.buttonNorth.wasPressedThisFrame;
                dodge |= pad.buttonEast.wasPressedThisFrame;
                fire |= pad.rightTrigger.wasPressedThisFrame;
                block |= pad.leftTrigger.isPressed;
                pause |= pad.startButton.wasPressedThisFrame;
            }

            return new FighterInput(Vector2.ClampMagnitude(move, 1f), jump, punch, grab, dodge, fire, block, pause);
        }

        private int NextFreeSlot()
        {
            var first = _keyboardJoined ? 1 : 0;
            for (var slot = first; slot < 4; slot++)
                if (!_boundPads.ContainsKey(slot)) return slot;
            return -1;
        }

        private bool IsBound(Gamepad pad)
        {
            foreach (var bound in _boundPads.Values)
                if (bound == pad) return true;
            return false;
        }
    }
}
