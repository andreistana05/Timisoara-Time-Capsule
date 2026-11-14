/**
 * Time Tuner engine — tablet only (Member 2).
 *
 * A module-level store (like useSocket) for the dial position `t` (0 = 1900 … 1 = 2026)
 * plus the radio reading derived from it with the SHARED `readTimeDial()`, so the dial,
 * faceplate and presets show exactly what the server will compute — with zero latency.
 * Components subscribe to just the slice they need (`useTimeDial(selector)`), and per-frame
 * effects (static flicker, meters) run through `useDialFrame` without any React render.
 *
 * Transport: the frozen useSocket() hook has no TIME_SCRUB action and does not expose its
 * socket, so the dial opens ONE extra lightweight socket of its own (role `tablet-dial`).
 * While the dial moves it sends volatile TIME_SCRUB frames at ≤ 40 Hz (the server's own
 * broadcast rate; stale frames may drop) and one reliable frame when it comes to rest — the
 * server then settles, snaps the chapter and broadcasts STATE_UPDATED to everyone.
 * If useSocket ever gains a `timeScrub` action, only `send()` needs to change.
 *
 * Motion model: grab-and-turn. A clockwise drag turns the ring clockwise and moves time
 * forward; one full turn of the finger = the whole 1900–2026 range, with hard end stops.
 * A flick coasts like a flywheel; on release inside a station's band the dial glides onto
 * the exact frequency (a detent).
 */
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { io } from 'socket.io-client';
import { EVENTS, TIMELINE, TIMELINE_ERA_BY_ID, clamp01, progressFromYear, readTimeDial } from '@shared/events.js';
import { haptic } from './strings.js';

const SEND_INTERVAL_MS = 25; // ≈ 40 Hz, matches the server's SCRUB_INTERVAL_MS
const ECHO_GRACE_MS = 900; // after our own scrub, ignore state snapshots that may still be in flight
const KEY_COMMIT_MS = 260;
const VELOCITY_WINDOW_MS = 90;
const COAST_START = 0.0005; // t per ms (≈ 180°/s); slower releases simply stop
const COAST_MAX = 0.003;
const COAST_TAU_MS = 300;
const COAST_STOP = 0.00003;

/** "Frequency lock" glow (radio-dial green), used by the index, meter and presets. */
export const LOCK_GREEN = '#4ade80';

const LOCAL = new Set(['drag', 'coast', 'tween', 'key']);
const TICKING = new Set(['drag', 'coast']); // modes that "click" through the decades

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// ─── store ──────────────────────────────────────────────────────────────
function makeSnapshot(t, mode, synced) {
  const r = readTimeDial(t);
  return {
    t, // raw, unrounded — drives the ring rotation
    mode, // null | 'drag' | 'coast' | 'tween' | 'key' | 'follow' | 'remote'
    synced, // false until the server's dial position has arrived
    currentYear: r.currentYear,
    nearestStation: r.nearestStation,
    stationProximity: r.stationProximity,
    inStation: r.inStation,
  };
}

let snap = makeSnapshot(TIMELINE.defaultProgress, null, false);
const listeners = new Set();

function set(t, mode = snap.mode, synced = snap.synced) {
  const nt = clamp01(t);
  if (nt === snap.t && mode === snap.mode && synced === snap.synced) return;
  const prev = snap;
  snap = makeSnapshot(nt, mode, synced);
  if (LOCAL.has(mode)) feel(prev, snap);
  listeners.forEach((l) => l());
}

function feel(prev, next) {
  if (next.inStation && !prev.inStation) haptic([10, 35, 22]);
  else if (TICKING.has(next.mode) && Math.floor(next.currentYear / 10) !== Math.floor(prev.currentYear / 10)) haptic(5);
}

export const getDialSnapshot = () => snap;

// ─── socket ─────────────────────────────────────────────────────────────
let socket = null;
let teardownTimer = null;

function connect() {
  clearTimeout(teardownTimer);
  if (socket) return socket;
  const url = import.meta.env.VITE_SOCKET_URL || window.location.origin;
  socket = io(url, { forceNew: true, query: { role: 'tablet-dial' }, transports: ['websocket', 'polling'] });
  socket.on(EVENTS.STATE_INIT, (s) => adoptState(s?.timeProgress, true));
  socket.on(EVENTS.STATE_UPDATED, (s) => adoptState(s?.timeProgress, false));
  socket.on(EVENTS.TIME_SCRUB_UPDATED, adoptScrub);
  return socket;
}

