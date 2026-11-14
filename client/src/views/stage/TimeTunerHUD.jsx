/**
 * Time Tuner HUD — the 1900 → 2026 "frequency band" across the top of /stage.
 *
 *  ┌ year (giant) ┬ station labels ─────────────────────────────────┬ archival context card ┐
 *  │ FM 104.9 MHz │ ▓▒░ live RF spectrum ░▒▓   ┃needle             │ (crossfades with the  │
 *  │ ▮▮▮▯▯ signal │ 1900 · 1920 · … decade ticks                     │  dial; "searching…"   │
 *  │ on air/…     │ [ static scope ]  [ signal scope ]               │  between stations)    │
 *  └──────────────┴──────────────────────────────────────────────────┴───────────────────────┘
 *
 * Everything that moves at 60 fps (needle, year, meter, cards, canvases) is written
 * straight to the DOM from one rAF loop — no React re-render per frame. The same loop
 * feeds the smoothed dial into the radio engine (tuner.setDial).
 */
import { useEffect, useMemo, useRef } from 'react';
import { Radio, Power } from 'lucide-react';
import { TIMELINE_ERAS, TIMELINE_ERA_BY_ID, readTimeDial, yearFromProgress, progressFromYear } from '@shared/events.js';
import { stationWindow } from './useTimeTuner.js';
import { T, ERA_CONTEXT, t_ } from './tunerStrings.js';

const fm = (t) => 87.5 + t * 20.5;
const DECADES = [1900, 1910, 1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];

function nearestEra(t) {
  let best = TIMELINE_ERAS[0];
  for (const e of TIMELINE_ERAS) if (Math.abs(t - e.t) < Math.abs(t - best.t)) best = e;
  return best;
}

function fitCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

