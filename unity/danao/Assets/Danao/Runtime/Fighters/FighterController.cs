using Danao.Combat;
using Danao.Core;
using UnityEngine;

namespace Danao.Fighters
{
    [RequireComponent(typeof(Rigidbody))]
    public sealed class FighterController : MonoBehaviour
    {
        private const float MoveSpeed = 7.2f;
        private const float Acceleration = 38f;
        private const float JumpImpulse = 7.6f;
        private const float DodgeImpulse = 5.6f;

        private FighterInput _pendingInput;
        private float _dodgeCooldown;
        private Vector3 _facing = Vector3.forward;
        private bool _controlSuppressed;
        private bool _combatAuthority = true;
        private Rigidbody _body;
        private FighterCombat _combat;
        private FighterHealth _health;
        private ArcadeKnockdown _knockdown;

        public int Slot { get; private set; }
        public int Team { get; private set; }
        public string DisplayName { get; private set; }
        public Transform HandAnchor { get; private set; }
        public Rigidbody Body => _body;
        public FighterCombat Combat => _combat;
        public FighterHealth Health => _health;
        public MatchSettings Settings { get; private set; }
        public Vector3 Facing => _facing;
        public bool ControlSuppressed => _controlSuppressed;
        public bool CombatAuthority => _combatAuthority;

        public void Configure(int slot, int team, string displayName, MatchSettings settings, Transform handAnchor)
        {
            Slot = slot;
            Team = team;
            DisplayName = displayName;
            Settings = settings;
            HandAnchor = handAnchor;
            _body = GetComponent<Rigidbody>();
            _combat = GetComponent<FighterCombat>();
            _health = GetComponent<FighterHealth>();
            _knockdown = GetComponent<ArcadeKnockdown>();
            _body.mass = 72f;
            _body.linearDamping = 5.5f;
            _body.angularDamping = 4f;
            _body.interpolation = RigidbodyInterpolation.Interpolate;
            _body.collisionDetectionMode = CollisionDetectionMode.ContinuousDynamic;
            _body.constraints = RigidbodyConstraints.FreezeRotationX | RigidbodyConstraints.FreezeRotationZ;
            _health.Configure(settings, this);
            _combat.Configure(this, settings);
            _knockdown.Configure(_body, this);
        }

        public void TickInput(FighterInput input)
        {
            _pendingInput = input;
            if (_controlSuppressed || _health.IsEliminated) return;
            if (_combatAuthority)
            {
                _health.SetBlocking(input.Block);
                if (input.Punch) _combat.UseMelee();
                if (input.Grab) _combat.TryGrabOrThrow();
                if (input.Fire) _combat.FireHeldWeapon();
            }
        }

        private void FixedUpdate()
        {
            if (_body == null || _health == null) return;
            _dodgeCooldown -= Time.fixedDeltaTime;
            if (_controlSuppressed || _health.IsEliminated) return;

            var move = new Vector3(_pendingInput.Move.x, 0f, _pendingInput.Move.y);
            if (move.sqrMagnitude > .04f) _facing = move.normalized;
            var velocity = _body.linearVelocity;
            var desired = move * MoveSpeed * (_combat == null ? 1f : _combat.MovementMultiplier);
            var currentPlanar = new Vector3(velocity.x, 0f, velocity.z);
            var change = Vector3.ClampMagnitude(desired - currentPlanar, Acceleration * Time.fixedDeltaTime);
            _body.AddForce(change * _body.mass / Time.fixedDeltaTime, ForceMode.Force);

            if (_pendingInput.Jump && IsGrounded())
            {
                _body.AddForce(Vector3.up * JumpImpulse, ForceMode.VelocityChange);
            }

            if (_pendingInput.Dodge && _dodgeCooldown <= 0f)
            {
                var dir = move.sqrMagnitude > .04f ? move.normalized : _facing;
                _body.AddForce(dir * DodgeImpulse, ForceMode.VelocityChange);
                _dodgeCooldown = .8f;
            }

            if (_facing.sqrMagnitude > .01f)
            {
                transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(_facing), .22f);
            }
        }

        private bool IsGrounded()
        {
            return Physics.Raycast(transform.position + Vector3.up * .15f, Vector3.down, 1.25f, ~0, QueryTriggerInteraction.Ignore);
        }

        public void Knockdown(Vector3 impulse, float seconds, bool permanent = false)
        {
            _knockdown.Begin(impulse, seconds, permanent);
        }

        public void SetControlSuppressed(bool value)
        {
            _controlSuppressed = value;
            if (value && _health != null) _health.SetBlocking(false);
        }

        public void SetCombatAuthority(bool value)
        {
            _combatAuthority = value;
            if (!value && _health != null) _health.SetBlocking(false);
        }

        public void ResetFighter(Vector3 position)
        {
            _combat.DropHeldWeapon(false);
            transform.position = position;
            transform.rotation = Quaternion.identity;
            _body.linearVelocity = Vector3.zero;
            _body.angularVelocity = Vector3.zero;
            _knockdown.ResetDoll();
            _health.ResetHealth();
            _controlSuppressed = false;
        }
    }
}