function scheduleTeardown() {
  clearTimeout(teardownTimer);
  // Delay survives StrictMode's mount → unmount → mount and quick route hops.
  teardownTimer = setTimeout(() => {
    if (listeners.size || frameCallbacks.size || !socket) return;
    socket.disconnect();
    socket = null;
    snap = makeSnapshot(snap.t, null, false);
  }, 2000);
}

let lastSentAt = 0;
let lastLocalAt = 0;
let sendTimer = null;

function send(reliable) {
  clearTimeout(sendTimer);
  sendTimer = null;
  lastSentAt = lastLocalAt = performance.now();
  const s = connect();
  const payload = { timeProgress: +snap.t.toFixed(4) };
  // Volatile while moving (a dropped frame is fine), reliable for the resting position.
  (reliable ? s : s.volatile).emit(EVENTS.TIME_SCRUB, payload);
}

/** Throttled (leading + trailing) volatile send of the latest position. */
function queueSend() {
  lastLocalAt = performance.now();
  if (sendTimer) return;
  const wait = SEND_INTERVAL_MS - (lastLocalAt - lastSentAt);
  if (wait <= 0) send(false);
  else sendTimer = setTimeout(() => send(false), wait);
}

const isLocal = () => LOCAL.has(snap.mode);

/** Full state snapshot (connect, reset, chapter change, settle). */
function adoptState(tp, initial) {
  if (!Number.isFinite(tp) || isLocal()) return; // the finger (or our own glide) wins
  if (!initial && performance.now() - lastLocalAt < ECHO_GRACE_MS) return;
  if (!snap.synced) return set(tp, null, true); // first contact: jump, no animation
  if (Math.abs(tp - snap.t) < 0.0006) return;
  follow(tp);
}

/** Live scrub from another screen (or the server moving the dial for a chapter change). */
function adoptScrub(p) {
  if (!p || !Number.isFinite(p.timeProgress)) return;
  if (p.source && p.source === socket?.id) return; // our own echo
  if (isLocal()) return;
  if (p.settled || Math.abs(p.timeProgress - snap.t) > 0.04) follow(p.timeProgress);
  else {
    motion = null;
    set(p.timeProgress, 'remote', true);
  }
}

// ─── motion: tweens, flywheel coast, detents ────────────────────────────
let motion = null;
const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOut = (k) => 1 - Math.pow(1 - k, 3);

function startTween(to, { mode, emit, duration, ease = easeInOut }) {
  const target = clamp01(to);
  if (prefersReducedMotion() || duration <= 0 || Math.abs(target - snap.t) < 1e-5) {
    motion = null;
    set(target, mode);
    return finish({ mode, emit });
  }
  motion = { kind: 'tween', from: snap.t, to: target, start: performance.now(), duration, ease, mode, emit };
  set(snap.t, mode);
  ensureLoop();
}

function follow(tp) {
  const d = Math.abs(tp - snap.t);
  startTween(tp, { mode: 'follow', emit: false, duration: Math.min(1400, 450 + d * 1600) });
}

function finish(m) {
  if (m.emit) commit();
  else set(snap.t, null, true);
}

/** Dial at rest after a local gesture: send the reliable frame. */
function commit() {
  motion = null;
  send(true);
  set(snap.t, null);
}

/** Release inside a station's band → glide onto the exact frequency; otherwise rest here. */
function settle() {
  const era = TIMELINE_ERA_BY_ID[snap.nearestStation];
  if (era && snap.stationProximity > 0 && Math.abs(snap.t - era.t) > 1e-4) {
    startTween(era.t, { mode: 'tween', emit: true, duration: 260 + 2400 * Math.abs(era.t - snap.t), ease: easeOut });
  } else commit();
}

let pinned = false; // finger pushing against an end stop
function endStop(clamped) {
  if (clamped && !pinned) haptic(28);
  pinned = clamped;
}

