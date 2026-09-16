using Danao.Audio;
using Danao.Combat;
using UnityEngine;

namespace Danao.Weapons
{
    public sealed class Projectile : MonoBehaviour
    {
        private WeaponDefinition _definition;
        private int _ownerSlot;
        private Rigidbody _body;
        private int _ownerTeam;
        private bool _friendlyFire;
        private bool _spent;

        public static Projectile Spawn(WeaponDefinition definition, Vector3 position, Vector3 direction, int ownerSlot, int ownerTeam, bool friendlyFire)
        {
            var go = GameObject.CreatePrimitive(definition.Kind == WeaponKind.Bazooka ? PrimitiveType.Capsule : PrimitiveType.Sphere);
            go.name = definition.Kind == WeaponKind.Bazooka ? "CartoonRocket" : "FoamDart";
            go.transform.position = position;
            go.transform.localScale = definition.Kind == WeaponKind.Bazooka ? new Vector3(.26f,.62f,.26f) : Vector3.one * .22f;
            if (definition.Kind == WeaponKind.Bazooka) go.transform.rotation = Quaternion.LookRotation(direction) * Quaternion.Euler(90f,0f,0f);
            var renderer = go.GetComponent<Renderer>();
            var shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            renderer.material = new Material(shader) { color = definition.Kind == WeaponKind.Bazooka ? new Color(.94f,.28f,.18f) : new Color(.98f,.83f,.26f) };
            var body = go.AddComponent<Rigidbody>();
            body.useGravity = definition.Kind != WeaponKind.Bazooka;
            body.collisionDetectionMode = CollisionDetectionMode.ContinuousDynamic;
            body.linearVelocity = direction.normalized * definition.ProjectileSpeed;
            var projectile = go.AddComponent<Projectile>();
            projectile._definition = WeaponDefinition.For(definition.Kind);
            projectile._ownerSlot = ownerSlot;
            projectile._ownerTeam = ownerTeam;
            projectile._friendlyFire = friendlyFire;
            projectile._body = body;
            Destroy(go, 6f);
            return projectile;
        }

        private void OnCollisionEnter(Collision collision)
        {
            if (_spent) return;
            _spent = true;
            if (_definition.Kind == WeaponKind.Bazooka) Explode();
            else
            {
                var health = collision.collider.GetComponentInParent<FighterHealth>();
                var fighter = health != null ? health.GetComponent<Danao.Fighters.FighterController>() : null;
                if (health != null && fighter != null && fighter.Slot != _ownerSlot && (_friendlyFire || fighter.Team != _ownerTeam))
                    health.ApplyDamage(_definition.Damage, _body.linearVelocity.normalized * _definition.Knockback, _ownerSlot);
                Destroy(gameObject);
            }
        }

        private void Explode()
        {
            var centre = transform.position;
            var radius = Mathf.Max(1f, _definition.ExplosionRadius);
            foreach (var hit in Physics.OverlapSphere(centre, radius, ~0, QueryTriggerInteraction.Ignore))
            {
                var health = hit.GetComponentInParent<FighterHealth>();
                if (health == null) continue;
                var fighter = health.GetComponent<Danao.Fighters.FighterController>();
                if (fighter == null) continue;
                if (!_friendlyFire && fighter.Team == _ownerTeam && fighter.Slot != _ownerSlot) continue;
                var distance = Vector3.Distance(centre, fighter.transform.position);
                var falloff = Mathf.Clamp01(1f - distance / radius);
                var damage = Mathf.RoundToInt(_definition.Damage * falloff);
                if (damage <= 0) continue;
                var direction = (fighter.transform.position - centre).normalized;
                health.ApplyDamage(damage, (direction + Vector3.up * .28f).normalized * (_definition.Knockback * falloff), _ownerSlot);
            }
            ProceduralAudio.Active?.Play(SfxId.RocketBoom);
            Destroy(gameObject);
        }
    }
}
