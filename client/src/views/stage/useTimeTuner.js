/**
 * TIME TUNER — multi-era analog radio synthesizer (pure Web Audio, no files).
 *
 *   pink noise ─► HP ─► sweeping BP (800–2500 Hz) ─┐
 *   vinyl/radio crackle ────────────────────────────┼─► staticGain ─► staticAnalyser ─┐
 *   heterodyne whistle (sine, FM-wobbled) ──────────┘                                 │
 *                                                                                     ├─► master ─► comp ─► mixAnalyser ─► out
 *   station 1910 brass band ─┐                                                        │
 *   station 1977 rock riff  ─┼─► signalBus ─► HP ─► tuning LP ─► AM wobble ─► signalAnalyser
 *   station 1989 revolution ─┤                                     └─► reverb ─────────┘
 *   station 2026 living city ┘
 *
 * Every station plays continuously "on air" on its own sequencer clock (so you tune
 * into the middle of a song, like a real radio). `setDial(t)` crossfades them:
 *   - station gain   = cosine window around its t (shared TIMELINE_ERAS)
 *   - static gain    = inversely proportional to stationProximity (+ crunch while turning)
 *   - tuning filter  = muffled/wobbly AM sound → crystal clear as proximity → 1
 *   - whistle        = heterodyne pitch falls toward zero-beat as you approach a station
 *
 * All music here is ORIGINAL and procedurally generated: "inspired by" the eras,
 * never a recreation of a real recording.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { TIMELINE_ERAS, readTimeDial, clamp01 } from '@shared/events.js';

const midi = (n) => 440 * 2 ** ((n - 69) / 12);
const rnd = (a, b) => a + Math.random() * (b - a);
const PREF_KEY = 'timecapsule.stage.tuner';
const LOOKAHEAD = 0.15;

/** Cosine window of a station on the dial (a little wider than its lock band → audible bleed). */
export function stationWindow(t, era, widen = 1.35) {
  const d = Math.abs(t - era.t) / (era.halfWidth * widen);
  return d >= 1 ? 0 : 0.5 + 0.5 * Math.cos(Math.PI * d);
}

// ── buffers ──────────────────────────────────────────────────────────────────
function pinkNoise(ctx, seconds = 4) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  return buf;
}
function whiteNoise(ctx, seconds = 2) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}
/** Sparse clicks & pops (vinyl / AM crackle). */
function crackle(ctx, seconds = 6, density = 30) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  const n = Math.floor(seconds * density);
  for (let k = 0; k < n; k++) {
    const at = Math.floor(Math.random() * (len - 40));
    const amp = Math.random() < 0.08 ? rnd(0.6, 1) : rnd(0.05, 0.35);
    const sign = Math.random() < 0.5 ? -1 : 1;
    const width = 2 + Math.floor(Math.random() * 18);
    for (let j = 0; j < width; j++) d[at + j] += sign * amp * Math.exp(-j / (width / 3));
  }
  return buf;
}
function impulse(ctx, seconds = 3.5, decay = 2.4) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** decay;
  }
  return buf;
}
function driveCurve(k = 30) {
  const n = 2048;
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  return c;
}

// ── one-shot voices ──────────────────────────────────────────────────────────
function tone(ctx, dest, { type = 'sine', freq, when, dur = 0.2, gain = 0.1, attack = 0.01, release = 0.12, detune = 0 }) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.detune.value = detune;
  const g = ctx.createGain();
  const hold = when + Math.max(attack, dur);
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(gain, when + attack);
  g.gain.setValueAtTime(gain, hold);
  g.gain.exponentialRampToValueAtTime(0.0001, hold + release);
  o.connect(g).connect(dest);
  o.start(when);
  o.stop(hold + release + 0.05);
  return o;
}
function noiseHit(ctx, dest, buf, { when, dur = 0.1, gain = 0.2, type = 'bandpass', freq = 1500, q = 1 }) {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  src.connect(f).connect(g).connect(dest);
  src.start(when, Math.random() * (buf.duration - dur - 0.05));
  src.stop(when + dur + 0.02);
}
function thump(ctx, dest, { when, from = 110, to = 42, dur = 0.28, gain = 0.6 }) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.setValueAtTime(from, when);
  o.frequency.exponentialRampToValueAtTime(to, when + dur * 0.8);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(gain, when + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o.connect(g).connect(dest);
  o.start(when);
  o.stop(when + dur + 0.02);
}
function bell(ctx, dest, freq, when, gain, decay = 4) {
  [
    [1, 1],
    [2, 0.5],
    [2.76, 0.35],
    [5.4, 0.16],
    [8.93, 0.07],
  ].forEach(([ratio, amp], i) => {
    const f = freq * ratio;
    if (f > ctx.sampleRate / 2.2) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = f;
    const d = decay / (1 + i * 0.6);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain * amp, when + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, when + d);
    o.connect(g).connect(dest);
    o.start(when);
    o.stop(when + d + 0.05);
  });
}