function stepMotion(now) {
  const m = motion;
  if (!m) return;
  if (m.kind === 'tween') {
    const k = Math.min(1, Math.max(0, (now - m.start) / m.duration));
    set(m.from + (m.to - m.from) * m.ease(k), m.mode);
    if (m.emit) queueSend();
    if (k >= 1) {
      motion = null;
      finish(m);
    }
    return;
  }
  // coast
  const dt = Math.min(50, Math.max(0, now - m.last));
  m.last = now;
  const raw = snap.t + m.v * dt;
  m.v *= Math.exp(-dt / COAST_TAU_MS);
  const clamped = raw <= 0 || raw >= 1;
  set(raw, 'coast');
  queueSend();
  if (clamped) endStop(true);
  if (clamped || Math.abs(m.v) < COAST_STOP) {
    motion = null;
    settle();
  }
}

// ─── one shared animation frame loop ────────────────────────────────────
const frameCallbacks = new Set();
let raf = 0;
function loop(now) {
  raf = 0;
  stepMotion(now);
  frameCallbacks.forEach((cb) => cb(snap, now));
  if (motion || frameCallbacks.size) raf = requestAnimationFrame(loop);
}
function ensureLoop() {
  if (!raf) raf = requestAnimationFrame(loop);
}

// ─── public controls ────────────────────────────────────────────────────
const samples = [];
let keyTimer = null;

function velocity() {
  const now = performance.now();
  const last = samples[samples.length - 1];
  if (samples.length < 2 || now - last[0] > 60) return 0; // finger paused before lifting
  const first = samples[0];
  return last[0] - first[0] < 12 ? 0 : (last[1] - first[1]) / (last[0] - first[0]);
}

export const dial = {
  /** Finger lands on the ring. */
  grab() {
    motion = null;
    clearTimeout(keyTimer);
    samples.length = 0;
    pinned = false;
    set(snap.t, 'drag');
  },
  /** Finger moved by `dt` (fraction of a full turn; clockwise > 0). */
  turn(dt) {
    if (snap.mode !== 'drag') return;
    const raw = snap.t + dt;
    endStop(raw < 0 || raw > 1);
    set(raw, 'drag');
    const now = performance.now();
    samples.push([now, snap.t]);
    while (samples.length > 2 && now - samples[0][0] > VELOCITY_WINDOW_MS) samples.shift();
    queueSend();
  },
  /** Finger lifted (fling = false for a cancelled gesture). */
  release({ fling = true } = {}) {
    if (snap.mode !== 'drag') return;
    const v = fling ? velocity() : 0;
    if (!prefersReducedMotion() && Math.abs(v) > COAST_START && snap.t > 0 && snap.t < 1) {
      motion = { kind: 'coast', v: Math.sign(v) * Math.min(COAST_MAX, Math.abs(v)), last: performance.now() };
      set(snap.t, 'coast');
      ensureLoop();
    } else settle();
  },
  /** Smoothly sweep to a station (notch tap, preset button). */
  tuneToStation(id) {
    const era = TIMELINE_ERA_BY_ID[id];
    if (!era) return;
    clearTimeout(keyTimer);
    haptic(10);
    startTween(era.t, { mode: 'tween', emit: true, duration: Math.min(1500, 520 + Math.abs(era.t - snap.t) * 1400) });
  },
  /** Keyboard / wheel: step by whole years, commit after a short pause. */
  stepYears(n) {
    if (snap.mode === 'drag') return;
    motion = null;
    const year = Math.min(TIMELINE.endYear, Math.max(TIMELINE.startYear, snap.currentYear + n));
    set(progressFromYear(year), 'key');
    queueSend();
    clearTimeout(keyTimer);
    keyTimer = setTimeout(() => snap.mode === 'key' && commit(), KEY_COMMIT_MS);
  },
};

// ─── React bindings ─────────────────────────────────────────────────────
function subscribe(cb) {
  connect();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
    if (!listeners.size) scheduleTeardown();
  };
}

/** Subscribe to a slice of the dial. The selector must return a primitive or `s` itself. */
export function useTimeDial(selector = (s) => s) {
  return useSyncExternalStore(subscribe, () => selector(snap));
}

/** Run `cb(snapshot, now)` every animation frame while mounted — for imperative visual effects. */
export function useDialFrame(cb) {
  const ref = useRef(cb);
  useEffect(() => {
    ref.current = cb;
  });
  useEffect(() => {
    const f = (s, now) => ref.current(s, now);
    frameCallbacks.add(f);
    ensureLoop();
    return () => frameCallbacks.delete(f);
  }, []);
}
