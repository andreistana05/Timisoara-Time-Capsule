/**
 * Procedural ambient soundscape for /stage — pure Web Audio, no files.
 *
 *   pads (detuned saw pair + triangle per voice) ─► LFO'd low-pass ─┐
 *   sub drone (sine, chord root −1 oct) ────────────────────────────┤
 *   filtered noise ("crowd" / "winter wind" / "air") ───────────────┼─► bus ─► compressor ─► master ─► analyser ─► out
 *   bells (sparkles, tolls, chimes) ─► chimeBus ──► delay ──────────┤
 *                         everything also sends into a generated ──► convolution reverb
 *
 * Each chapter has its own slowly-evolving chord progression, timbre, noise
 * colour and sparkle density. Changing chapter glides every voice to the new
 * chord and plays a filtered "whoosh" swell.
 *
 * Browsers block autoplay → `enable()` must be called from a user gesture.
 * The preference is remembered so the stage can resume on the first click.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const midi = (n) => 440 * 2 ** ((n - 69) / 12);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const PREF_KEY = 'timecapsule.stage.sound';

export const SOUNDSCAPES = {
  // A minor → F → Dm9 → E (dominant): unresolved winter tension
  '1989_piata_maria': {
    chords: [
      [45, 52, 57, 60, 64],
      [41, 48, 57, 60, 64],
      [38, 45, 53, 57, 64],
      [40, 47, 52, 56, 59],
    ],
    sawMix: 0.8,
    cutoff: 520,
    lfoDepth: 260,
    noise: { gain: 0.05, freq: 380, q: 0.7 },
    sparkle: { every: [3.5, 7.5], scale: [69, 72, 74, 76, 79], gain: 0.035 },
    toll: { every: [16, 26], note: 45 },
  },
  // D → G → Bm → A: anthemic release, 100,000 people in the square
  '1989_opera': {
    chords: [
      [38, 45, 54, 57, 62],
      [43, 50, 55, 59, 62],
      [47, 54, 59, 62, 66],
      [45, 52, 57, 61, 64],
    ],
    sawMix: 0.6,
    cutoff: 1100,
    lfoDepth: 450,
    noise: { gain: 0.035, freq: 620, q: 0.6 },
    sparkle: { every: [1.8, 4], scale: [74, 76, 78, 81, 83, 86], gain: 0.04 },
    toll: { every: [22, 34], note: 50 },
  },
  // C6/9 → F lydian → Am7 → G6: warm pentatonic mosaic
  multicultural_mosaic: {
    chords: [
      [36, 43, 52, 57, 62],
      [41, 48, 55, 60, 67],
      [45, 52, 55, 60, 64],
      [43, 50, 55, 59, 64],
    ],
    sawMix: 0.15,
    cutoff: 1700,
    lfoDepth: 700,
    noise: { gain: 0.014, freq: 2600, q: 0.5 },
    sparkle: { every: [0.9, 2.4], scale: [72, 74, 76, 79, 81, 84, 86, 88], gain: 0.032 },
    toll: null,
  },
};
const cfgFor = (id) => SOUNDSCAPES[id] || SOUNDSCAPES['1989_piata_maria'];
const CHORD_SECONDS = 16;

function makeImpulse(ctx, seconds = 5, decay = 2.6) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** decay;
  }
  return buf;
}

function makeNoise(ctx, seconds = 3) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04; // brown-ish, softer than white
    d[i] = last * 3.5;
  }
  return buf;
}

function buildGraph(ctx) {
  const master = ctx.createGain();
  master.gain.value = 0;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 3;
  const an = ctx.createAnalyser();
  an.fftSize = 2048;
  an.smoothingTimeConstant = 0.85;
  const bus = ctx.createGain();
  bus.connect(comp).connect(master).connect(an).connect(ctx.destination);

  // reverb
  const reverb = ctx.createConvolver();
  reverb.buffer = makeImpulse(ctx);
  const reverbOut = ctx.createGain();
  reverbOut.gain.value = 0.55;
  reverb.connect(reverbOut).connect(bus);

  // feedback delay (for bells)
  const delay = ctx.createDelay(2);
  delay.delayTime.value = 0.42;
  const fb = ctx.createGain();
  fb.gain.value = 0.38;
  const fbFilter = ctx.createBiquadFilter();
  fbFilter.type = 'lowpass';
  fbFilter.frequency.value = 2400;
  delay.connect(fbFilter).connect(fb).connect(delay);
  const delayOut = ctx.createGain();
  delayOut.gain.value = 0.35;
  fbFilter.connect(delayOut);
  delayOut.connect(bus);
  delayOut.connect(reverb);

  // bells bus
  const chimeBus = ctx.createGain();
  chimeBus.connect(bus);
  chimeBus.connect(delay);
  chimeBus.connect(reverb);

  // "bed" = pads + sub + noise; ducked under the Time Tuner radio (chimes stay on top)
  const bed = ctx.createGain();
  bed.gain.value = 1;
  bed.connect(bus);
  bed.connect(reverb);

  // pads
  const padFilter = ctx.createBiquadFilter();
  padFilter.type = 'lowpass';
  padFilter.frequency.value = 600;
  padFilter.Q.value = 3;
  const padOut = ctx.createGain();
  padOut.gain.value = 1;
  padFilter.connect(padOut);
  padOut.connect(bed);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.045;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 300;
  lfo.connect(lfoGain).connect(padFilter.frequency);
  lfo.start();

  const voices = Array.from({ length: 5 }, (_, i) => {
    const out = ctx.createGain();
    out.gain.value = 0;
    // slow per-voice breathing on a separate stage
    const breath = ctx.createGain();
    breath.gain.value = 0.7;
    const trem = ctx.createOscillator();
    trem.frequency.value = 0.06 + i * 0.027;
    const tremDepth = ctx.createGain();
    tremDepth.gain.value = 0.3;
    trem.connect(tremDepth).connect(breath.gain);
    trem.start();
    const pan = ctx.createStereoPanner();
    pan.pan.value = (i - 2) * 0.3;
    out.connect(breath).connect(pan).connect(padFilter);

    const saw = ctx.createGain();
    const tri = ctx.createGain();
    saw.gain.value = 0;
    tri.gain.value = 0;
    saw.connect(out);
    tri.connect(out);
    const a = ctx.createOscillator();
    const b = ctx.createOscillator();
    const t = ctx.createOscillator();
    a.type = 'sawtooth';
    b.type = 'sawtooth';
    t.type = 'triangle';
    a.detune.value = -7;
    b.detune.value = 7;
    [a, b].forEach((o) => o.connect(saw));
    t.connect(tri);
    [a, b, t].forEach((o) => {
      o.frequency.value = 110;
      o.start();
    });
    return { out, saw, tri, oscs: [a, b, t] };
  });

  // sub drone
  const sub = ctx.createOscillator();
  sub.frequency.value = 55;
  const subGain = ctx.createGain();
  subGain.gain.value = 0;
  sub.connect(subGain).connect(bed);
  sub.start();

  // noise texture
  const noise = ctx.createBufferSource();
  const noiseBuf = makeNoise(ctx, 4);
  noise.buffer = noiseBuf;
  noise.loop = true;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 400;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0;
  const noiseLfo = ctx.createOscillator();
  noiseLfo.frequency.value = 0.08;
  const noiseLfoDepth = ctx.createGain();
  noiseLfoDepth.gain.value = 0;
  noiseLfo.connect(noiseLfoDepth).connect(noiseGain.gain);
  noiseLfo.start();
  noise.connect(noiseFilter).connect(noiseGain);
  noiseGain.connect(bed);
  noise.start();

  return { master, an, bus, bed, reverb, chimeBus, noiseBuf, padFilter, lfoGain, voices, sub, subGain, noiseFilter, noiseGain, noiseLfoDepth };
}

/** Inharmonic additive bell. */
function bell(ctx, dest, freq, when, gain, decay = 4, pan = 0) {
  const p = ctx.createStereoPanner();
  p.pan.value = pan;
  p.connect(dest);
  const partials = [
    [1, 1],
    [2, 0.5],
    [2.76, 0.35],
    [5.4, 0.16],
    [8.93, 0.07],
  ];
  partials.forEach(([ratio, amp], i) => {
    const f = freq * ratio;
    if (f > ctx.sampleRate / 2.2) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = f;
    const d = decay / (1 + i * 0.6);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain * amp, when + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, when + d);
    o.connect(g).connect(p);
    o.start(when);
    o.stop(when + d + 0.05);
  });
}