// ── stations ─────────────────────────────────────────────────────────────────
/** 1910 — brass band promenade march (Bb major, 2/4), accordion tune, vinyl crackle. */
function station1910(ctx, out, bufs) {
  const warm = ctx.createBiquadFilter();
  warm.type = 'lowpass';
  warm.frequency.value = 2600;
  const thin = ctx.createBiquadFilter();
  thin.type = 'highpass';
  thin.frequency.value = 160; // gramophone band-limit
  const bus = ctx.createGain();
  bus.gain.value = 0.9;
  bus.connect(thin).connect(warm).connect(out);
  // vinyl crackle + faint mains hum, always on
  const cr = ctx.createBufferSource();
  cr.buffer = bufs.crackle;
  cr.loop = true;
  const crHp = ctx.createBiquadFilter();
  crHp.type = 'highpass';
  crHp.frequency.value = 900;
  const crG = ctx.createGain();
  crG.gain.value = 0.45;
  cr.connect(crHp).connect(crG).connect(out);
  cr.start();
  const hum = ctx.createOscillator();
  hum.frequency.value = 50;
  const humG = ctx.createGain();
  humG.gain.value = 0.012;
  hum.connect(humG).connect(out);
  hum.start();

  const BB = [46, 62, 65, 70]; // bass, chord tones
  const EB = [39, 63, 67, 70];
  const F = [41, 65, 69, 72];
  const BARS = [BB, BB, EB, BB, F, F, BB, BB];
  // original 8-bar promenade tune, eighth notes (null = rest)
  const TUNE = [70, 74, 77, 74, 82, null, 77, null, 75, 79, 82, 79, 77, 74, 70, null, 72, 77, 81, 77, 84, null, 81, 77, 82, 77, 74, 72, 70, null, null, null];
  const stepDur = 60 / 104 / 2;
  return {
    stepDur,
    schedule(step, when) {
      const s = step % 32;
      const chord = BARS[Math.floor(s / 4)];
      const beat = s % 4;
      // oom (tuba) on 1 & 3 — root then fifth
      if (beat === 0 || beat === 2) {
        const f = midi(beat === 0 ? chord[0] : chord[0] + 7);
        tone(ctx, bus, { type: 'triangle', freq: f, when, dur: stepDur * 0.7, gain: 0.32, attack: 0.02 });
        tone(ctx, bus, { type: 'sawtooth', freq: f, when, dur: stepDur * 0.6, gain: 0.06, attack: 0.03 });
      } else {
        // pah (horns) on the off-beats
        chord.slice(1).forEach((n, i) =>
          tone(ctx, bus, { type: 'sawtooth', freq: midi(n - 12), when, dur: stepDur * 0.55, gain: 0.05, attack: 0.03, detune: (i - 1) * 6 }),
        );
      }
      const m = TUNE[s];
      if (m) {
        // accordion: two detuned squares + a reed-ish triangle an octave down
        tone(ctx, bus, { type: 'square', freq: midi(m), when, dur: stepDur * 0.9, gain: 0.035, attack: 0.04, detune: -7 });
        tone(ctx, bus, { type: 'square', freq: midi(m), when, dur: stepDur * 0.9, gain: 0.035, attack: 0.04, detune: 7 });
        tone(ctx, bus, { type: 'triangle', freq: midi(m - 12), when, dur: stepDur * 0.9, gain: 0.05, attack: 0.04 });
      }
      if (s === 0) noiseHit(ctx, bus, bufs.white, { when, dur: 0.25, gain: 0.12, freq: 4000, q: 0.6 }); // cymbal crash on the downbeat
    },
  };
}

