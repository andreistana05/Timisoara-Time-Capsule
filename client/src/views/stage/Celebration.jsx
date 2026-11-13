import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { tr } from '@shared/events.js';
import { ui } from '@shared/i18n.js';
import { SymbolIcon, SYMBOL_META } from '../../components/common.jsx';

const DURATION = 7000;

function ParticleBurst({ color }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const w = (canvas.width = window.innerWidth);
    const h = (canvas.height = window.innerHeight);
    const palette = [color, '#fde68a', '#f5f0e6', '#38bdf8', '#ef4444'];
    const parts = Array.from({ length: 260 }, () => {
      const a = Math.random() * Math.PI * 2;
      const v = 2 + Math.random() * 9;
      return { x: w / 2, y: h / 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, r: 1 + Math.random() * 3, c: palette[(Math.random() * palette.length) | 0], life: 1 };
    });
    let raf;
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      parts.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.985;
        p.vy = p.vy * 0.985 - 0.03; // embers drift upward
        p.life *= 0.992;
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [color]);
  return <canvas ref={ref} className="pointer-events-none absolute inset-0" />;
}

export default function Celebration({ lastAddedMemory, lang }) {
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    if (!lastAddedMemory) return;
    setCurrent(lastAddedMemory);
    const t = setTimeout(() => setCurrent(null), DURATION);
    return () => clearTimeout(t);
  }, [lastAddedMemory]);

  const m = current?.memory;
  const color = m ? SYMBOL_META[m.symbol]?.color : '#f59e0b';

  return (
    <AnimatePresence>
      {m && (
        <motion.div
          key={current.receivedAt}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-obsidian/80 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 1 } }}
          onClick={() => setCurrent(null)}
        >
          <ParticleBurst color={color} />
          <motion.div
            initial={{ scale: 0.6, y: 60, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 16, delay: 0.15 }}
            className="relative max-w-4xl px-10 text-center"
          >
            <motion.div
              className="mx-auto mb-8 flex h-32 w-32 items-center justify-center rounded-full"
              style={{ background: `${color}22`, boxShadow: `0 0 120px ${color}` }}
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <SymbolIcon symbol={m.symbol} size={64} />
            </motion.div>
            <p className="font-mono text-sm uppercase tracking-[0.5em]" style={{ color }}>
              ✦ {ui('newMemory', lang)} ✦
            </p>
            <h2 className="mt-4 font-display text-6xl font-semibold leading-tight xl:text-7xl">{m.author}</h2>
            <p className="mx-auto mt-6 max-w-3xl font-display text-3xl italic leading-snug text-ivory/85">
              “{tr(m.text, lang, m.originalLanguage)}”
            </p>
          </motion.div>
          <motion.div
            className="absolute bottom-0 left-0 h-1"
            style={{ background: color }}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: DURATION / 1000, ease: 'linear' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
