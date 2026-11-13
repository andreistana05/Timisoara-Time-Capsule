/**
 * Generative ambient drone per chapter (pure WebAudio, no files).
 * Browsers block autoplay → call `enable()` from a click.
 * Exposes an AnalyserNode for the visualizer and `chime()` for celebrations.
 * Later: swap/add Howler-based field recordings in /client/public/assets/stage/.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const CHORDS = {
  '1989_piata_maria': [110.0, 130.81, 164.81, 220.0], // A minor — tension
  '1989_opera': [146.83, 220.0, 293.66, 369.99], // D major — release
  multicultural_mosaic: [130.81, 196.0, 220.0, 293.66, 329.63], // C pentatonic — harmony
};

export function useAmbientAudio(chapterId) {
  const ctxRef = useRef(null);
  const nodesRef = useRef(null);
  const [enabled, setEnabled] = useState(false);
  const [analyser, setAnalyser] = useState(null);

  const build = (ctx) => {
    const master = ctx.createGain();
    master.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    filter.Q.value = 4;
    const an = ctx.createAnalyser();
    an.fftSize = 2048;
    an.smoothingTimeConstant = 0.85;
    filter.connect(master);
    master.connect(an);
    an.connect(ctx.destination);

    // slow filter sweep
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.05;
    lfoGain.gain.value = 500;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();

    const voices = Array.from({ length: 5 }, (_, i) => {
      const osc = ctx.createOscillator();
      osc.type = i % 2 ? 'triangle' : 'sine';
      osc.detune.value = (i - 2) * 4;
      osc.frequency.value = 110;
      const g = ctx.createGain(); // voice level (0 = silent)
      g.gain.value = 0;
      // per-voice tremolo on a separate stage so silent voices stay silent
      const amp = ctx.createGain();
      amp.gain.value = 0.65;
      const trem = ctx.createOscillator();
      const tremGain = ctx.createGain();
      trem.frequency.value = 0.07 + i * 0.031;
      tremGain.gain.value = 0.35;
      trem.connect(tremGain).connect(amp.gain);
      trem.start();
      osc.connect(g).connect(amp).connect(filter);
      osc.start();
      return { osc, g };
    });
    return { master, filter, an, voices };
  };

  const applyChord = useCallback((id) => {
    const ctx = ctxRef.current;
    const n = nodesRef.current;
    if (!ctx || !n) return;
    const chord = CHORDS[id] || CHORDS['1989_piata_maria'];
    const now = ctx.currentTime;
    n.voices.forEach((v, i) => {
      const f = chord[i];
      v.g.gain.cancelScheduledValues(now);
      v.g.gain.setValueAtTime(v.g.gain.value, now);
      v.g.gain.linearRampToValueAtTime(f ? 0.08 : 0, now + 2.5);
      if (f) v.osc.frequency.exponentialRampToValueAtTime(f, now + 3);
    });
  }, []);

  const enable = useCallback(async () => {
    if (!ctxRef.current) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctxRef.current = ctx;
      nodesRef.current = build(ctx);
      setAnalyser(nodesRef.current.an);
    }
    const ctx = ctxRef.current;
    await ctx.resume();
    const g = nodesRef.current.master.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(g.value, ctx.currentTime);
    g.linearRampToValueAtTime(0.9, ctx.currentTime + 2);
    applyChord(chapterId);
    setEnabled(true);
  }, [applyChord, chapterId]);

  const disable = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const g = nodesRef.current.master.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(g.value, ctx.currentTime);
    g.linearRampToValueAtTime(0, ctx.currentTime + 1);
    setEnabled(false);
  }, []);

  /** Bell-like chime for new memories. */
  const chime = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx || !enabled) return;
    const base = (CHORDS[chapterId] || CHORDS['1989_piata_maria'])[2] * 4;
    const now = ctx.currentTime;
    [1, 2.76, 5.4].forEach((ratio, i) => {
      [0, 0.18, 0.36].forEach((delay, j) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.frequency.value = base * ratio * [1, 1.25, 1.5][j];
        g.gain.setValueAtTime(0.0001, now + delay);
        g.gain.exponentialRampToValueAtTime(0.12 / (i + 1), now + delay + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, now + delay + 2.5);
        osc.connect(g).connect(nodesRef.current.an);
        osc.start(now + delay);
        osc.stop(now + delay + 2.6);
      });
    });
  }, [enabled, chapterId]);

  useEffect(() => {
    if (enabled) applyChord(chapterId);
  }, [chapterId, enabled, applyChord]);

  useEffect(() => () => ctxRef.current?.close(), []);

  return { enabled, enable, disable, analyser, chime };
}
