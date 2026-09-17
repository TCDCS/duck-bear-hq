using System.Collections.Generic;
using UnityEngine;

namespace Danao.Fighters
{
    public sealed class ArcadeKnockdown : MonoBehaviour
    {
        private sealed class Limb
        {
            public Rigidbody Body;
            public Collider Collider;
            public Vector3 LocalPosition;
            public Quaternion LocalRotation;
        }

        private readonly List<Limb> _limbs = new List<Limb>();
        private Rigidbody _root;
        private FighterController _controller;
        private float _remaining;
        private bool _permanent;

        public bool IsDown { get; private set; }

        public void Configure(Rigidbody root, FighterController controller)
        {
            _root = root;
            _controller = controller;
        }

        public void RegisterLimb(Rigidbody body, Collider collider)
        {
            body.isKinematic = true;
            body.useGravity = false;
            collider.enabled = false;
            _limbs.Add(new Limb
            {
                Body = body,
                Collider = collider,
                LocalPosition = body.transform.localPosition,
                LocalRotation = body.transform.localRotation
            });
        }

        public void Begin(Vector3 impulse, float seconds, bool permanent = false)
        {
            if (_root == null) return;
            IsDown = true;
            _permanent = permanent;
            _remaining = Mathf.Max(_remaining, seconds);
            _controller.SetControlSuppressed(true);
            _root.constraints = RigidbodyConstraints.None;
            _root.AddForce(impulse, ForceMode.Impulse);
            _root.AddTorque(new Vector3(impulse.z, impulse.x * .4f, -impulse.x) * .35f, ForceMode.Impulse);

            foreach (var limb in _limbs)
            {
                limb.Collider.enabled = true;
                limb.Body.isKinematic = false;
                limb.Body.useGravity = true;
                limb.Body.linearVelocity = _root.linearVelocity;
                limb.Body.AddForce(impulse * .35f, ForceMode.Impulse);
            }
        }

        private void Update()
        {
            if (!IsDown || _permanent) return;
            _remaining -= Time.deltaTime;
            if (_remaining <= 0f) Recover();
        }

        public void Recover()
        {
            if (_root == null) return;
            foreach (var limb in _limbs)
            {
                limb.Body.linearVelocity = Vector3.zero;
                limb.Body.angularVelocity = Vector3.zero;
                limb.Body.isKinematic = true;
                limb.Body.useGravity = false;
                limb.Collider.enabled = false;
                limb.Body.transform.localPosition = limb.LocalPosition;
                limb.Body.transform.localRotation = limb.LocalRotation;
            }

            var yaw = _root.rotation.eulerAngles.y;
            _root.rotation = Quaternion.Euler(0f, yaw, 0f);
            _root.angularVelocity = Vector3.zero;
            _root.constraints = RigidbodyConstraints.FreezeRotationX | RigidbodyConstraints.FreezeRotationZ;
            IsDown = false;
            _permanent = false;
            _remaining = 0f;
            _controller.SetControlSuppressed(false);
        }

        public void ResetDoll()
        {
            _permanent = false;
            Recover();
        }
    }
}
