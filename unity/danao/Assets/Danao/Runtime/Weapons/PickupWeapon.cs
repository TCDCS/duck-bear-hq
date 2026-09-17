using Danao.Audio;
using Danao.Combat;
using Danao.Fighters;
using UnityEngine;

namespace Danao.Weapons
{
    [RequireComponent(typeof(Rigidbody))]
    public sealed class PickupWeapon : MonoBehaviour
    {
        private Rigidbody _body;
        private Collider _collider;
        private FighterController _holder;
        private int _ammo;
        private float _nextUse;
        private float _nextImpactDamage;
        private int _lastOwnerSlot = -1;
        private int _lastOwnerTeam = -1;
        private bool _lastFriendlyFire = true;

        public WeaponDefinition Definition { get; private set; }
        public bool IsHeld => _holder != null;

        public void Configure(WeaponDefinition definition)
        {
            Definition = definition;
            _ammo = definition.Ammo;
            _body = GetComponent<Rigidbody>();
            _collider = GetComponent<Collider>();
            _body.mass = definition.Kind == WeaponKind.Anvil ? 15f : definition.Heavy ? 9f : definition.Kind == WeaponKind.BowlingBall ? 8f : 3.2f;
            _body.interpolation = RigidbodyInterpolation.Interpolate;
            _body.collisionDetectionMode = CollisionDetectionMode.ContinuousDynamic;
        }

        public void PickUp(FighterController holder)
        {
            if (_holder != null) return;
            _holder = holder;
            _lastOwnerSlot = holder.Slot;
            _lastOwnerTeam = holder.Team;
            _lastFriendlyFire = holder.Settings.FriendlyFire;
            _body.linearVelocity = Vector3.zero;
            _body.angularVelocity = Vector3.zero;
            _body.isKinematic = true;
            _collider.enabled = false;
            transform.SetParent(holder.HandAnchor, false);
            transform.localPosition = Vector3.zero;
            transform.localRotation = Quaternion.identity;
        }

        public void UseMelee(FighterController owner)
        {
            if (Definition.Ranged)
            {
                Fire(owner);
                return;
            }
            if (Time.time < _nextUse) return;
            _nextUse = Time.time + Definition.Cooldown;
            var centre = owner.transform.position + Vector3.up * .3f + owner.Facing * 1.45f;
            var hits = Physics.OverlapSphere(centre, Definition.Kind == WeaponKind.WrestlingTable ? 1.3f : .9f, ~0, QueryTriggerInteraction.Ignore);
            foreach (var hit in hits)
            {
                var health = hit.GetComponentInParent<FighterHealth>();
                if (health == null || health == owner.Health) continue;
                var target = health.GetComponent<FighterController>();
                if (target != null && !owner.Settings.FriendlyFire && target.Team == owner.Team) continue;
                health.ApplyDamage(Definition.Damage, (owner.Facing + Vector3.up * .18f) * Definition.Knockback, owner.Slot);
                if (target != null) FighterCombat.NotifyHit(owner.Slot, target.Slot);
                ProceduralAudio.Active?.Play(Definition.Kind == WeaponKind.NoveltyFloppy ? SfxId.Squeak : SfxId.WeaponHit);
                if (Definition.Kind == WeaponKind.WrestlingTable) BreakTable();
                return;
            }
            if (Definition.Kind == WeaponKind.NoveltyFloppy) ProceduralAudio.Active?.Play(SfxId.Squeak);
        }

        public void Fire(FighterController owner)
        {
            if (!Definition.Ranged || Time.time < _nextUse) return;
            if (_ammo == 0)
            {
                ProceduralAudio.Active?.Play(SfxId.Empty);
                return;
            }
            _nextUse = Time.time + Definition.Cooldown;
            if (_ammo > 0) _ammo--;
            var muzzle = owner.transform.position + Vector3.up * .45f + owner.Facing * 1.35f;
            Projectile.Spawn(Definition, muzzle, owner.Facing, owner.Slot, owner.Team, owner.Settings.FriendlyFire);
            ProceduralAudio.Active?.Play(Definition.Kind == WeaponKind.Bazooka ? SfxId.Rocket : SfxId.Pop);
        }

        public void Throw(FighterController owner, Vector3 velocity) => Detach(owner, velocity);
        public void Drop(FighterController owner, Vector3 velocity) => Detach(owner, velocity);

        private void Detach(FighterController owner, Vector3 velocity)
        {
            if (_holder != owner) return;
            transform.SetParent(null, true);
            _holder = null;
            _collider.enabled = true;
            _body.isKinematic = false;
            _body.linearVelocity = velocity;
            _body.angularVelocity = new Vector3(3f, 5f, -4f);
            _nextImpactDamage = Time.time + .08f;
        }

        private void OnCollisionEnter(Collision collision)
        {
            if (_holder != null || Definition == null || Time.time < _nextImpactDamage) return;
            if (_body.linearVelocity.magnitude < 5f) return;
            var health = collision.collider.GetComponentInParent<FighterHealth>();
            if (health == null) return;
            var target = health.GetComponent<FighterController>();
            if (target != null && !_lastFriendlyFire && target.Team == _lastOwnerTeam) return;
            var attacker = _lastOwnerSlot;
            var damage = Mathf.Clamp(Mathf.RoundToInt(Definition.Damage * Mathf.InverseLerp(5f, 14f, _body.linearVelocity.magnitude)), 4, Definition.Damage);
            health.ApplyDamage(damage, _body.linearVelocity.normalized * Definition.Knockback, attacker);
            if (target != null && attacker >= 0) FighterCombat.NotifyHit(attacker, target.Slot);
            _nextImpactDamage = Time.time + .45f;
            ProceduralAudio.Active?.Play(Definition.Kind == WeaponKind.NoveltyFloppy ? SfxId.Squeak : SfxId.WeaponHit);
            if (Definition.Kind == WeaponKind.WrestlingTable && _body.linearVelocity.magnitude > 8f) BreakTable();
        }

        private void BreakTable()
        {
            ProceduralAudio.Active?.Play(SfxId.TableBreak);
            transform.localScale = Vector3.Scale(transform.localScale, new Vector3(1f,.25f,1f));
            Definition.Damage = Mathf.Max(5, Definition.Damage / 2);
        }
    }
}
