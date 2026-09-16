using System;
using Danao.Audio;
using Danao.Core;
using Danao.Fighters;
using Danao.Weapons;
using UnityEngine;

namespace Danao.Combat
{
    public sealed class FighterCombat : MonoBehaviour
    {
        public static event Action<int,int> FighterHit;
        public static void NotifyHit(int attackerSlot, int targetSlot) => FighterHit?.Invoke(attackerSlot, targetSlot);
        private FighterController _owner;
        private MatchSettings _settings;
        private PickupWeapon _held;
        private float _nextPunch;

        public PickupWeapon Held => _held;
        public float MovementMultiplier => _held == null ? 1f : _held.Definition.CarrySpeedMultiplier;

        public void Configure(FighterController owner, MatchSettings settings)
        {
            _owner = owner;
            _settings = settings;
        }

        public void UseMelee()
        {
            if (Time.time < _nextPunch || _owner.ControlSuppressed) return;
            if (_held != null)
            {
                _held.UseMelee(_owner);
                _nextPunch = Time.time + _held.Definition.Cooldown;
                return;
            }

            _nextPunch = Time.time + .38f;
            var centre = _owner.transform.position + Vector3.up * .35f + _owner.Facing * 1.25f;
            var hits = Physics.OverlapSphere(centre, .8f, ~0, QueryTriggerInteraction.Ignore);
            foreach (var hit in hits)
            {
                var health = hit.GetComponentInParent<FighterHealth>();
                if (health == null || health == _owner.Health) continue;
                var target = health.GetComponent<FighterController>();
                if (target == null) continue;
                if (!_settings.FriendlyFire && target.Team == _owner.Team) continue;
                health.ApplyDamage(8, (_owner.Facing + Vector3.up * .14f) * 6.8f, _owner.Slot);
                NotifyHit(_owner.Slot, target.Slot);
                ProceduralAudio.Active?.Play(SfxId.Punch);
                break;
            }
        }

        public void TryGrabOrThrow()
        {
            if (_owner.ControlSuppressed) return;
            if (_held != null)
            {
                ThrowHeld();
                return;
            }

            var centre = _owner.transform.position + Vector3.up * .2f + _owner.Facing * .9f;
            var hits = Physics.OverlapSphere(centre, 1.35f, ~0, QueryTriggerInteraction.Collide);
            PickupWeapon best = null;
            var bestDistance = float.PositiveInfinity;
            foreach (var hit in hits)
            {
                var item = hit.GetComponentInParent<PickupWeapon>();
                if (item == null || item.IsHeld) continue;
                var distance = Vector3.SqrMagnitude(item.transform.position - centre);
                if (distance >= bestDistance) continue;
                best = item;
                bestDistance = distance;
            }

            if (best != null)
            {
                _held = best;
                _held.PickUp(_owner);
                ProceduralAudio.Active?.Play(SfxId.Grab);
            }
        }

        public void FireHeldWeapon()
        {
            if (_held == null || _owner.ControlSuppressed) return;
            _held.Fire(_owner);
        }

        private void ThrowHeld()
        {
            if (_held == null) return;
            var item = _held;
            _held = null;
            item.Throw(_owner, (_owner.Facing + Vector3.up * .23f).normalized * 12.5f);
            ProceduralAudio.Active?.Play(SfxId.Throw);
        }

        public void DropHeldWeapon(bool toss = true)
        {
            if (_held == null) return;
            var item = _held;
            _held = null;
            item.Drop(_owner, toss ? _owner.Facing * 3f + Vector3.up * 1.2f : Vector3.zero);
        }
    }
}
