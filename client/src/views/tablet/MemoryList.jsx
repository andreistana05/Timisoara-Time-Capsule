/**
 * Live list of memory orbs for the active chapter. Tapping one spotlights it
 * on every screen (SELECT_MEMORY_NODE); tapping again clears the spotlight.
 * Selections made on the phone scroll into view here too.
 */
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { tr } from '@shared/events.js';
import { ui } from '@shared/i18n.js';
import { SymbolIcon, SYMBOL_META } from '../../components/common.jsx';
import { t, haptic } from './strings.js';

const FRESH_MS = 5 * 60_000;

export default function MemoryList({ lang, memories, activeNodeId, onSelect, accent, layout = 'column' }) {
  const itemRefs = useRef(new Map());
  const horizontal = layout === 'row';

  useEffect(() => {
    if (!activeNodeId) return;
    itemRefs.current.get(activeNodeId)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeNodeId]);

  return (
    <section className="flex min-h-0 flex-col" aria-label={ui('memories', lang)}>
      <header className="mb-2 flex min-h-11 flex-wrap items-center justify-between gap-2 px-1">
        <h2 className="flex items-center gap-2 whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.3em] text-mist">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: accent }} />
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: accent }} />
          </span>
          {t('live', lang)} · {ui('memories', lang)} · {memories.length}
        </h2>
        <AnimatePresence>
          {activeNodeId && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => {
                haptic();
                onSelect(null);
              }}
              className="flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full px-3 font-mono text-[10px] uppercase tracking-widest text-mist glass active:text-ivory"
            >
              <X size={14} /> {t('clearSpotlight', lang)}
            </motion.button>
          )}
        </AnimatePresence>
      </header>
      {!horizontal && <p className="mb-3 px-1 text-xs text-mist/70">{t('tapToSpotlight', lang)}</p>}

      <div
        className={
          horizontal
            ? 'flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:none]'
            : 'flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]'
        }
      >
        {memories.length === 0 && (
          <p className="rounded-2xl border border-dashed border-white/10 p-5 text-center font-display text-lg text-mist">{t('noMemories', lang)}</p>
        )}
        <AnimatePresence initial={false}>
          {memories.map((m) => {
            const active = m.id === activeNodeId;
            const color = SYMBOL_META[m.symbol]?.color || accent;
            const fresh = !m.isSeed && Date.now() - new Date(m.createdAt).getTime() < FRESH_MS;
            const title = tr(m.title, lang, m.originalLanguage);
            const role = tr(m.role, lang, m.originalLanguage);
            return (
              <motion.button
                key={m.id}
                ref={(el) => (el ? itemRefs.current.set(m.id, el) : itemRefs.current.delete(m.id))}
                type="button"
                layout="position"
                initial={{ opacity: 0, y: horizontal ? 0 : -16, x: horizontal ? -16 : 0, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  haptic();
                  onSelect(active ? null : m.id);
                }}
                aria-pressed={active}
                className={`relative flex shrink-0 snap-start items-start gap-3 overflow-hidden rounded-2xl border p-3 text-left transition-[border-color,background-color,box-shadow] duration-500 ${
                  horizontal ? 'w-[min(78vw,320px)]' : 'w-full'
                }`}
                style={{
                  borderColor: active ? color : 'rgba(245,240,230,.07)',
                  backgroundColor: active ? `${color}1a` : 'rgba(18,18,26,.72)',
                  boxShadow: active ? `0 0 32px ${color}40` : 'none',
                }}
              >
                {/* orb */}
                <span className="relative mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center">
                  <span
                    className={`absolute inset-0 rounded-full ${active ? 'animate-pulse' : ''}`}
                    style={{ background: `radial-gradient(circle at 35% 30%, #fff8, ${color}66 45%, ${color}00 72%)` }}
                  />
                  <span className="absolute inset-1 rounded-full border" style={{ borderColor: `${color}88` }} />
                  <SymbolIcon symbol={m.symbol} size={18} className="relative" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-display text-lg font-semibold leading-tight text-ivory">{title || '—'}</span>
                    {fresh && (
                      <span className="shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-obsidian" style={{ background: color }}>
                        {t('fresh', lang)}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-mist">
                    {m.author || t('anonymous', lang)}
                    {role ? ` · ${role}` : ''}
                    {m.year ? ` · ${m.year}` : ''}
                  </span>
                  <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: m.composite ? '#9ca3af' : color }}>
                    {m.composite ? t('composite', lang) : t('visitor', lang)}
                  </span>
                  <AnimatePresence initial={false}>
                    {active && (
                      <motion.span
                        className="block overflow-hidden"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      >
                        <span className="mt-2 line-clamp-5 block font-display text-base italic leading-snug text-ivory/85">
                          “{tr(m.text, lang, m.originalLanguage)}”
                        </span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </section>
  );
}
