/**
 * Spatial audio for the AR lens: HRTF panners in world space, with the
 * listener kept in sync with the 3D camera (<AudioListenerSync/> runs every frame).
 *
 * Note: speechSynthesis output can't be routed into WebAudio, so the narration
 * itself isn't spatialised. What is spatialised: the tap chime, a sustained
 * "aura" tone anchored to the selected orb (it pans as the phone moves and
 * pulses with each spoken word), the rising sound for new memories, and the
 * chapter arrival sounds.
 *
 * The AudioContext has to be created or resumed inside a user gesture,
 * so call unlockAudio() from a tap handler.
 */
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

let ctx = null;
let master = null;

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
export const audioReady = () => !!ctx && ctx.state === 'running';

export function setMuted(muted) {
  if (master) master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.08);
}

/* ───────── listener ⇄ camera ───────── */
const _p = new THREE.Vector3();
const _f = new THREE.Vector3();
const _u = new THREE.Vector3();
export function AudioListenerSync() {
  useFrame(({ camera }) => {
    if (!ctx) return;
    const L = ctx.listener;
    camera.getWorldPosition(_p);
    _f.set(0, 0, -1).applyQuaternion(camera.quaternion);
    _u.set(0, 1, 0).applyQuaternion(camera.quaternion);
    if (L.positionX) {
      const t = ctx.currentTime;
      L.positionX.setTargetAtTime(_p.x, t, 0.03);
      L.positionY.setTargetAtTime(_p.y, t, 0.03);
      L.positionZ.setTargetAtTime(_p.z, t, 0.03);
      L.forwardX.setTargetAtTime(_f.x, t, 0.03);
      L.forwardY.setTargetAtTime(_f.y, t, 0.03);
      L.forwardZ.setTargetAtTime(_f.z, t, 0.03);
      L.upX.setTargetAtTime(_u.x, t, 0.03);
      L.upY.setTargetAtTime(_u.y, t, 0.03);
      L.upZ.setTargetAtTime(_u.z, t, 0.03);
    } else {
      L.setPosition(_p.x, _p.y, _p.z);
      L.setOrientation(_f.x, _f.y, _f.z, _u.x, _u.y, _u.z);
    }
  });
  return null;
}

/* ───────── panner helpers ───────── */
function makePanner(pos) {
  const pn = ctx.createPanner();
  pn.panningModel = 'HRTF';
  pn.distanceModel = 'inverse';
  pn.refDistance = 2.5;
  pn.rolloffFactor = 1.1;
  pn.maxDistance = 60;
  setPannerPos(pn, pos, true);
  pn.connect(master);
  return pn;
}
function setPannerPos(pn, { x, y, z }, immediate) {
  if (pn.positionX) {
    if (immediate) {
      pn.positionX.value = x;
      pn.positionY.value = y;
      pn.positionZ.value = z;
    } else {
      const t = ctx.currentTime;
      pn.positionX.setTargetAtTime(x, t, 0.04);
      pn.positionY.setTargetAtTime(y, t, 0.04);
      pn.positionZ.setTargetAtTime(z, t, 0.04);
    }
  } else pn.setPosition(x, y, z);
}

/** One decaying bell partial cluster into `dest`. */
function bell(dest, freq, when, gain = 0.25, decay = 2.2, ratios = [1, 2.76, 5.4, 8.93]) {
  ratios.forEach((r, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = freq * r;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain / (i + 1), when + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, when + decay / (1 + i * 0.6));
    o.connect(g).connect(dest);
    o.start(when);
    o.stop(when + decay + 0.1);
  });
}
const disposeLater = (node, s) => setTimeout(() => node.disconnect(), s * 1000);

const SYMBOL_TONES = {
  candle: { base: 220, chord: [1, 1.5, 2], lfo: 0.35, type: 'sine' },
  flower: { base: 293.66, chord: [1, 1.25, 1.5], lfo: 0.8, type: 'triangle' },
  musical_note: { base: 392, chord: [1, 1.5, 2.25], lfo: 5.5, type: 'sine' },
};

/* ───────── public sounds ───────── */

export function playChime(pos, symbol = 'candle') {
  if (!audioReady()) return;
  const tone = SYMBOL_TONES[symbol] || SYMBOL_TONES.candle;
  const pn = makePanner(pos);
  const now = ctx.currentTime;
  bell(pn, tone.base * 2, now, 0.3);
  bell(pn, tone.base * 3, now + 0.12, 0.18);
  disposeLater(pn, 3);
}