function drawScope(canvas, data, synth, color, amount) {
  const { ctx, w, h } = fitCanvas(canvas);
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#f5f0e6';
  ctx.globalAlpha = 0.08;
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();
  const n = 160;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const v = data ? (data[Math.floor((i / n) * data.length)] - 128) / 128 : synth(i / n);
    pts.push([(i / (n - 1)) * w, h / 2 + v * h * 0.46]);
  }
  [
    [5, 0.15 + 0.2 * amount],
    [1.5, 0.5 + 0.5 * amount],
  ].forEach(([lw, a]) => {
    ctx.globalAlpha = a;
    ctx.lineWidth = lw;
    ctx.strokeStyle = color;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
}

export default function TimeTunerHUD({ targetRef, reading, tuner, lang, soundOn, onActivate, scrubTo }) {
  const needleRef = useRef(null);
  const needleChipRef = useRef(null);
  const yearRef = useRef(null);
  const freqRef = useRef(null);
  const meterRefs = useRef([]);
  const cardRefs = useRef({});
  const searchRef = useRef(null);
  const bandRef = useRef(null);
  const spectrumRef = useRef(null);
  const staticRef = useRef(null);
  const signalRef = useRef(null);
  const draggingRef = useRef(false);

  // live values for the rAF loop without restarting it
  const live = useRef({});
  live.current = { analysers: tuner.analysers, setDial: tuner.setDial, enabled: tuner.enabled };

  const decadeLabels = useMemo(() => {
    const out = [];
    let last = -1;
    DECADES.forEach((y) => {
      const t = progressFromYear(y);
      const nearStation = TIMELINE_ERAS.some((e) => Math.abs(e.t - t) < 0.02 && e.year !== y);
      if (t - last >= 0.035 && !nearStation) {
        out.push({ y, t });
        last = t;
      }
    });
    return out;
  }, []);
  const tickTs = useMemo(() => DECADES.map((y) => progressFromYear(y)), []);

  useEffect(() => {
    let cur = targetRef.current?.timeProgress ?? 0.85;
    let prevMs = performance.now();
    let lastYear = null;
    let freqBuf = null;
    let staticBuf = null;
    let signalBuf = null;
    let raf;
    const loop = (ms) => {
      const dt = Math.min(0.1, (ms - prevMs) / 1000);
      prevMs = ms;
      const target = targetRef.current?.timeProgress ?? cur;
      cur += (target - cur) * (1 - Math.exp(-dt * 12));
      if (Math.abs(target - cur) < 1e-4) cur = target;

      const { analysers, setDial, enabled } = live.current;
      if (enabled) setDial(cur);

      const r = readTimeDial(cur);
      const prox = r.stationProximity;
      const era = nearestEra(cur);
      const color = era.theme.primary;

      // needle
      if (needleRef.current) {
        needleRef.current.style.left = `${cur * 100}%`;
        needleRef.current.style.background = color;
        needleRef.current.style.color = color;
        needleRef.current.style.boxShadow = `0 0 ${10 + prox * 24}px ${color}, 0 0 4px #fff`;
      }
      if (needleChipRef.current) needleChipRef.current.style.color = color;
      const year = Math.round(yearFromProgress(cur));
      if (year !== lastYear && yearRef.current) {
        yearRef.current.textContent = String(year);
        if (needleChipRef.current) needleChipRef.current.textContent = String(year);
        lastYear = year;
      }
      if (yearRef.current) yearRef.current.style.textShadow = `0 0 ${prox * 40}px ${color}`;
      if (freqRef.current) freqRef.current.textContent = fm(cur).toFixed(1);
      const lit = Math.ceil(prox * 5 - 0.01);
      meterRefs.current.forEach((el, i) => {
        if (!el) return;
        el.style.background = i < lit ? color : '#f5f0e61a';
        el.style.boxShadow = i < lit ? `0 0 8px ${color}` : 'none';
      });

      // archival cards crossfade
      let maxW = 0;
      TIMELINE_ERAS.forEach((e) => {
        const w = stationWindow(cur, e, 1.6);
        maxW = Math.max(maxW, w);
        const el = cardRefs.current[e.id];
        if (el) {
          el.style.opacity = String(w);
          el.style.transform = `translateY(${(1 - w) * 10}px)`;
          el.style.pointerEvents = w > 0.5 ? 'auto' : 'none';
        }
      });
      if (searchRef.current) searchRef.current.style.opacity = String(Math.max(0, 1 - maxW * 1.4));

      // RF spectrum across the band
      const mix = analysers?.mix;
      if (mix) {
        if (!freqBuf) freqBuf = new Uint8Array(mix.frequencyBinCount);
        mix.getByteFrequencyData(freqBuf);
      }
      if (spectrumRef.current) {
        const { ctx, w, h } = fitCanvas(spectrumRef.current);
        ctx.clearRect(0, 0, w, h);
        const step = 3;
        for (let x = 0; x < w; x += step) {
          const tx = x / w;
          let carrier = 0;
          let ce = TIMELINE_ERAS[0];
          TIMELINE_ERAS.forEach((e) => {
            const v = stationWindow(tx, e, 1.6);
            if (v > carrier) {
              carrier = v;
              ce = e;
            }
          });
          if (Math.abs(tx - ce.t) > 0.2) ce = nearestEra(tx);
          const audio = freqBuf ? (freqBuf[Math.floor((x / w) ** 1.6 * 380)] / 255) * 0.35 : 0;
          const near = Math.max(0, 1 - Math.abs(tx - cur) * 14) * 0.15;
          const v = Math.min(1, carrier * 0.7 + 0.06 + Math.random() * 0.09 + audio + near);
          ctx.globalAlpha = 0.18 + carrier * 0.55 + near * 2;
          ctx.fillStyle = ce.theme.primary;
          ctx.fillRect(x, h - v * h, step - 1, v * h);
        }
        ctx.globalAlpha = 1;
      }

      // scopes
      const sa = analysers?.staticAn;
      const sg = analysers?.signal;
      if (sa && enabled) {
        if (!staticBuf) staticBuf = new Uint8Array(sa.fftSize);
        sa.getByteTimeDomainData(staticBuf);
      }
      if (sg && enabled) {
        if (!signalBuf) signalBuf = new Uint8Array(sg.fftSize);
        sg.getByteTimeDomainData(signalBuf);
      }
      const ts = ms / 1000;
      if (staticRef.current) {
        drawScope(staticRef.current, sa && enabled ? staticBuf : null, () => (Math.random() - 0.5) * 1.6 * (1 - prox), '#9ca3af', 1 - prox);
      }
      if (signalRef.current) {
        drawScope(
          signalRef.current,
          sg && enabled ? signalBuf : null,
          (u) => prox * (0.55 * Math.sin(u * 22 + ts * 6) + 0.25 * Math.sin(u * 57 - ts * 9) + 0.12 * Math.sin(u * 131 + ts * 3)),
          color,
          prox,
        );
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [targetRef]);

  // drag along the band → TIME_SCRUB
  const tFromEvent = (e) => {
    const rect = bandRef.current.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  };
  const onDown = (e) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    scrubTo(tFromEvent(e));
  };
  const onMove = (e) => {
    if (draggingRef.current) scrubTo(tFromEvent(e));
  };
  const onUp = (e) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    scrubTo(tFromEvent(e), { final: true });
  };

  const onAirEra = reading.inStation ? TIMELINE_ERA_BY_ID[reading.nearestStation] : null;
  const accent = (onAirEra || TIMELINE_ERA_BY_ID[reading.nearestStation])?.theme.primary || '#f59e0b';

  return (
    <section
      className="relative z-10 mx-10 mt-5 grid grid-cols-[14rem_minmax(0,1fr)_26rem] gap-6 rounded-3xl p-5 glass transition-[border-color] duration-1000"
      style={{ borderColor: `${accent}44` }}
    >
      {/* ── year + frequency + meter ── */}
      <div className="flex flex-col justify-between">
        <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.35em]" style={{ color: accent }}>
          <Radio size={13} className={soundOn ? 'animate-pulse' : ''} /> {t_('timeTuner', lang)}
        </p>
        <span ref={yearRef} className="font-display text-8xl font-semibold leading-none tabular-nums text-ivory transition-[text-shadow]" />
        <div className="flex items-center justify-between font-mono text-sm text-mist">
          <span>
            FM <span ref={freqRef} className="tabular-nums text-ivory" /> MHz
          </span>
          <span className="flex h-4 items-end gap-[3px]" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} ref={(el) => (meterRefs.current[i] = el)} className="w-[5px] rounded-sm" style={{ height: `${30 + i * 17}%` }} />
            ))}
          </span>
        </div>
        {soundOn ? (
          <p className="truncate font-mono text-[11px] uppercase tracking-[0.25em]" style={{ color: onAirEra ? accent : '#9ca3af' }}>
            {onAirEra ? `● ${t_('onAir', lang)} · ${onAirEra.year}` : `◌ ${t_('static', lang)}…`}
          </p>
        ) : (
          <button
            onClick={onActivate}
            className="relative flex items-center justify-center gap-2 overflow-hidden rounded-full px-3 py-2 font-mono text-[11px] uppercase tracking-[0.15em] text-obsidian"
            style={{ background: accent, boxShadow: `0 0 24px ${accent}88` }}
          >
            <span className="absolute inset-0 animate-pulse bg-white/20" />
            <Power size={14} className="relative" /> <span className="relative leading-tight">{t_('activate', lang)}</span>
          </button>
        )}
      </div>

      {/* ── band: station labels · spectrum + needle · decade ticks · scopes ── */}
      <div className="flex min-w-0 flex-col">
        <div className="relative h-9">
          {TIMELINE_ERAS.map((e) => {
            const on = reading.inStation && reading.nearestStation === e.id;
            return (
              <div
                key={e.id}
                className="absolute bottom-0 whitespace-nowrap text-center font-mono text-[11px] transition-colors duration-700"
                style={{ left: `${e.t * 100}%`, transform: `translateX(${e.t > 0.95 ? -85 : -50}%)`, color: on ? e.theme.primary : '#9ca3af' }}
              >
                <span className="font-semibold">{e.year}</span> · {fm(e.t).toFixed(1)}
              </div>
            );
          })}
        </div>

        <div
          ref={bandRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="relative h-20 cursor-ew-resize touch-none select-none rounded-xl border border-ivory/10 bg-obsidian/60"
          title={t_('dragHint', lang)}
        >
          <canvas ref={spectrumRef} className="absolute inset-0 h-full w-full rounded-xl" />
          {TIMELINE_ERAS.map((e) => (
            <span
              key={e.id}
              className="absolute inset-y-0 w-px"
              style={{ left: `${e.t * 100}%`, background: e.theme.primary, opacity: 0.5, boxShadow: `0 0 8px ${e.theme.primary}` }}
            />
          ))}
          {tickTs.map((t, i) => (
            <span key={i} className="absolute bottom-0 h-2 w-px bg-ivory/40" style={{ left: `${t * 100}%` }} />
          ))}
          <div ref={needleRef} className="pointer-events-none absolute -bottom-1.5 -top-1.5 w-[3px] -translate-x-1/2 rounded-full">
            <span className="absolute -top-1 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[6px] border-t-[8px] border-x-transparent" style={{ borderTopColor: 'currentColor' }} />
            <span
              ref={needleChipRef}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md bg-obsidian/90 px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums"
            />
          </div>
        </div>

        <div className="relative h-5">
          {decadeLabels.map(({ y, t }) => (
            <span key={y} className="absolute top-1 -translate-x-1/2 font-mono text-[10px] text-mist/70" style={{ left: `${t * 100}%` }}>
              {y}
            </span>
          ))}
        </div>

        <div className="mt-1 grid flex-1 grid-cols-2 gap-3">
          {[
            [staticRef, t_('static', lang)],
            [signalRef, t_('signal', lang)],
          ].map(([ref, label]) => (
            <div key={label} className="relative min-h-[3.25rem] overflow-hidden rounded-lg border border-ivory/10 bg-obsidian/50">
              <canvas ref={ref} className="absolute inset-0 h-full w-full" />
              <span className="absolute left-2 top-1 font-mono text-[9px] uppercase tracking-[0.3em] text-mist">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── archival context cards (crossfaded by the rAF loop) ── */}
      <div className="relative min-h-[11.5rem]">
        <div ref={searchRef} className="absolute inset-0 flex flex-col rounded-2xl border border-dashed border-ivory/15 p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-mist">◌ {t_('searching', lang)}</p>
          <p className="mt-3 text-base leading-snug text-ivory/70">{t_('searchingBody', lang)}</p>
        </div>
        {TIMELINE_ERAS.map((e) => (
          <div
            key={e.id}
            ref={(el) => (cardRefs.current[e.id] = el)}
            className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl p-4"
            style={{ opacity: 0, background: `linear-gradient(135deg, ${e.theme.primary}22, transparent 70%)`, border: `1px solid ${e.theme.primary}55` }}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.3em]" style={{ color: e.theme.primary }}>
              {e.year} · FM {fm(e.t).toFixed(1)}
            </p>
            <h3 className="mt-1 line-clamp-2 font-display text-2xl font-semibold leading-tight">{e.title[lang] || e.title.en}</h3>
            <p className="mt-2 line-clamp-3 text-[15px] leading-snug text-ivory/80">{ERA_CONTEXT[e.id]?.[lang] || ERA_CONTEXT[e.id]?.en}</p>
            <p className="mt-auto pt-2 font-mono text-[9px] uppercase tracking-[0.2em] text-mist/80">{T.reconstruction[lang] || T.reconstruction.en}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
