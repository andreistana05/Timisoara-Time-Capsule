/**
 * Full-screen theatrical Spotlight shown whenever SELECT_MEMORY_NODE picks
 * a memory: volumetric light cone, drifting dust motes, Secession corner
 * ornaments, word-by-word testimony reveal. Auto-dismisses (see StageView).
 */
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio } from 'lucide-react';
import { CHAPTERS, tr } from '@shared/events.js';
import { ui } from '@shared/i18n.js';
import { SymbolIcon, SYMBOL_META } from '../../components/common.jsx';
import { s } from './stageStrings.js';

function DustMotes({ color }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    const motes = Array.from({ length: 150 }, () => ({ u: Math.random(), v: Math.random(), s: 0.3 + Math.random() * 1.6, sp: 0.0003 + Math.random() * 0.0012, ph: Math.random() * 6.28 }));
    let raf;
    const tick = (ms) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = color;
      motes.forEach((m) => {
        m.v -= m.sp;
        if (m.v < 0) m.v = 1;
        const halfCone = 0.04 + m.v * 0.36; // cone widens toward the floor
        const x = w / 2 + (m.u - 0.5) * 2 * halfCone * w + Math.sin(ms / 2000 + m.ph) * 8;
        const y = m.v * h;
        ctx.globalAlpha = (0.25 + 0.5 * Math.sin(ms / 900 + m.ph) ** 2) * (1 - Math.abs(m.u - 0.5) * 1.6);
        ctx.beginPath();
        ctx.arc(x, y, m.s, 0, Math.PI * 2);
        ctx.fill();
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [color]);
  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" />;
}

function Corner({ className, color }) {
  return (
    <svg viewBox="0 0 80 80" className={`pointer-events-none absolute h-20 w-20 ${className}`} fill="none" stroke={color} strokeWidth="1">
      <path d="M2 78 V2 H78" strokeOpacity="0.7" />
      <path d="M10 78 V10 H78" strokeOpacity="0.3" />
      <circle cx="10" cy="10" r="4" strokeOpacity="0.8" />
      <path d="M2 40 Q 22 40 22 22 Q 40 22 40 2" strokeOpacity="0.5" />
    </svg>
  );
}

export default function SpotlightOverlay({ memory, lang, duration, onClose }) {
  return (
    <AnimatePresence>
      {memory && (
        <Overlay key={memory.id} memory={memory} lang={lang} duration={duration} onClose={onClose} />
      )}
    </AnimatePresence>
  );
}

function Overlay({ memory, lang, duration, onClose }) {
  const chapter = CHAPTERS[memory.chapter];
  const color = chapter?.theme.primary || '#f59e0b';
  const symColor = SYMBOL_META[memory.symbol]?.color || color;
  const text = tr(memory.text, lang, memory.originalLanguage);
  const words = text.split(/\s+/).filter(Boolean);
  const stagger = Math.min(0.06, 4.5 / Math.max(words.length, 1));
  const cone = `conic-gradient(from 180deg at 50% -8%, ${color}55 0deg, ${color}1c 13deg, transparent 21deg, transparent 339deg, ${color}1c 347deg, ${color}55 360deg)`;

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.9 } }}
      transition={{ duration: 0.6 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-obsidian/90 backdrop-blur-md" />
      <motion.div
        className="pointer-events-none absolute inset-0 origin-top"
        style={{ background: cone, mixBlendMode: 'screen' }}
        initial={{ scaleX: 0.05, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-[-18vh] left-1/2 h-[40vh] w-[80vw] -translate-x-1/2 rounded-[50%]"
        style={{ background: `radial-gradient(ellipse, ${color}40, transparent 70%)` }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.6, delay: 0.4 }}
      />
      <DustMotes color={color} />
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, #0a0a0f 100%)' }} />

      <Corner className="left-8 top-8" color={color} />
      <Corner className="right-8 top-8 -scale-x-100" color={color} />
      <Corner className="bottom-8 left-8 -scale-y-100" color={color} />
      <Corner className="bottom-8 right-8 -scale-100" color={color} />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-16 text-center">
        <motion.p
          className="flex items-center gap-3 font-mono text-sm uppercase tracking-[0.45em]"
          style={{ color }}
          initial={{ opacity: 0, y: -10, letterSpacing: '0.9em' }}
          animate={{ opacity: 1, y: 0, letterSpacing: '0.45em' }}
          transition={{ duration: 1.2, delay: 0.3 }}
        >
          <Radio size={16} className="animate-pulse" /> {ui('spotlight', lang)} · {chapter?.place}
        </motion.p>

        <motion.div
          className="relative mt-10 flex h-28 w-28 items-center justify-center rounded-full"
          style={{ background: `${symColor}1f`, boxShadow: `0 0 90px ${symColor}aa, inset 0 0 30px ${symColor}55` }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 14, stiffness: 60, delay: 0.5 }}
        >
          <motion.span
            className="absolute inset-0 rounded-full border"
            style={{ borderColor: symColor }}
            animate={{ scale: [1, 1.8], opacity: [0.7, 0] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeOut' }}
          />
          <SymbolIcon symbol={memory.symbol} size={52} />
        </motion.div>

        <motion.h2
          className="mt-10 font-display text-6xl font-semibold leading-[1.02] xl:text-7xl 2xl:text-8xl"
          initial={{ opacity: 0, y: 30, filter: 'blur(14px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 1.2, delay: 0.7, ease: 'easeOut' }}
        >
          {tr(memory.title, lang, memory.originalLanguage) || memory.author}
        </motion.h2>

        <motion.p
          className="mt-5 font-mono text-base uppercase tracking-[0.3em] text-mist"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.1 }}
        >
          {memory.author}
          {memory.role ? ` · ${tr(memory.role, lang)}` : ''} · {memory.year}
        </motion.p>

        <p className="relative mt-10 max-w-5xl font-display text-3xl italic leading-snug text-ivory/90 xl:text-4xl">
          <span className="absolute -left-10 -top-6 font-display text-8xl not-italic leading-none" style={{ color, opacity: 0.35 }}>
            “
          </span>
          {words.map((w, i) => (
            <motion.span
              key={i}
              className="inline-block whitespace-pre"
              initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.6, delay: 1.3 + i * stagger }}
            >
              {w}{' '}
            </motion.span>
          ))}
        </p>

        <motion.p
          className="mt-10 font-mono text-xs uppercase tracking-[0.3em]"
          style={{ color: memory.composite ? '#9ca3af' : color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 + words.length * stagger }}
        >
          {memory.composite ? s('composite', lang) : s('visitor', lang)}
        </motion.p>
      </div>

      <motion.div
        className="absolute bottom-0 left-0 h-[3px]"
        style={{ background: color, boxShadow: `0 0 12px ${color}` }}
        initial={{ width: '0%' }}
        animate={{ width: '100%' }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
      />
    </motion.div>
  );
}
