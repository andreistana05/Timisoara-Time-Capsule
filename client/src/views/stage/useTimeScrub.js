/**
 * Live time-dial reading for /stage.
 *
 * The frozen useSocket() hook does not surface TIME_SCRUB_UPDATED (it only mirrors
 * the *settled* dial into globalState), so the Stage opens one tiny extra socket
 * (role "stage-tuner") that listens to the throttled ~40 Hz scrub stream. It can
 * also SEND TIME_SCRUB — the timeline bar on /stage is draggable for testing and
 * for demos without the tablet dial.
 *
 * Returns:
 *   targetRef  ref → latest { timeProgress, currentYear, nearestStation, stationProximity, inStation }
 *              (read it in rAF loops; updating it does NOT re-render)
 *   reading    same shape, React state, only updated when year/station/inStation change
 *   scrubTo(t) move the dial from the stage (local + emit, throttled)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { EVENTS, TIMELINE, readTimeDial, clamp01 } from '@shared/events.js';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

// module singleton with delayed release (StrictMode mounts twice in dev)
let sock = null;
let refs = 0;
let releaseTimer = null;
const subs = new Set();
function acquire() {
  clearTimeout(releaseTimer);
  if (!sock) {
    sock = io(SOCKET_URL, { query: { role: 'stage-tuner' }, transports: ['websocket', 'polling'] });
    sock.on(EVENTS.TIME_SCRUB_UPDATED, (p) => subs.forEach((f) => f(p)));
  }
  refs += 1;
  return sock;
}
function release() {
  refs = Math.max(0, refs - 1);
  if (refs === 0) {
    releaseTimer = setTimeout(() => {
      if (refs === 0 && sock) {
        sock.disconnect();
        sock = null;
      }
    }, 1500);
  }
}

const normalize = (t) => {
  const r = readTimeDial(clamp01(t));
  return { ...r, at: performance.now() };
};

export function useTimeScrub(state) {
  const initial = normalize(Number.isFinite(state?.timeProgress) ? state.timeProgress : TIMELINE.defaultProgress);
  const targetRef = useRef(initial);
  const [reading, setReading] = useState(initial);
  const lastEmit = useRef(0);
  const pendingEmit = useRef(null);
  const dragging = useRef(false);

  const apply = useCallback((t) => {
    if (!Number.isFinite(t)) return;
    const r = normalize(t);
    targetRef.current = r;
    setReading((prev) =>
      prev.currentYear === r.currentYear && prev.nearestStation === r.nearestStation && prev.inStation === r.inStation ? prev : r,
    );
  }, []);

  // settled dial / late join via globalState (ignored while the stage itself drags)
  const stateT = state?.timeProgress;
  useEffect(() => {
    if (Number.isFinite(stateT) && !dragging.current) apply(stateT);
  }, [stateT, apply]);

  // live stream from other screens
  useEffect(() => {
    acquire();
    const onScrub = (p) => {
      if (!dragging.current) apply(p?.timeProgress);
    };
    subs.add(onScrub);
    return () => {
      subs.delete(onScrub);
      release();
    };
  }, [apply]);

  /** Move the dial from /stage. Throttled to ~30 Hz, always sends the final position. */
  const scrubTo = useCallback(
    (t, { final = false } = {}) => {
      const x = clamp01(t);
      apply(x);
      dragging.current = !final;
      const send = () => {
        lastEmit.current = performance.now();
        pendingEmit.current = null;
        sock?.emit(EVENTS.TIME_SCRUB, { timeProgress: x });
      };
      clearTimeout(pendingEmit.current);
      if (final || performance.now() - lastEmit.current > 33) send();
      else pendingEmit.current = setTimeout(send, 33);
    },
    [apply],
  );

  return { targetRef, reading, scrubTo };
}