/** 1977 — overdriven power-chord riff, pentatonic bass, rock kit (E minor, original). */
function station1977(ctx, out, bufs) {
  const gBus = ctx.createGain();
  gBus.gain.value = 0.6;
  const drive = ctx.createWaveShaper();
  drive.curve = driveCurve(28);
  drive.oversample = '2x';
  const cab = ctx.createBiquadFilter();
  cab.type = 'lowpass';
  cab.frequency.value = 3200;
  const mid = ctx.createBiquadFilter();
  mid.type = 'peaking';
  mid.frequency.value = 1400;
  mid.gain.value = 5;
  const post = ctx.createGain();
  post.gain.value = 0.16;
  gBus.connect(drive).connect(cab).connect(mid).connect(post).connect(out);
  const tape = ctx.createBiquadFilter(); // bass + drums
  tape.type = 'lowpass';
  tape.frequency.value = 5000;
  tape.connect(out);

  // 32 sixteenths: [step, root midi, 'o'pen | 'm'uted]
  const RIFF = [
    [0, 40, 'o'], [2, 40, 'm'], [3, 40, 'm'], [4, 43, 'o'], [6, 45, 'o'], [8, 40, 'm'], [9, 40, 'm'], [10, 38, 'o'], [12, 45, 'o'], [14, 43, 'o'],
    [16, 40, 'o'], [18, 40, 'm'], [19, 40, 'm'], [20, 43, 'o'], [22, 45, 'o'], [24, 47, 'o'], [28, 38, 'o'], [30, 40, 'm'], [31, 40, 'm'],
  ];
  const hits = new Map(RIFF.map(([s, n, k]) => [s, { n, k }]));
  const rootAt = [];
  let cur = 40;
  for (let s = 0; s < 32; s++) {
    if (hits.has(s)) cur = hits.get(s).n;
    rootAt.push(cur);
  }
  const stepDur = 60 / 118 / 4;
  return {
    stepDur,
    schedule(step, when) {
      const s = step % 32;
      const h = hits.get(s);
      if (h) {
        const dur = h.k === 'm' ? stepDur * 0.7 : stepDur * 1.8;
        [h.n + 12, h.n + 19, h.n + 24].forEach((n, i) =>
          tone(ctx, gBus, { type: 'sawtooth', freq: midi(n), when, dur, gain: 0.5, attack: 0.004, release: 0.08, detune: i ? 4 : -4 }),
        );
      }
      if (s % 2 === 0) {
        const n = s % 8 === 6 ? rootAt[s] + 7 : rootAt[s];
        tone(ctx, tape, { type: 'sawtooth', freq: midi(n - 12), when, dur: stepDur * 1.5, gain: 0.09, attack: 0.005, release: 0.05 });
        tone(ctx, tape, { type: 'sine', freq: midi(n - 12), when, dur: stepDur * 1.5, gain: 0.2, attack: 0.005, release: 0.05 });
      }
      const b = s % 16;
      if (b === 0 || b === 8 || b === 10) thump(ctx, tape, { when, gain: 0.7 });
      if (b === 4 || b === 12) {
        noiseHit(ctx, tape, bufs.white, { when, dur: 0.16, gain: 0.35, freq: 1900, q: 0.8 });
        tone(ctx, tape, { type: 'triangle', freq: 190, when, dur: 0.04, gain: 0.15, release: 0.06 });
      }
      if (s % 2 === 0) noiseHit(ctx, tape, bufs.white, { when, dur: 0.045, gain: s % 4 === 2 ? 0.12 : 0.07, type: 'highpass', freq: 7500, q: 0.5 });
    },
  };
}

