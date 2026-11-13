/**
 * Cinematic celebration on every MEMORY_ADDED:
 *   light pillar rising from the floor → shockwave rings → main burst →
 *   staggered secondary fireworks → rising streaking embers,
 * plus a card with the new memory. After it fades, a toast lingers in the
 * corner (stack of the latest 3) so late-arriving jurors still see it.
 */
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CHAPTERS, tr } from '@shared/events.js';
import { ui } from '@shared/i18n.js';
import { SymbolIcon, SYMBOL_META } from '../../components/common.jsx';
import { s } from './stageStrings.js';

const DURATION = 7500;
const TOAST_MS = 16000;

function Fireworks({ color, accent }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const palette = [color, accent, '#fde68a', '#f5f0e6', color];
    const parts = [];
    const rings = [];
    const burst = (x, y, n, speed) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = speed * (0.3 + Math.random() * 0.9);
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 0.8 + Math.random() * 2.2, c: palette[(Math.random() * palette.length) | 0], life: 1, decay: 0.986 + Math.random() * 0.008, g: 0.04 });
      }
      rings.push({ x, y, r: 4, life: 1 });
    };
    const start = performance.now();
    const schedule = [
      { at: 550, fn: () => burst(w / 2, h / 2, 340, 11) },
      { at: 1150, fn: () => burst(w * (0.15 + Math.random() * 0.2), h * (0.2 + Math.random() * 0.3), 140, 7) },
      { at: 1500, fn: () => burst(w * (0.65 + Math.random() * 0.2), h * (0.2 + Math.random() * 0.3), 140, 7) },
      { at: 2000, fn: () => burst(w * (0.3 + Math.random() * 0.4), h * (0.12 + Math.random() * 0.2), 160, 8) },
      { at: 2700, fn: () => burst(w * (0.1 + Math.random() * 0.8), h * (0.25 + Math.random() * 0.4), 110, 6) },
    ];
    let raf;
    const tick = (now) => {
      const t = now - start;
      while (schedule.length && t >= schedule[0].at) schedule.shift().fn();
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';

      // light pillar (0 → 1.2s grow, then fade)
      const pillar = Math.min(t / 600, 1) * Math.max(0, 1 - Math.max(0, t - 1200) / 2200);
      if (pillar > 0) {
        const pw = 140 * pillar + 20;
        const top = h - h * Math.min(t / 550, 1);
        const grad = ctx.createLinearGradient(0, h, 0, top);
        grad.addColorStop(0, `${color}cc`);
        grad.addColorStop(1, `${color}00`);
        ctx.globalAlpha = pillar;
        ctx.fillStyle = grad;
        ctx.fillRect(w / 2 - pw / 2, top, pw, h - top);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = pillar * 0.6;
        ctx.fillRect(w / 2 - 2, top, 4, h - top);
      }

      // rising embers from the floor
      if (t < 5200 && Math.random() < 0.9) {
        for (let i = 0; i < 3; i++) {
          parts.push({ x: w / 2 + (Math.random() - 0.5) * w * 0.9, y: h + 5, vx: (Math.random() - 0.5) * 0.6, vy: -(1.5 + Math.random() * 3.5), r: 0.6 + Math.random() * 1.6, c: palette[(Math.random() * palette.length) | 0], life: 1, decay: 0.992, g: -0.01 });
        }
      }

      // shockwave rings
      rings.forEach((rg) => {
        rg.r += 9 * rg.life + 1;
        rg.life *= 0.965;
        ctx.globalAlpha = rg.life * 0.8;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5 * rg.life + 0.5;
        ctx.beginPath();
        ctx.arc(rg.x, rg.y, rg.r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // particles drawn as short streaks
      ctx.lineCap = 'round';
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.982;
        p.vy = p.vy * 0.982 + p.g;
        p.life *= p.decay;
        if (p.life < 0.03 || p.y < -20) {
          parts.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = p.life;
        ctx.strokeStyle = p.c;
        ctx.lineWidth = p.r;
        ctx.beginPath();
        ctx.moveTo(p.x - p.vx * 3, p.y - p.vy * 3);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [color, accent]);
  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" />;
}

function Toasts({ toasts, lang }) {
  return (
    <div className="pointer-events-none fixed bottom-48 right-10 z-30 flex w-[26rem] flex-col gap-3">
      <AnimatePresence>
        {toasts.map(({ memory: m, receivedAt }) => {
          const color = SYMBOL_META[m.symbol]?.color || '#f59e0b';
          return (
            <motion.div
              key={receivedAt}
              layout
              initial={{ opacity: 0, x: 80, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, transition: { duration: 0.8 } }}
              transition={{ type: 'spring', damping: 20 }}
              className="relative overflow-hidden rounded-2xl p-4 glass"
              style={{ borderColor: `${color}66`, boxShadow: `0 0 30px ${color}33` }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: `${color}22` }}>
                  <SymbolIcon symbol={m.symbol} size={20} />
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color }}>
                    {ui('newMemory', lang)} · {CHAPTERS[m.chapter]?.place}
                  </p>
                  <p className="truncate font-display text-xl">{tr(m.title, lang, m.originalLanguage) || m.author}</p>
                  <p className="truncate font-mono text-xs text-mist">{m.author}</p>
                </div>
              </div>
              <motion.span
                className="absolute bottom-0 left-0 h-0.5"
                style={{ background: color }}
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: TOAST_MS / 1000, ease: 'linear' }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export default function Celebration({ lastAddedMemory, lang }) {
  const [current, setCurrent] = useState(null);
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Set());

  useEffect(() => {
    const set = timers.current;
    return () => set.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    // ignore stale memories replayed when navigating back to /stage
    if (!lastAddedMemory || Date.now() - lastAddedMemory.receivedAt > 10000) return;
    const later = (fn, ms) => {
      const id = setTimeout(() => {
        timers.current.delete(id);
        fn();
      }, ms);
      timers.current.add(id);
    };
    const key = lastAddedMemory.receivedAt;
    setCurrent(lastAddedMemory);
    later(() => setCurrent((c) => (c?.receivedAt === key ? null : c)), DURATION);
    later(() => setToasts((ts) => [lastAddedMemory, ...ts.filter((x) => x.receivedAt !== key)].slice(0, 3)), DURATION - 600);
    later(() => setToasts((ts) => ts.filter((x) => x.receivedAt !== key)), DURATION + TOAST_MS);
  }, [lastAddedMemory]);

  const m = current?.memory;
  const color = m ? SYMBOL_META[m.symbol]?.color : '#f59e0b';
  const accent = m ? CHAPTERS[m.chapter]?.theme.primary || '#38bdf8' : '#38bdf8';

  return (
    <>
      <Toasts toasts={toasts} lang={lang} />
      <AnimatePresence>
        {m && (
          <motion.div
            key={current.receivedAt}
            className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 1.1 } }}
            onClick={() => setCurrent(null)}
          >
            <div className="absolute inset-0 bg-obsidian/85 backdrop-blur-md" />
            <motion.div
              className="pointer-events-none absolute inset-0"
              style={{ background: `radial-gradient(circle at 50% 50%, ${color}55, transparent 55%)` }}
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: [0, 1, 0.35], scale: [0.3, 1.2, 1] }}
              transition={{ duration: 1.8, delay: 0.45, ease: 'easeOut' }}
            />
            <Fireworks color={color} accent={accent} />
            <motion.div
              initial={{ scale: 0.6, y: 80, opacity: 0, filter: 'blur(12px)' }}
              animate={{ scale: 1, y: 0, opacity: 1, filter: 'blur(0px)' }}
              transition={{ type: 'spring', damping: 18, stiffness: 70, delay: 0.7 }}
              className="relative max-w-5xl px-12 text-center"
            >
              <motion.div
                className="relative mx-auto mb-8 flex h-36 w-36 items-center justify-center rounded-full"
                style={{ background: `${color}22`, boxShadow: `0 0 140px ${color}, inset 0 0 40px ${color}66` }}
                animate={{ scale: [1, 1.07, 1] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
              >
                {[0, 0.8, 1.6].map((d) => (
                  <motion.span
                    key={d}
                    className="absolute inset-0 rounded-full border-2"
                    style={{ borderColor: color }}
                    animate={{ scale: [1, 2.4], opacity: [0.8, 0] }}
                    transition={{ duration: 2.4, repeat: Infinity, delay: d, ease: 'easeOut' }}
                  />
                ))}
                <SymbolIcon symbol={m.symbol} size={70} />
              </motion.div>
              <p className="font-mono text-sm uppercase tracking-[0.5em]" style={{ color }}>
                ✦ {s('justArrived', lang)} ✦
              </p>
              <h2 className="mt-4 font-display text-6xl font-semibold leading-tight xl:text-8xl">{m.author}</h2>
              {tr(m.title, lang, m.originalLanguage) && (
                <p className="mt-3 font-display text-3xl text-ivory/70">{tr(m.title, lang, m.originalLanguage)}</p>
              )}
              <p className="mx-auto mt-6 line-clamp-4 max-w-4xl font-display text-3xl italic leading-snug text-ivory/85 xl:text-4xl">
                “{tr(m.text, lang, m.originalLanguage)}”
              </p>
              <p className="mt-6 font-mono text-xs uppercase tracking-[0.3em] text-mist">
                {CHAPTERS[m.chapter]?.title[lang]} · {s('visitor', lang)}
              </p>
            </motion.div>
            <motion.div
              className="absolute bottom-0 left-0 h-1"
              style={{ background: color, boxShadow: `0 0 16px ${color}` }}
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: DURATION / 1000, ease: 'linear' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
