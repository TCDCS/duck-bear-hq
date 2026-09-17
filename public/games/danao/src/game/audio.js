const NOTES = Object.freeze([261.63, 293.66, 329.63, 392, 440]);

export function buildMusicPattern(mode = 'fight') {
  if (mode === 'menu') return [392, 329.63, 293.66, 0, 261.63, 293.66, 392, 440, 392, 0, 329.63, 293.66, 261.63, 329.63, 392, 0];
  return [261.63, 0, 329.63, 392, 440, 392, 329.63, 293.66, 261.63, 293.66, 329.63, 0, 392, 440, 392, 293.66];
}

export function createArcadeAudio(initialSettings = {}) {
  let settings = { masterVolume: 0.72, music: true, sfx: true, ...initialSettings };
  const AudioCtor = globalThis.AudioContext || globalThis.webkitAudioContext;
  let context = null;
  let master = null;
  let musicTimer = null;
  let musicMode = 'fight';
  let step = 0;

  function ensure() {
    if (!AudioCtor) return false;
    if (!context) {
      context = new AudioCtor();
      master = context.createGain();
      master.gain.value = settings.masterVolume;
      master.connect(context.destination);
    }
    if (context.state === 'suspended') context.resume().catch(() => {});
    return true;
  }

  function tone(frequency, duration = 0.08, volume = 0.08, type = 'square', slideTo = null) {
    if (!ensure() || !settings.sfx) return;
    const now = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), now + duration);
    gain.gain.setValueAtTime(Math.max(0.0001, volume), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function pluck(frequency, volume = 0.035) {
    if (!ensure() || !settings.music || !frequency) return;
    const now = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  function drum(accent = false) {
    if (!ensure() || !settings.music) return;
    const now = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(accent ? 120 : 82, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.09);
    gain.gain.setValueAtTime(accent ? 0.065 : 0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  function musicTick() {
    if (!context || !settings.music) return;
    const pattern = buildMusicPattern(musicMode);
    const note = pattern[step % pattern.length];
    if (note) pluck(note, step % 4 === 0 ? 0.045 : 0.028);
    if (step % 4 === 0) drum(step % 8 === 0);
    step += 1;
  }

  return {
    unlock() { ensure(); },
    startMusic(mode = 'fight') {
      if (!ensure()) return;
      const nextMode = mode === 'menu' ? 'menu' : 'fight';
      if (musicTimer && musicMode === nextMode) return;
      if (musicTimer) globalThis.clearInterval(musicTimer);
      musicMode = nextMode;
      step = 0;
      musicTimer = globalThis.setInterval(musicTick, nextMode === 'menu' ? 235 : 185);
    },
    stopMusic() {
      if (musicTimer) globalThis.clearInterval(musicTimer);
      musicTimer = null;
    },
    hit(heavy = false) { tone(heavy ? 88 : 132, heavy ? 0.13 : 0.08, heavy ? 0.13 : 0.085, 'square', heavy ? 45 : 72); },
    jump() { tone(260, 0.11, 0.055, 'triangle', 520); },
    dodge() { tone(430, 0.07, 0.04, 'sawtooth', 170); },
    ringOut() { tone(180, 0.33, 0.12, 'sawtooth', 42); },
    win() {
      if (!ensure() || !settings.sfx) return;
      [NOTES[0], NOTES[2], NOTES[3], NOTES[4] * 2].forEach((note, index) => {
        globalThis.setTimeout(() => tone(note, 0.13, 0.07, 'triangle'), index * 95);
      });
    },
    updateSettings(next) {
      settings = { ...settings, ...next };
      if (master) master.gain.value = settings.masterVolume;
    },
    dispose() {
      this.stopMusic();
      if (context) context.close().catch(() => {});
      context = null;
      master = null;
    },
  };
}