/** Dec 1989 — tension drone, crowd murmur + clapping, heartbeat, church bell, minor→major brass swell. */
function station1989(ctx, out, bufs) {
  const droneLp = ctx.createBiquadFilter();
  droneLp.type = 'lowpass';
  droneLp.frequency.value = 280;
  droneLp.Q.value = 2;
  const droneG = ctx.createGain();
  droneG.gain.value = 0.22;
  droneLp.connect(droneG).connect(out);
  [38, 45, 50, 51].forEach((n, i) => {
    // the minor second (D#) on top keeps it uneasy
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = midi(n);
    o.detune.value = (i - 1.5) * 5;
    const g = ctx.createGain();
    g.gain.value = i === 3 ? 0.08 : 0.25;
    o.connect(g).connect(droneLp);
    o.start();
  });
  const dl = ctx.createOscillator();
  dl.frequency.value = 0.07;
  const dlG = ctx.createGain();
  dlG.gain.value = 140;
  dl.connect(dlG).connect(droneLp.frequency);
  dl.start();
  // crowd murmur
  const mur = ctx.createBufferSource();
  mur.buffer = bufs.pink;
  mur.loop = true;
  const murBp = ctx.createBiquadFilter();
  murBp.type = 'bandpass';
  murBp.frequency.value = 480;
  murBp.Q.value = 0.9;
  const murG = ctx.createGain();
  murG.gain.value = 0.5;
  const murLfo = ctx.createOscillator();
  murLfo.frequency.value = 0.13;
  const murLfoG = ctx.createGain();
  murLfoG.gain.value = 0.25;
  murLfo.connect(murLfoG).connect(murG.gain);
  murLfo.start();
  mur.connect(murBp).connect(murG).connect(out);
  mur.start();

  const stepDur = 60 / 72 / 4; // heartbeat tempo, sixteenths
  return {
    stepDur,
    schedule(step, when) {
      const s = step % 128; // 8 bars
      const bar = Math.floor(s / 16);
      const b = s % 16;
      // heartbeat: lub-dub
      if (b === 0) thump(ctx, out, { when, from: 70, to: 38, dur: 0.22, gain: 0.55 });
      if (b === 2) thump(ctx, out, { when, from: 60, to: 34, dur: 0.18, gain: 0.35 });
      // crowd claps on every beat, growing louder through the cycle
      if (b % 4 === 0 && bar >= 1) {
        const level = 0.05 + bar * 0.012;
        for (let k = 0; k < 12; k++) {
          noiseHit(ctx, out, bufs.white, { when: when + rnd(-0.025, 0.03), dur: rnd(0.02, 0.05), gain: level * rnd(0.5, 1), freq: rnd(1000, 2400), q: 1.2 });
        }
      }
      // distant church bell every 2 bars
      if (b === 0 && bar % 2 === 0) bell(ctx, out, midi(62), when + 0.05, 0.11, 7);
      // brass swell: D minor (bars 0–3) → D major (bars 4–7)
      if (b === 0 && (bar === 0 || bar === 4)) {
        const major = bar === 4;
        const notes = major ? [50, 54, 57, 62, 66] : [50, 53, 57, 62, 65];
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.Q.value = 1.5;
        lp.frequency.setValueAtTime(350, when);
        lp.frequency.linearRampToValueAtTime(major ? 2600 : 1500, when + 3.5);
        lp.frequency.linearRampToValueAtTime(500, when + 9.5);
        lp.connect(out);
        const dur = stepDur * 16 * 4 - 1.5;
        notes.forEach((n, i) => {
          tone(ctx, lp, { type: 'sawtooth', freq: midi(n), when, dur, gain: 0.035, attack: 3, release: 1.4, detune: -5 + i * 2.5 });
          tone(ctx, lp, { type: 'sawtooth', freq: midi(n), when, dur, gain: 0.03, attack: 3.2, release: 1.4, detune: 6 - i * 2 });
        });
      }
    },
  };
}

