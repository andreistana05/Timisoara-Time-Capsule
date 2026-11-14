/**
 * Radio faceplate under the Time Tuner: vintage-futuristic year readout, a signal-strength
 * meter + mini oscilloscope ("frequency lock"), and what is playing on the current station.
 *
 * Only coarse values (year, station, lock) re-render React; the static flicker, meter bars
 * and the scope trace run imperatively in the shared dial frame loop.
 */
import { useRef } from 'react';
import { motion } from 'framer-motion';
import { TIMELINE_ERA_BY_ID } from '@shared/events.js';
import { LOCK_GREEN, prefersReducedMotion, useDialFrame, useTimeDial } from './timeDial.js';
import { STATION_SHORT, t } from './strings.js';

const BARS = 12;
const barColor = (i) => (i < 5 ? '#f59e0b' : i < 9 ? '#a3e635' : LOCK_GREEN);
/** Cheap deterministic noise in [0, 1). */
const hash = (k) => {
  const x = Math.sin(k * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

function drawScope(canvas, s, now, reduce) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const p = s.stationProximity;
  const noise = 1 - p;
  const mid = h / 2;
  const phase = reduce ? 0 : now * 0.008;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 2) {
    const wave = Math.sin(x * 0.17 + phase) * h * 0.34 * p;
    const fuzz = reduce ? 0 : (Math.random() - 0.5) * h * 0.85 * noise;
    const y = mid + wave + fuzz;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = s.inStation ? LOCK_GREEN : `rgba(156,163,175,${(0.4 + 0.45 * p).toFixed(2)})`;
  ctx.shadowColor = LOCK_GREEN;
  ctx.shadowBlur = s.inStation ? 8 : 0;
  ctx.stroke();
}

function SignalMeter({ lang, locked }) {
  const bars = useRef([]);
  const lamp = useRef(null);
  const scope = useRef(null);
  const lastK = useRef(-1);
  const reduce = prefersReducedMotion();

  useDialFrame((s, now) => {
    // The static re-rolls at ~20 Hz: analog grain, not a strobe.
    const k = Math.floor(now / 50);
    if (k !== lastK.current || s.inStation) {
      lastK.current = k;
      const p = s.stationProximity;
      const rnd = reduce ? 0.4 : hash(k);
      const level = s.inStation ? 0.6 + 0.4 * p : 0.08 + 0.5 * p + (1 - p) * 0.3 * rnd;
      const lit = Math.round(level * BARS);
      bars.current.forEach((el, i) => {
        if (!el) return;
        const on = i < lit;
        el.style.opacity = on ? (s.inStation ? '1' : (0.45 + 0.45 * (reduce ? 0.5 : hash(k + i))).toFixed(2)) : '0.14';
        el.style.backgroundColor = on ? (s.inStation ? barColor(i) : '#f59e0b') : '#9ca3af';
        el.style.boxShadow = on && s.inStation ? `0 0 8px ${barColor(i)}` : 'none';
      });
      const l = lamp.current;
      if (l) {
        const blip = !reduce && hash(k + 99) > 0.85;
        l.style.backgroundColor = s.inStation ? LOCK_GREEN : p > 0 || blip ? '#f59e0b' : '#3f3f46';
        l.style.opacity = s.inStation ? '1' : p > 0 ? (0.35 + 0.65 * p).toFixed(2) : blip ? '0.5' : '1';
        l.style.boxShadow = s.inStation ? `0 0 12px ${LOCK_GREEN}, 0 0 24px ${LOCK_GREEN}88` : 'none';
      }
    }
    if (scope.current) drawScope(scope.current, s, now, reduce);
  });

  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      <div className="flex h-7 items-end gap-[3px]">
        {Array.from({ length: BARS }, (_, i) => (
          <span
            key={i}
            ref={(el) => (bars.current[i] = el)}
            className="w-1 rounded-sm"
            style={{ height: `${6 + (i * 22) / (BARS - 1)}px`, backgroundColor: '#9ca3af', opacity: 0.14 }}
          />
        ))}
      </div>
      <canvas ref={scope} className="h-7 min-w-0 flex-1 rounded-md bg-black/30" />
      <span className="flex items-center gap-2">
        <span ref={lamp} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#3f3f46' }} />
        <span
          className="font-mono text-[10px] uppercase tracking-[0.25em] transition-colors duration-500"
          style={{ color: locked ? LOCK_GREEN : '#9ca3af' }}
        >
          {locked ? t('locked', lang) : t('signal', lang)}
        </span>
      </span>
    </div>
  );
}

export default function TunerFaceplate({ lang }) {
  const year = useTimeDial((s) => s.currentYear);
  const stationId = useTimeDial((s) => s.nearestStation);
  const locked = useTimeDial((s) => s.inStation);
  const near = useTimeDial((s) => s.stationProximity > 0);
  const era = TIMELINE_ERA_BY_ID[stationId];
  const yearRef = useRef(null);
  const reduce = prefersReducedMotion();

  useDialFrame((s, now) => {
    const el = yearRef.current;
    if (!el) return;
    if (s.inStation || reduce) {
      el.style.opacity = '1';
      el.style.transform = '';
      return;
    }
    const k = Math.floor(now / 60);
    const noise = 1 - s.stationProximity;
    el.style.opacity = (1 - noise * 0.35 * hash(k)).toFixed(2);
    el.style.transform = `translateX(${((hash(k + 7.3) - 0.5) * 2.4 * noise).toFixed(2)}px)`;
  });

  const title = locked
    ? era.title[lang]
    : near
      ? `${t('tuningIn', lang)} → ${era.year} · ${STATION_SHORT[era.id][lang]}`
      : t('searching', lang);
  const sub = locked ? era.subtitle[lang] : t('turnHint', lang);

  return (
    <div className="glass relative w-full overflow-hidden rounded-3xl px-4 py-3 sm:px-5">
      {/* lock glow wash */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-700"
        style={{ opacity: locked ? 1 : 0, background: `radial-gradient(circle at 12% 50%, ${era.theme.primary}26, transparent 60%)` }}
      />
      <div className="relative flex items-center gap-4 sm:gap-5">
        {/* year readout */}
        <div className="shrink-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-mist">{t('tuner', lang)}</p>
          <div className="relative mt-1 font-mono text-5xl font-semibold leading-none tabular-nums sm:text-6xl">
            <span aria-hidden="true" className="text-ivory/[0.06]">
              8888
            </span>
            <span
              ref={yearRef}
              className="absolute inset-0 transition-[color,text-shadow] duration-700"
              style={{
                color: locked ? era.theme.primary : '#f5f0e6',
                textShadow: locked ? `0 0 16px ${era.theme.glow}, 0 0 40px ${era.theme.primary}88` : '0 0 10px rgba(245,240,230,.25)',
              }}
            >
              {year}
            </span>
          </div>
        </div>

        {/* signal + station */}
        <div className="min-w-0 flex-1">
          <SignalMeter lang={lang} locked={locked} />
          <motion.div
            key={locked ? era.id : near ? `near-${era.id}` : 'static'}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <p
              className={`mt-1.5 truncate font-display text-lg font-semibold leading-tight sm:text-xl ${locked ? 'text-ivory' : 'text-ivory/65'}`}
            >
              {title}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-ivory/60">{sub}</p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
