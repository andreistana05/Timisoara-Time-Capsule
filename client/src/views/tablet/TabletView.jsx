/**
 * /tablet — "The Physical Pedestal". Owner: Member 2.
 * Lies flat on the table. Seal in the centre (AR anchor), controls around it.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useSocket } from '../../socket/useSocket.js';
import { CHAPTERS, CHAPTER_IDS, LANGUAGES } from '@shared/events.js';
import { ui } from '@shared/i18n.js';
import { ConnectionBadge } from '../../components/common.jsx';
import Seal from './Seal.jsx';
import MemoryDrawer from './MemoryDrawer.jsx';

export default function TabletView() {
  const { state, connected, changeChapter, changeLanguage, addMemory } = useSocket();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const lang = state?.language || 'ro';
  const chapterId = state?.activeChapter || CHAPTER_IDS[0];
  const chapter = CHAPTERS[chapterId];
  const { primary, secondary } = chapter.theme;
  const count = state?.memories.filter((m) => m.chapter === chapterId).length ?? 0;

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-obsidian select-none">
      {/* ambient background */}
      <div
        className="pointer-events-none absolute inset-0 transition-[background] duration-1000"
        style={{ background: `radial-gradient(circle at 50% 50%, ${primary}22, transparent 60%)` }}
      />
      <div className="pointer-events-none absolute inset-0 grain opacity-30" />

      {/* top bar */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-5 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-mist">{ui('tagline', lang)}</p>
          <h1 className="font-display text-2xl font-semibold holo-text sm:text-3xl">{ui('appName', lang)}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full p-1 glass" role="radiogroup" aria-label={ui('language', lang)}>
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => changeLanguage(l.code)}
                className={`rounded-full px-3 py-1.5 font-mono text-xs font-semibold tracking-wider transition sm:px-4 sm:text-sm ${
                  l.code === lang ? 'bg-ivory text-obsidian' : 'text-mist hover:text-ivory'
                }`}
                title={l.label}
                aria-checked={l.code === lang}
                role="radio"
              >
                {l.short}
              </button>
            ))}
          </div>
          <ConnectionBadge connected={connected} lang={lang} />
        </div>
      </header>

      {/* centre: seal + chapter caption */}
      <main className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4 py-4">
        <div className="aspect-square w-[min(52vmin,500px)] shrink">
          <Seal color={primary} accent={secondary} pulseKey={chapterId} />
        </div>
        <motion.div
          key={chapterId + lang}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl text-center"
        >
          <p className="font-mono text-xs uppercase tracking-[0.3em]" style={{ color: primary }}>
            {chapter.dateLabel[lang]} · {chapter.place}
          </p>
          <p className="mt-1 font-display text-xl text-ivory/80 sm:text-2xl">{chapter.subtitle[lang]}</p>
          <p className="mt-2 font-mono text-[11px] text-mist">
            {count} {ui('memories', lang).toLowerCase()}
          </p>
        </motion.div>
      </main>

      {/* bottom: chapter selector + spark */}
      <footer className="relative z-10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
          {CHAPTER_IDS.map((id) => {
            const c = CHAPTERS[id];
            const active = id === chapterId;
            return (
              <button
                key={id}
                onClick={() => changeChapter(id)}
                className="group relative overflow-hidden rounded-2xl p-4 text-left transition glass"
                style={{
                  borderColor: active ? c.theme.primary : undefined,
                  boxShadow: active ? `0 0 40px ${c.theme.primary}44, inset 0 0 30px ${c.theme.primary}22` : undefined,
                }}
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: c.theme.primary }}>
                  {ui('chapter', lang)} {c.order} · {c.dateLabel[lang]}
                </span>
                <span className="mt-1 block font-display text-xl font-semibold leading-tight sm:text-2xl">{c.title[lang]}</span>
                {active && (
                  <motion.span layoutId="chapter-indicator" className="absolute inset-x-4 bottom-0 h-0.5" style={{ background: c.theme.primary }} />
                )}
              </button>
            );
          })}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center justify-center gap-3 rounded-2xl px-6 py-4 font-semibold text-obsidian shadow-lg transition hover:brightness-110 active:scale-95"
            style={{ background: `linear-gradient(135deg, ${primary}, #fde68a)`, boxShadow: `0 0 40px ${primary}55` }}
          >
            <Sparkles size={22} />
            <span className="text-left leading-tight">{ui('igniteSpark', lang)}</span>
          </button>
        </div>
      </footer>

      <MemoryDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        lang={lang}
        chapterId={chapterId}
        addMemory={addMemory}
        accent={primary}
      />
    </div>
  );
}