/** 2026 — crystalline pads, tram bells, harmonic arpeggios (D lydian ↔ B minor). */
function station2026(ctx, out, bufs) {
  const padLp = ctx.createBiquadFilter();
  padLp.type = 'lowpass';
  padLp.frequency.value = 4200;
  const padG = ctx.createGain();
  padG.gain.value = 0.18;
  padLp.connect(padG).connect(out);
  const CH_A = [62, 69, 73, 76, 80]; // Dmaj9#11
  const CH_B = [59, 66, 69, 73, 76]; // Bm9
  const pad = CH_A.map((n, i) => {
    const o = ctx.createOscillator();
    o.type = i % 2 ? 'sine' : 'triangle';
    o.frequency.value = midi(n);
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = midi(n);
    o2.detune.value = 9;
    const g = ctx.createGain();
    g.gain.value = 0.12;
    const trem = ctx.createOscillator();
    trem.frequency.value = 0.11 + i * 0.05;
    const tg = ctx.createGain();
    tg.gain.value = 0.06;
    trem.connect(tg).connect(g.gain);
    o.connect(g);
    o2.connect(g);
    g.connect(padLp);
    [o, o2, trem].forEach((x) => x.start());
    return [o, o2];
  });
  // shimmer air
  const air = ctx.createBufferSource();
  air.buffer = bufs.pink;
  air.loop = true;
  const airHp = ctx.createBiquadFilter();
  airHp.type = 'highpass';
  airHp.frequency.value = 6000;
  const airG = ctx.createGain();
  airG.gain.value = 0.05;
  air.connect(airHp).connect(airG).connect(out);
  air.start();

  const ARP_A = [74, 78, 81, 85, 88, 85, 81, 78];
  const ARP_B = [71, 74, 78, 81, 83, 81, 78, 74];
  const stepDur = 60 / 90 / 4;
  return {
    stepDur,
    schedule(step, when) {
      const s = step % 64; // 4 bars
      const second = s >= 32;
      if (s === 0 || s === 32) {
        const ch = second ? CH_B : CH_A;
        pad.forEach(([o, o2], i) => {
          o.frequency.setTargetAtTime(midi(ch[i]), when, 0.8);
          o2.frequency.setTargetAtTime(midi(ch[i]), when, 0.8);
        });
      }
      const arp = second ? ARP_B : ARP_A;
      if (s % 2 === 0 || Math.random() < 0.3) {
        tone(ctx, out, { type: 'sine', freq: midi(arp[s % 8]), when, dur: 0.05, gain: 0.07, attack: 0.004, release: 0.45 });
        tone(ctx, out, { type: 'sine', freq: midi(arp[s % 8] + 12), when, dur: 0.03, gain: 0.015, attack: 0.004, release: 0.3 });
      }
      // tram bell "ding-ding" every 2 bars (+ occasional extra)
      if (s === 16 || s === 48 || (s % 16 === 8 && Math.random() < 0.12)) {
        bell(ctx, out, 1568, when, 0.06, 2.2);
        bell(ctx, out, 1568, when + 0.2, 0.05, 2.6);
      }
    },
  };
}

const STATION_BUILDERS = {
  '1910_secession': station1910,
  '1977_phoenix': station1977,
  '1989_opera': station1989,
  '2026_modern': station2026,
};