export function useAmbientAudio(chapterId) {
  const ctxRef = useRef(null);
  const nodesRef = useRef(null);
  const chapterRef = useRef(chapterId);
  const enabledRef = useRef(false);
  const chordIdxRef = useRef(0);
  const bedLevelRef = useRef(1);
  const timersRef = useRef({ chord: null, sparkle: null, toll: null, suspend: null });
  const [enabled, setEnabled] = useState(false);
  const [analyser, setAnalyser] = useState(null);
  const [wantsSound] = useState(() => {
    try {
      return localStorage.getItem(PREF_KEY) === 'on';
    } catch {
      return false;
    }
  });

  const savePref = (v) => {
    try {
      localStorage.setItem(PREF_KEY, v ? 'on' : 'off');
    } catch {
      /* private mode */
    }
  };

  const applyChord = useCallback((glide = 3) => {
    const ctx = ctxRef.current;
    const n = nodesRef.current;
    if (!ctx || !n) return;
    const cfg = cfgFor(chapterRef.current);
    const chord = cfg.chords[chordIdxRef.current % cfg.chords.length];
    const now = ctx.currentTime;
    const tc = glide / 3;
    n.voices.forEach((v, i) => {
      const f = midi(chord[i]);
      v.oscs.forEach((o) => o.frequency.setTargetAtTime(f, now, tc));
      v.out.gain.setTargetAtTime(1, now, tc);
      v.saw.gain.setTargetAtTime(cfg.sawMix * 0.045, now, tc);
      v.tri.gain.setTargetAtTime((1 - cfg.sawMix) * 0.07 + 0.012, now, tc);
    });
    n.sub.frequency.setTargetAtTime(midi(chord[0] - 12), now, tc);
    n.subGain.gain.setTargetAtTime(0.09, now, tc);
    n.padFilter.frequency.setTargetAtTime(cfg.cutoff, now, tc);
    n.lfoGain.gain.setTargetAtTime(cfg.lfoDepth, now, tc);
    n.noiseFilter.frequency.setTargetAtTime(cfg.noise.freq, now, tc);
    n.noiseFilter.Q.setTargetAtTime(cfg.noise.q, now, tc);
    n.noiseGain.gain.setTargetAtTime(cfg.noise.gain, now, tc);
    n.noiseLfoDepth.gain.setTargetAtTime(cfg.noise.gain * 0.6, now, tc);
  }, []);

  /** Filtered noise whoosh + low swell for chapter transitions. */
  const swell = useCallback(() => {
    const ctx = ctxRef.current;
    const n = nodesRef.current;
    if (!ctx || !n || !enabledRef.current) return;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = n.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 2.5;
    f.frequency.setValueAtTime(180, now);
    f.frequency.exponentialRampToValueAtTime(3200, now + 2.2);
    f.frequency.exponentialRampToValueAtTime(400, now + 3.8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.35, now + 1.8);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 3.9);
    src.connect(f).connect(g);
    g.connect(n.bus);
    g.connect(n.reverb);
    src.start(now);
    src.stop(now + 4);
    const cfg = cfgFor(chapterRef.current);
    bell(ctx, n.chimeBus, midi(cfg.chords[0][0] + 12), now + 2.1, 0.12, 7);
  }, []);

  const scheduleLoops = useCallback(() => {
    const timers = timersRef.current;
    if (timers.chord) return; // already running
    timers.chord = setInterval(() => {
      if (!enabledRef.current) return;
      chordIdxRef.current += 1;
      applyChord(5);
    }, CHORD_SECONDS * 1000);

    const sparkle = () => {
      const cfg = cfgFor(chapterRef.current);
      const ctx = ctxRef.current;
      if (ctx && enabledRef.current && ctx.state === 'running') {
        const s = cfg.sparkle;
        bell(ctx, nodesRef.current.chimeBus, midi(pick(s.scale)), ctx.currentTime + 0.02, s.gain * rand(0.6, 1.2), rand(2.5, 4.5), rand(-0.8, 0.8));
      }
      timers.sparkle = setTimeout(sparkle, rand(...cfg.sparkle.every) * 1000);
    };
    timers.sparkle = setTimeout(sparkle, 1500);

    const toll = () => {
      const cfg = cfgFor(chapterRef.current);
      const ctx = ctxRef.current;
      if (cfg.toll && ctx && enabledRef.current && ctx.state === 'running') {
        bell(ctx, nodesRef.current.chimeBus, midi(cfg.toll.note), ctx.currentTime + 0.02, 0.09, 9, rand(-0.3, 0.3));
      }
      timers.toll = setTimeout(toll, rand(...(cfg.toll?.every || [20, 30])) * 1000);
    };
    timers.toll = setTimeout(toll, 6000);
  }, [applyChord]);

  const enable = useCallback(async () => {
    if (!ctxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      ctxRef.current = ctx;
      nodesRef.current = buildGraph(ctx);
      setAnalyser(nodesRef.current.an);
    }
    const ctx = ctxRef.current;
    clearTimeout(timersRef.current.suspend);
    await ctx.resume();
    const g = nodesRef.current.master.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(g.value, ctx.currentTime);
    g.linearRampToValueAtTime(0.85, ctx.currentTime + 2.5);
    nodesRef.current.bed.gain.setValueAtTime(bedLevelRef.current, ctx.currentTime);
    enabledRef.current = true;
    applyChord(2);
    scheduleLoops();
    setEnabled(true);
    savePref(true);
  }, [applyChord, scheduleLoops]);

  const disable = useCallback(() => {
    const ctx = ctxRef.current;
    enabledRef.current = false;
    setEnabled(false);
    savePref(false);
    if (!ctx) return;
    const g = nodesRef.current.master.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(g.value, ctx.currentTime);
    g.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
    timersRef.current.suspend = setTimeout(() => {
      if (!enabledRef.current) ctx.suspend();
    }, 1000);
  }, []);

  /** Level of the drone bed (0..1). Chimes and bells are unaffected. */
  const setBedLevel = useCallback((level) => {
    bedLevelRef.current = level;
    const ctx = ctxRef.current;
    const n = nodesRef.current;
    if (ctx && n) n.bed.gain.setTargetAtTime(level, ctx.currentTime, 0.8);
  }, []);

  const toggle = useCallback(() => (enabledRef.current ? disable() : enable()), [enable, disable]);

  /**
   * Resonant chime. kind: 'select' (one deep resonant bell) or 'add'
   * (ascending arpeggio blooming into a cluster).
   */
  const chime = useCallback((kind = 'add') => {
    const ctx = ctxRef.current;
    const n = nodesRef.current;
    if (!ctx || !n || !enabledRef.current) return;
    const cfg = cfgFor(chapterRef.current);
    const chord = cfg.chords[chordIdxRef.current % cfg.chords.length];
    const now = ctx.currentTime + 0.02;
    if (kind === 'select') {
      bell(ctx, n.chimeBus, midi(chord[0] + 12), now, 0.16, 8, 0);
      bell(ctx, n.chimeBus, midi(chord[4] + 12), now + 0.09, 0.09, 6, -0.4);
      bell(ctx, n.chimeBus, midi(chord[2] + 24), now + 0.18, 0.06, 5, 0.4);
      // soft sub "thump"
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(midi(chord[0]), now);
      o.frequency.exponentialRampToValueAtTime(midi(chord[0] - 12), now + 0.6);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      o.connect(g).connect(n.bus);
      o.start(now);
      o.stop(now + 1.3);
      return;
    }
    const scale = [...cfg.sparkle.scale].sort((a, b) => a - b);
    scale.slice(0, 6).forEach((note, i) => {
      bell(ctx, n.chimeBus, midi(note), now + i * 0.11, 0.1, 3.5, -0.6 + i * 0.24);
    });
    const t = now + 0.75;
    chord.slice(1).forEach((note, i) => bell(ctx, n.chimeBus, midi(note + 24), t + i * 0.02, 0.07, 7, (i - 1.5) * 0.4));
    bell(ctx, n.chimeBus, midi(chord[0] + 12), t, 0.14, 9, 0);
  }, []);

  // chapter change → glide + swell
  useEffect(() => {
    if (chapterRef.current === chapterId) return;
    chapterRef.current = chapterId;
    chordIdxRef.current = 0;
    if (enabledRef.current) {
      applyChord(3);
      swell();
    }
  }, [chapterId, applyChord, swell]);

  // teardown (StrictMode-safe: context only exists after a user click)
  useEffect(
    () => () => {
      const t = timersRef.current;
      clearInterval(t.chord);
      clearTimeout(t.sparkle);
      clearTimeout(t.toll);
      clearTimeout(t.suspend);
      timersRef.current = { chord: null, sparkle: null, toll: null, suspend: null };
      enabledRef.current = false;
      ctxRef.current?.close();
      ctxRef.current = null;
      nodesRef.current = null;
    },
    [],
  );

  return { enabled, enable, disable, toggle, analyser, chime, wantsSound, setBedLevel };
}
