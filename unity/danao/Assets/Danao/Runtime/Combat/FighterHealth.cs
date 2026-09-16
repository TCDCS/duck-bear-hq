using System;
using Danao.Audio;
using Danao.Core;
using Danao.Fighters;
using UnityEngine;

namespace Danao.Combat
{
    public sealed class FighterHealth : MonoBehaviour
    {
        private MatchSettings _settings;
        private FighterController _controller;
        private Renderer[] _renderers;
        private Color _baseColour = Color.white;
        private bool _blocking;

        public int CurrentHp { get; private set; } = MatchSettings.StartingHp;
        public bool IsEliminated { get; private set; }
        public bool Blocking => _blocking;
        public event Action<FighterHealth> Changed;
        public event Action<FighterHealth, int> Eliminated;

        public void Configure(MatchSettings settings, FighterController controller)
        {
            _settings = settings;
            _controller = controller;
            CurrentHp = MatchSettings.StartingHp;
        }

        public void SetVisuals(Renderer[] renderers, Color baseColour)
        {
            _renderers = renderers;
            _baseColour = baseColour;
            UpdateBruising();
        }

        public void SetBlocking(bool value) => _blocking = value;

        public void ApplyDamage(int rawDamage, Vector3 impulse, int attackerSlot)
        {
            if (IsEliminated) return;
            var damage = _blocking ? Mathf.CeilToInt(rawDamage * .4f) : rawDamage;
            var appliedImpulse = _blocking ? impulse * .62f : impulse;
            var previous = CurrentHp;
            CurrentHp = DamageModel.Apply(CurrentHp, damage, _settings.HealthDamage);
            _controller.Body.AddForce(appliedImpulse, ForceMode.Impulse);

            if (appliedImpulse.magnitude >= 6.5f)
            {
                _controller.Knockdown(appliedImpulse * .55f, Mathf.Clamp(appliedImpulse.magnitude * .09f, .35f, 1.15f));
            }

            if (CurrentHp != previous)
            {
                UpdateBruising();
                Changed?.Invoke(this);
            }

            if (_settings.HealthDamage && CurrentHp <= 0)
            {
                IsEliminated = true;
                _controller.Knockdown(appliedImpulse + Vector3.up * 2.5f, 999f, true);
                ProceduralAudio.Active?.Play(SfxId.Knockout);
                Eliminated?.Invoke(this, attackerSlot);
            }
        }

        public void EliminateByRingOut(int attackerSlot = -1)
        {
            if (IsEliminated) return;
            IsEliminated = true;
            _controller.Knockdown(Vector3.up * 2f, 999f, true);
            ProceduralAudio.Active?.Play(SfxId.Knockout);
            Eliminated?.Invoke(this, attackerSlot);
            Changed?.Invoke(this);
        }

        public void ResetHealth()
        {
            CurrentHp = MatchSettings.StartingHp;
            IsEliminated = false;
            _blocking = false;
            UpdateBruising();
            Changed?.Invoke(this);
        }

        private void UpdateBruising()
        {
            if (_renderers == null) return;
            var ratio = CurrentHp / (float)MatchSettings.StartingHp;
            var bruise = new Color(.43f, .24f, .48f);
            var target = !_settings.VisibleBruising ? _baseColour : Color.Lerp(bruise, _baseColour, Mathf.Clamp01(ratio + .16f));
            for (var i = 0; i < _renderers.Length; i++)
            {
                if (_renderers[i] == null) continue;
                var material = _renderers[i].material;
                material.color = i == 0 ? target : Color.Lerp(target, Color.white, .08f);
            }
        }
    }
}