// ── graph ────────────────────────────────────────────────────────────────────
function build(ctx) {
  const bufs = { pink: pinkNoise(ctx), white: whiteNoise(ctx), crackle: crackle(ctx, 6, 28), radioCrackle: crackle(ctx, 5, 70) };
  const master = ctx.createGain();
  master.gain.value = 0;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.ratio.value = 4;
  const mixAn = ctx.createAnalyser();
  mixAn.fftSize = 2048;
  mixAn.smoothingTimeConstant = 0.8;
  master.connect(comp).connect(mixAn).connect(ctx.destination);
  const reverb = ctx.createConvolver();
  reverb.buffer = impulse(ctx);
  const reverbOut = ctx.createGain();
  reverbOut.gain.value = 0.35;
  reverb.connect(reverbOut).connect(master);

  // ── Layer 0: between-station static ──
  const staticAn = ctx.createAnalyser();
  staticAn.fftSize = 1024;
  const staticGain = ctx.createGain();
  staticGain.gain.value = 0;
  staticGain.connect(staticAn).connect(master);
  const noise = ctx.createBufferSource();
  noise.buffer = bufs.pink;
  noise.loop = true;
  const sHp = ctx.createBiquadFilter();
  sHp.type = 'highpass';
  sHp.frequency.value = 300;
  const sBp = ctx.createBiquadFilter();
  sBp.type = 'bandpass';
  sBp.frequency.value = 1500;
  sBp.Q.value = 0.9;
  const sweep = ctx.createOscillator(); // slow flutter of the band
  sweep.frequency.value = 0.35;
  const sweepG = ctx.createGain();
  sweepG.gain.value = 220;
  sweep.connect(sweepG).connect(sBp.frequency);
  sweep.start();
  const noiseLvl = ctx.createGain();
  noiseLvl.gain.value = 2.2;
  noise.connect(sHp).connect(sBp).connect(noiseLvl).connect(staticGain);
  noise.start();
  const rc = ctx.createBufferSource();
  rc.buffer = bufs.radioCrackle;
  rc.loop = true;
  const rcG = ctx.createGain();
  rcG.gain.value = 0.5;
  rc.connect(rcG).connect(staticGain);
  rc.start();
  // heterodyne whistle
  const wh = ctx.createOscillator();
  wh.frequency.value = 1200;
  const whMod = ctx.createOscillator();
  whMod.frequency.value = 5.5;
  const whModG = ctx.createGain();
  whModG.gain.value = 28;
  whMod.connect(whModG).connect(wh.frequency);
  const whGain = ctx.createGain();
  whGain.gain.value = 0;
  wh.connect(whGain).connect(staticAn);
  wh.start();
  whMod.start();
  // crunch while the dial moves fast
  const crunch = ctx.createGain();
  crunch.gain.value = 0;
  const crSrc = ctx.createBufferSource();
  crSrc.buffer = bufs.white;
  crSrc.loop = true;
  const crBp = ctx.createBiquadFilter();
  crBp.type = 'bandpass';
  crBp.frequency.value = 2200;
  crBp.Q.value = 0.7;
  crSrc.connect(crBp).connect(crunch).connect(staticAn);
  crSrc.start();

  // ── signal chain ──
  const signalBus = ctx.createGain();
  const tHp = ctx.createBiquadFilter();
  tHp.type = 'highpass';
  tHp.frequency.value = 90;
  const tuneLp = ctx.createBiquadFilter();
  tuneLp.type = 'lowpass';
  tuneLp.frequency.value = 1200;
  tuneLp.Q.value = 0.8;
  const wobble = ctx.createGain();
  wobble.gain.value = 1;
  const wLfo = ctx.createOscillator();
  wLfo.frequency.value = 3.1;
  const wDepth = ctx.createGain();
  wDepth.gain.value = 0;
  wLfo.connect(wDepth).connect(wobble.gain);
  wLfo.start();
  const signalAn = ctx.createAnalyser();
  signalAn.fftSize = 1024;
  signalBus.connect(tHp).connect(tuneLp).connect(wobble).connect(signalAn).connect(master);
  wobble.connect(reverb);

  const stations = TIMELINE_ERAS.map((era) => {
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(signalBus);
    const builder = STATION_BUILDERS[era.id];
    const st = builder ? builder(ctx, out, bufs) : { stepDur: 1, schedule() {} };
    return { era, out, ...st, step: 0, next: ctx.currentTime + 0.1, level: 0 };
  });

  return { master, mixAn, staticAn, signalAn, staticGain, sBp, whGain, wh, crunch, tuneLp, wDepth, stations };
}

