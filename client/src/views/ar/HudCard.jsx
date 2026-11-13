/**
 * Glass HUD card for a tapped memory: gradient border, symbol medallion,
 * word-by-word highlighting while the story is read aloud, a small voice meter,
 * and swipe-down-to-close from the grab handle.
 */
import { useEffect, useMemo, useRef } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { X, Volume2, Square, Headphones } from 'lucide-react';
import { tr } from '@shared/events.js';
import { SymbolIcon, SYMBOL_META } from '../../components/common.jsx';
import { t } from './strings.js';

function VoiceMeter({ active, color }) {
  return (
    <span className="flex h-4 items-end gap-[3px]" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="w-[3px] rounded-full"
          style={{
            background: color,
            height: active ? '100%' : '25%',
            animation: active ? `ar-meter 0.${6 + i}s ease-in-out ${i * 0.08}s infinite alternate` : 'none',
            transition: 'height .3s',
          }}
        />
      ))}
    </span>
  );
}

export default function HudCard({ memory, lang, theme, speaking, bodyCharIndex, titleActive, canSpeak, onClose, onToggleSpeak }) {
  const drag = useDragControls();
  const color = SYMBOL_META[memory.symbol]?.color || theme.primary;
  const title = tr(memory.title, lang, memory.originalLanguage);
  const body = tr(memory.text, lang, memory.originalLanguage);
  const words = useMemo(() => [...body.matchAll(/\S+\s*/g)].map((m) => ({ w: m[0], i: m.index })), [body]);

  let current = -1;
  if (speaking && bodyCharIndex != null && bodyCharIndex >= 0) {
    for (let k = 0; k < words.length && words[k].i <= bodyCharIndex; k++) current = k;
  }

  const currentRef = useRef(null);
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [current]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 60, scale: 0.96, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: 80, filter: 'blur(8px)' }}
      transition={{ type: 'spring', damping: 26, stiffness: 240 }}
      drag="y"
      dragListener={false}
      dragControls={drag}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.7 }}
      onDragEnd={(_, info) => info.offset.y > 90 && onClose()}
      className="relative mx-auto max-w-lg overflow-hidden rounded-[1.75rem] text-ivory"
      style={{
        background: 'linear-gradient(160deg, rgba(255,255,255,0.13), rgba(255,255,255,0.03) 45%, rgba(10,10,15,0.55))',
        backdropFilter: 'blur(22px) saturate(160%)',
        WebkitBackdropFilter: 'blur(22px) saturate(160%)',
        boxShadow: `0 30px 80px -20px ${color}55, 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.18)`,
      }}
    >
      {/* gradient hairline border */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          padding: 1,
          background: `linear-gradient(135deg, ${theme.primary}, transparent 35%, transparent 65%, ${color})`,
          WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />
      {/* moving sheen */}
      <div
        className="pointer-events-none absolute -inset-x-1/2 -top-1/2 h-full rotate-12 opacity-30"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)', animation: 'ar-sheen 6s ease-in-out infinite' }}
      />

      {/* grab handle */}
      <div onPointerDown={(e) => drag.start(e)} className="flex cursor-grab touch-none justify-center pb-1 pt-2.5 active:cursor-grabbing">
        <span className="h-1 w-10 rounded-full bg-white/25" />
      </div>

      <div className="px-5 pb-5">
        <div className="flex items-start gap-3.5">
          <div
            className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: `radial-gradient(circle at 30% 25%, ${color}55, ${color}11 70%)`, boxShadow: `0 0 28px ${color}66, inset 0 0 0 1px ${color}55` }}
          >
            <SymbolIcon symbol={memory.symbol} size={24} />
            {speaking && <span className="absolute inset-0 animate-ping rounded-2xl" style={{ boxShadow: `0 0 0 2px ${color}66` }} />}
          </div>
          <div className="min-w-0 flex-1">
            <h3
              className="font-display text-[1.6rem] font-semibold leading-[1.1] transition-[text-shadow] duration-300"
              style={{ textShadow: titleActive ? `0 0 18px ${color}` : 'none' }}
            >
              {title}
            </h3>
            <p className="mt-1 truncate font-mono text-[11px] text-ivory/60">
              {memory.author}
              {memory.role ? ` · ${tr(memory.role, lang)}` : ''} · {memory.year}
            </p>
          </div>
          <button onClick={onClose} className="-mr-1 rounded-full p-1.5 text-ivory/60 transition hover:bg-white/10 hover:text-ivory" aria-label="close">
            <X size={20} />
          </button>
        </div>

        <p className="mt-4 max-h-[28vh] overflow-y-auto pr-1 text-[15.5px] leading-relaxed [scrollbar-width:none]">
          {words.map(({ w }, k) => {
            const isCur = k === current;
            const spoken = speaking && k < current;
            return (
              <span
                key={k}
                ref={isCur ? currentRef : null}
                className="transition-[color,text-shadow] duration-200"
                style={{
                  color: !speaking || current < 0 ? 'rgba(245,240,230,0.92)' : isCur ? '#fff' : spoken ? 'rgba(245,240,230,0.85)' : 'rgba(245,240,230,0.4)',
                  textShadow: isCur ? `0 0 14px ${color}, 0 0 2px ${color}` : 'none',
                }}
              >
                {w}
              </span>
            );
          })}
        </p>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
          <div className="min-w-0">
            <p className="truncate font-mono text-[9.5px] uppercase tracking-[0.18em] text-ivory/50">{t(memory.composite ? 'composite' : 'visitor', lang)}</p>
            <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[9.5px] text-ivory/35">
              <Headphones size={11} /> {t('headphones', lang)} · {t('swipe', lang)}
            </p>
          </div>
          {canSpeak && (
            <button
              onClick={onToggleSpeak}
              className="flex shrink-0 items-center gap-2.5 rounded-full py-2 pl-3 pr-4 text-xs font-semibold transition active:scale-95"
              style={{ background: speaking ? `${color}33` : 'rgba(255,255,255,0.1)', boxShadow: `inset 0 0 0 1px ${speaking ? color : 'rgba(255,255,255,0.15)'}` }}
            >
              {speaking ? <Square size={12} fill="currentColor" /> : <Volume2 size={15} />}
              <VoiceMeter active={speaking} color={color} />
              {t(speaking ? 'stop' : 'listen', lang)}
            </button>
          )}
        </div>
      </div>
      <style>{`
        @keyframes ar-meter { from { height: 20% } to { height: 100% } }
        @keyframes ar-sheen { 0%,100% { transform: translateX(-30%) rotate(12deg) } 50% { transform: translateX(60%) rotate(12deg) } }
      `}</style>
    </motion.article>
  );
}
