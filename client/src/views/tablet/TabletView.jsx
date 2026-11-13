/**
 * /tablet — "The Physical Pedestal". Owner: Member 2.
 * Lies flat on the table. The Seal sits in the centre (AR anchor), surrounded
 * by chapter cards, the language switcher, the live memory list and the
 * "Ignite a Memory Spark" drawer.
 *
 * Landscape (≥1024px): chapters | Seal | memories
 * Portrait / small:    Seal → chapter row → memory strip (scrolls)
 */
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ScanLine } from 'lucide-react';
import { useSocket } from '../../socket/useSocket.js';
import { CHAPTERS, CHAPTER_IDS } from '@shared/events.js';
import { ui } from '@shared/i18n.js';
import { ConnectionBadge } from '../../components/common.jsx';
import Seal from './Seal.jsx';
import MemoryDrawer from './MemoryDrawer.jsx';
import ChapterCards from './ChapterCards.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import MemoryList from './MemoryList.jsx';
import { t, haptic, ROMAN } from './strings.js';

export default function TabletView() {
  const { state, connected, changeChapter, changeLanguage, selectMemoryNode, addMemory, lastAddedMemory } = useSocket();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const lang = state?.language || 'ro';
  const chapterId = state?.activeChapter || CHAPTER_IDS[0];
  const chapter = CHAPTERS[chapterId];
  const theme = chapter.theme;
  const { primary, secondary, glow } = theme;
  const activeNodeId = state?.activeNodeId ?? null;

  const allMemories = state?.memories;
  const { chapterMemories, counts } = useMemo(() => {
    const list = allMemories || [];
    const c = Object.fromEntries(CHAPTER_IDS.map((id) => [id, 0]));
    list.forEach((m) => (c[m.chapter] = (c[m.chapter] || 0) + 1));
    const mine = list
      .filter((m) => m.chapter === chapterId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { chapterMemories: mine, counts: c };
  }, [allMemories, chapterId]);

  const openDrawer = () => {
    haptic(15);
    setDrawerOpen(true);
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-obsidian select-none">
      {/* ambient chapter atmosphere (cross-fades) */}
      <AnimatePresence initial={false}>
        <motion.div
          key={chapterId}
          className="pointer-events-none absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{
            background: `radial-gradient(circle at 50% 48%, ${primary}2e, transparent 55%), radial-gradient(circle at 12% 90%, ${secondary}14, transparent 45%), radial-gradient(circle at 90% 8%, ${glow}12, transparent 40%)`,
          }}
        />
      </AnimatePresence>
      <div className="pointer-events-none absolute inset-0 grain opacity-30" />

      {/* top bar */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-mist">{ui('tagline', lang)}</p>
          <h1 className="font-display text-2xl font-semibold holo-text sm:text-3xl">{ui('appName', lang)}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <LanguageSwitcher lang={lang} onChange={changeLanguage} accent={primary} />
          <ConnectionBadge connected={connected} lang={lang} />
        </div>
      </header>

      <main className="relative z-10 flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain px-4 py-4 sm:px-8 lg:grid lg:grid-cols-[minmax(250px,330px)_minmax(0,1fr)_minmax(270px,360px)] lg:gap-5 lg:overflow-hidden">
        {/* LEFT — chapters (landscape) */}
        <aside className="hidden min-h-0 flex-col justify-center lg:flex">
          <p className="mb-3 px-1 font-mono text-[11px] uppercase tracking-[0.3em] text-mist">{t('chooseChapter', lang)}</p>
          <ChapterCards lang={lang} activeId={chapterId} onChange={changeChapter} counts={counts} layout="column" />
        </aside>

        {/* CENTRE — the Seal */}
        <section className="flex shrink-0 flex-col items-center justify-center gap-3 lg:min-h-0 lg:shrink">
          <div className="aspect-square w-[min(88vw,50vh)] max-w-[620px] lg:w-[min(100%,calc(100dvh-330px))]">
            <Seal
              chapterId={chapterId}
              theme={theme}
              memories={chapterMemories}
              activeNodeId={activeNodeId}
              onSelectMemory={(id) => {
                haptic();
                selectMemoryNode(id);
              }}
              lastAddedMemory={lastAddedMemory}
            />
          </div>

          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={chapterId + lang}
              initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(6px)' }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              className="max-w-xl text-center"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.3em]" style={{ color: primary }}>
                {ui('chapter', lang)} {ROMAN[chapter.order]} · {chapter.dateLabel[lang]} · {chapter.place}
              </p>
              <h2 className="mt-1 font-display text-3xl font-semibold leading-tight text-ivory sm:text-4xl">{chapter.title[lang]}</h2>
              <p className="mt-1 font-display text-lg leading-snug text-ivory/70 sm:text-xl">{chapter.subtitle[lang]}</p>
            </motion.div>
          </AnimatePresence>

          <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-mist/70">
            <ScanLine size={14} /> {t('sealHint', lang)}
          </p>

          {/* the spark CTA */}
          <motion.button
            type="button"
            onClick={openDrawer}
            whileTap={{ scale: 0.97 }}
            className="relative mt-1 flex min-h-14 items-center justify-center gap-3 overflow-hidden rounded-full px-8 py-4 text-lg font-semibold text-obsidian"
            style={{ background: `linear-gradient(120deg, ${primary}, #fde68a 55%, ${secondary})`, boxShadow: `0 0 50px ${primary}66` }}
          >
            <motion.span
              className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-20deg] bg-white/50 blur-md"
              animate={{ x: ['0%', '450%'] }}
              transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 2.2, ease: 'easeInOut' }}
            />
            <Sparkles size={22} className="relative" />
            <span className="relative">{ui('igniteSpark', lang)}</span>
          </motion.button>
        </section>

        {/* RIGHT — live memory orbs (landscape) */}
        <aside className="hidden min-h-0 flex-col lg:flex">
          <MemoryList lang={lang} memories={chapterMemories} activeNodeId={activeNodeId} onSelect={selectMemoryNode} accent={primary} layout="column" />
        </aside>

        {/* Portrait / small screens */}
        <div className="flex shrink-0 flex-col gap-5 pb-4 lg:hidden">
          <ChapterCards lang={lang} activeId={chapterId} onChange={changeChapter} counts={counts} layout="row" />
          <MemoryList lang={lang} memories={chapterMemories} activeNodeId={activeNodeId} onSelect={selectMemoryNode} accent={primary} layout="row" />
        </div>
      </main>

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