// ── hook ─────────────────────────────────────────────────────────────────────
export function useTimeTuner() {
  const ctxRef = useRef(null);
  const nodesRef = useRef(null);
  const enabledRef = useRef(false);
  const schedRef = useRef(null);
  const suspendRef = useRef(null);
  const lastDial = useRef({ t: null, at: 0, crunch: 0 });
  const [enabled, setEnabled] = useState(false);
  const [analysers, setAnalysers] = useState(null);
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

  const tick = useCallback(() => {
    const ctx = ctxRef.current;
    const n = nodesRef.current;
    if (!ctx || !n || ctx.state !== 'running') return;
    const horizon = ctx.currentTime + LOOKAHEAD;
    n.stations.forEach((st) => {
      if (st.next < ctx.currentTime - 0.5) st.next = ctx.currentTime + 0.05; // resumed after a pause
      while (st.next < horizon) {
        if (st.level > 0.004) st.schedule(st.step, st.next);
        st.step += 1;
        st.next += st.stepDur;
      }
    });
  }, []);

  /** Feed the (smoothed) dial position every frame. */
  const setDial = useCallback((tRaw) => {
    const ctx = ctxRef.current;
    const n = nodesRef.current;
    if (!ctx || !n) return;
    const t = clamp01(tRaw);
    const now = ctx.currentTime;
    const r = readTimeDial(t);
    const prox = r.stationProximity;

    // crunch from dial velocity (units of t per second)
    const ld = lastDial.current;
    const pn = performance.now();
    if (ld.t !== null) {
      const dt = Math.max(1, pn - ld.at) / 1000;
      const v = Math.abs(t - ld.t) / dt;
      ld.crunch = Math.max(ld.crunch * 0.9, Math.min(1, v * 3));
    }
    ld.t = t;
    ld.at = pn;

    let maxLevel = 0;
    n.stations.forEach((st) => {
      st.level = stationWindow(t, st.era);
      maxLevel = Math.max(maxLevel, st.level);
      st.out.gain.setTargetAtTime(st.level, now, 0.05);
    });
    n.staticGain.gain.setTargetAtTime(0.5 * (1 - prox) + ld.crunch * 0.08 * (1 - prox * 0.5), now, 0.04);
    n.crunch.gain.setTargetAtTime(ld.crunch * 0.12, now, 0.03);
    n.sBp.frequency.setTargetAtTime(800 + 1700 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 9)), now, 0.05);
    const near = TIMELINE_ERAS.find((e) => e.id === r.nearestStation);
    const d = Math.min(1, Math.abs(t - near.t) / (near.halfWidth * 2.2));
    n.wh.frequency.setTargetAtTime(90 + 3000 * d, now, 0.05);
    n.whGain.gain.setTargetAtTime(0.045 * (prox * (1 - prox) * 3.5 + 0.12 * (1 - prox)), now, 0.05);
    n.tuneLp.frequency.setTargetAtTime(650 + 11000 * prox ** 1.6, now, 0.06);
    n.wDepth.gain.setTargetAtTime(0.4 * (1 - prox) * (maxLevel > 0 ? 1 : 0), now, 0.08);
  }, []);

  const enable = useCallback(async () => {
    if (!ctxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      ctxRef.current = ctx;
      nodesRef.current = build(ctx);
      const n = nodesRef.current;
      setAnalysers({ mix: n.mixAn, staticAn: n.staticAn, signal: n.signalAn });
    }
    const ctx = ctxRef.current;
    clearTimeout(suspendRef.current);
    await ctx.resume();
    const g = nodesRef.current.master.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(g.value, ctx.currentTime);
    g.linearRampToValueAtTime(0.9, ctx.currentTime + 1.5);
    if (!schedRef.current) schedRef.current = setInterval(tick, 25);
    enabledRef.current = true;
    setEnabled(true);
    savePref(true);
  }, [tick]);

  const disable = useCallback(() => {
    enabledRef.current = false;
    setEnabled(false);
    savePref(false);
    const ctx = ctxRef.current;
    if (!ctx) return;
    const g = nodesRef.current.master.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(g.value, ctx.currentTime);
    g.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
    suspendRef.current = setTimeout(() => {
      if (!enabledRef.current) ctx.suspend();
    }, 800);
  }, []);

  useEffect(
    () => () => {
      clearInterval(schedRef.current);
      clearTimeout(suspendRef.current);
      schedRef.current = null;
      enabledRef.current = false;
      ctxRef.current?.close();
      ctxRef.current = null;
      nodesRef.current = null;
    },
    [],
  );

  return { enabled, enable, disable, setDial, analysers, wantsSound };
}
