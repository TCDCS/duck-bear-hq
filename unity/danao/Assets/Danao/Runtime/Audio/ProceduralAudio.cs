using System;
using System.Collections.Generic;
using UnityEngine;

namespace Danao.Audio
{
    public enum SfxId { Punch, WeaponHit, Grab, Throw, Squeak, Pop, Rocket, RocketBoom, TableBreak, Knockout, RoundStart, Victory, Empty, Bounce }

    public sealed class ProceduralAudio : MonoBehaviour
    {
        private const int Rate = 22050;
        private readonly Dictionary<SfxId, AudioClip> _sfx = new Dictionary<SfxId, AudioClip>();
        private AudioSource _music;
        private AudioSource _effects;
        private AudioClip _titleTheme;
        private AudioClip _fightTheme;
        private System.Random _random = new System.Random(1428);
        public static ProceduralAudio Active { get; private set; }

        private void Awake()
        {
            Active = this;
            _music = gameObject.AddComponent<AudioSource>();
            _effects = gameObject.AddComponent<AudioSource>();
            _music.loop = true;
            _music.volume = .34f;
            _effects.volume = .78f;
            BuildEffects();
            _titleTheme = BuildMusic("Danao_Title", 12f, true);
            _fightTheme = BuildMusic("Danao_Fight", 8f, false);
        }

        public void Play(SfxId id, float volume = 1f)
        {
            if (_effects == null || !_sfx.TryGetValue(id, out var clip)) return;
            _effects.PlayOneShot(clip, volume);
        }

        public void PlayTitleMusic()
        {
            if (_music.clip == _titleTheme && _music.isPlaying) return;
            _music.clip = _titleTheme;
            _music.Play();
        }

        public void PlayFightMusic()
        {
            if (_music.clip == _fightTheme && _music.isPlaying) return;
            _music.clip = _fightTheme;
            _music.Play();
        }

        public void SetVolumes(float music, float sfx)
        {
            _music.volume = Mathf.Clamp01(music);
            _effects.volume = Mathf.Clamp01(sfx);
        }

        private void BuildEffects()
        {
            _sfx[SfxId.Punch] = MakeClip("Punch", .15f, t => Noise(1f - t) * .5f + Tone(92f, t) * (1f - t) * .45f);
            _sfx[SfxId.WeaponHit] = MakeClip("WeaponHit", .18f, t => Tone(155f, t) * (1f - t) * .45f + Noise(1f - t) * .35f);
            _sfx[SfxId.Grab] = MakeClip("Grab", .12f, t => Tone(420f + 220f * t, t) * (1f - t) * .42f);
            _sfx[SfxId.Throw] = MakeClip("Throw", .22f, t => Noise(1f - t) * .22f + Tone(260f - 120f * t, t) * .18f);
            _sfx[SfxId.Squeak] = MakeClip("Squeak", .32f, t => Tone(820f + Mathf.Sin(t * 12f) * 240f, t) * Mathf.Sin(Mathf.PI * t) * .56f);
            _sfx[SfxId.Pop] = MakeClip("Pop", .09f, t => Tone(640f - 240f * t, t) * (1f - t) * .45f);
            _sfx[SfxId.Rocket] = MakeClip("Rocket", .34f, t => Noise(1f - t) * .25f + Tone(110f + t * 80f, t) * .25f);
            _sfx[SfxId.RocketBoom] = MakeClip("RocketBoom", .48f, t => Noise(1f - t) * .62f + Tone(54f, t) * (1f - t) * .36f);
            _sfx[SfxId.TableBreak] = MakeClip("TableBreak", .31f, t => Noise(1f - t) * .58f + Tone(138f, t) * .22f);
            _sfx[SfxId.Knockout] = MakeClip("Knockout", .62f, t => Tone(330f - 180f * t, t) * (1f - t) * .45f + Tone(165f, t) * .2f);
            _sfx[SfxId.RoundStart] = MakeClip("RoundStart", .46f, t => Tone(t < .5f ? 440f : 660f, t) * Mathf.Sin(Mathf.PI * t) * .45f);
            _sfx[SfxId.Victory] = MakeClip("Victory", .9f, t => Tone(new[] { 523f,659f,784f,1046f }[Mathf.Min(3,(int)(t*4f))], t) * .38f);
            _sfx[SfxId.Empty] = MakeClip("Empty", .13f, t => Mathf.Sign(Mathf.Sin(t * 90f)) * (1f - t) * .18f);
            _sfx[SfxId.Bounce] = MakeClip("Bounce", .2f, t => Tone(190f + t * 360f, t) * (1f - t) * .32f);
        }

        private AudioClip MakeClip(string name, float seconds, Func<float, float> synth)
        {
            var length = Mathf.Max(64, Mathf.RoundToInt(seconds * Rate));
            var data = new float[length];
            for (var i = 0; i < length; i++) data[i] = Mathf.Clamp(synth(i / (float)length), -.92f, .92f);
            var clip = AudioClip.Create(name, length, 1, Rate, false);
            clip.SetData(data, 0);
            return clip;
        }

        private AudioClip BuildMusic(string name, float seconds, bool title)
        {
            var length = Mathf.RoundToInt(seconds * Rate);
            var data = new float[length];
            var scale = title ? new[] { 293.66f, 349.23f, 440f, 523.25f, 659.25f } : new[] { 220f, 261.63f, 329.63f, 392f, 523.25f };
            var beat = title ? .30f : .25f;
            for (var i = 0; i < length; i++)
            {
                var time = i / (float)Rate;
                var beatIndex = (int)(time / beat);
                var beatT = (time % beat) / beat;
                var note = scale[(beatIndex * 2 + beatIndex / 3) % scale.Length];
                var melody = Tone(note, time) * Mathf.Exp(-beatT * 3.2f) * .19f;
                var drumPhase = time % (beat * 2f);
                var drum = drumPhase < .08f ? Mathf.Sin(time * 2f * Mathf.PI * 72f) * Mathf.Exp(-drumPhase * 32f) * .24f : 0f;
                var hatPhase = time % beat;
                var hat = hatPhase < .045f ? HashNoise(i) * Mathf.Exp(-hatPhase * 55f) * .08f : 0f;
                var gongPeriod = title ? 2.4f : 4f;
                var gongPhase = time % gongPeriod;
                var gong = gongPhase < 1.1f ? (Tone(146.83f, time) + Tone(220f, time) * .35f) * Mathf.Exp(-gongPhase * 2.6f) * .11f : 0f;
                data[i] = Mathf.Clamp(melody + drum + hat + gong, -.78f, .78f);
            }
            var clip = AudioClip.Create(name, length, 1, Rate, false);
            clip.SetData(data, 0);
            return clip;
        }

        private static float Tone(float frequency, float time) => Mathf.Sin(time * frequency * Mathf.PI * 2f);
        private float Noise(float envelope) => ((float)_random.NextDouble() * 2f - 1f) * envelope;
        private static float HashNoise(int value)
        {
            unchecked
            {
                var x = value * 1103515245 + 12345;
                return ((x >> 16) & 0x7fff) / 16383.5f - 1f;
            }
        }
    }
}