/** Sustained tone anchored to an orb. Returns a handle with { setPosition, pulse, stop }. */
export function startAura(pos, symbol = 'candle') {
  if (!audioReady()) return null;
  const tone = SYMBOL_TONES[symbol] || SYMBOL_TONES.candle;
  const pn = makePanner(pos);
  const out = ctx.createGain();
  out.gain.value = 0;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1400;
  out.connect(filter).connect(pn);
  const trem = ctx.createGain();
  trem.gain.value = 0.7;
  trem.connect(out);
  const lfo = ctx.createOscillator();
  const lfoDepth = ctx.createGain();
  lfo.frequency.value = tone.lfo;
  lfoDepth.gain.value = 0.3;
  lfo.connect(lfoDepth).connect(trem.gain);
  lfo.start();
  const oscs = [lfo];
  tone.chord.forEach((r, i) => {
    [-5, 5].forEach((det) => {
      const o = ctx.createOscillator();
      o.type = tone.type;
      o.frequency.value = tone.base * r;
      o.detune.value = det + i * 2;
      const g = ctx.createGain();
      g.gain.value = 0.05 / (i + 1);
      o.connect(g).connect(trem);
      o.start();
      oscs.push(o);
    });
  });
  const now = ctx.currentTime;
  out.gain.setValueAtTime(0, now);
  out.gain.linearRampToValueAtTime(0.55, now + 1.2);
  let stopped = false;
  return {
    setPosition: (p) => !stopped && setPannerPos(pn, p),
    pulse: () => {
      if (stopped) return;
      const t = ctx.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setTargetAtTime(0.9, t, 0.01);
      out.gain.setTargetAtTime(0.55, t + 0.06, 0.12);
    },
    stop: () => {
      if (stopped) return;
      stopped = true;
      const t = ctx.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value, t);
      out.gain.linearRampToValueAtTime(0, t + 0.8);
      oscs.forEach((o) => o.stop(t + 0.9));
      disposeLater(pn, 1.2);
    },
  };
}

/** Upward shimmer for a memory rising out of the pedestal. */
export function playRise(pos, symbol = 'candle') {
  if (!audioReady()) return;
  const tone = SYMBOL_TONES[symbol] || SYMBOL_TONES.candle;
  const pn = makePanner(pos);
  const now = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(tone.base / 2, now);
  o.frequency.exponentialRampToValueAtTime(tone.base * 4, now + 2.4);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.16, now + 0.4);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);
  o.connect(g).connect(pn);
  o.start(now);
  o.stop(now + 3);
  [0, 0.4, 0.8, 1.2, 1.6, 2.0].forEach((d, i) => bell(pn, tone.base * 2 * Math.pow(1.122, i * 2), now + d, 0.08, 1.4));
  disposeLater(pn, 4.5);
}

/** A short sound signature when a chapter materialises. */
export function playArrival(chapterId) {
  if (!audioReady()) return;
  const now = ctx.currentTime;
  if (chapterId === '1989_piata_maria') {
    // tram bell: ding-ding, from the trams
    const pn = makePanner({ x: -0.9, y: 0.2, z: 0 });
    bell(pn, 1046, now, 0.22, 1.6, [1, 2.4, 4.1]);
    bell(pn, 1046, now + 0.32, 0.22, 1.8, [1, 2.4, 4.1]);
    disposeLater(pn, 3);
  } else if (chapterId === '1989_opera') {
    // a swelling D-major choir pad from the balcony
    const pn = makePanner({ x: 0, y: 0.6, z: -0.8 });
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(300, now);
    f.frequency.exponentialRampToValueAtTime(2400, now + 2.2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.12, now + 1.6);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 4.5);
    f.connect(g).connect(pn);
    [146.83, 220, 293.66, 369.99, 440].forEach((fr, i) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = fr;
      o.detune.value = (i - 2) * 6;
      o.connect(f);
      o.start(now);
      o.stop(now + 4.6);
    });
    disposeLater(pn, 5);
  } else {
    // pentatonic cascade travelling around the circle: one note per community light
    const notes = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];
    notes.forEach((fr, i) => {
      const a = (i / notes.length) * Math.PI * 2;
      const pn = makePanner({ x: Math.cos(a) * 1.8, y: 0.8, z: Math.sin(a) * 1.8 });
      bell(pn, fr, now + i * 0.14, 0.12, 1.5, [1, 3, 5.2]);
      disposeLater(pn, 3);
    });
  }
}

/* ───────── the currently selected orb's aura ───────── */
let current = null; // { id, handle }
export function setAura(id, handle) {
  current?.handle?.stop();
  current = handle ? { id, handle } : null;
}
export const getAura = () => current;
export function stopAura() {
  setAura(null, null);
}
