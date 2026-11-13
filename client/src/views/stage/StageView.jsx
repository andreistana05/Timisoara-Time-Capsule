/**
 * /stage — "The Urban Projection & Living Archive". Owner: Member 4.
 * Full-screen, dark, projector-friendly. Never needs input during the demo.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Volume2, VolumeX, Maximize, Radio } from 'lucide-react';
import { useSocket } from '../../socket/useSocket.js';
import { CHAPTERS, CHAPTER_IDS, LANGUAGES, tr } from '@shared/events.js';
import { ui } from '@shared/i18n.js';
import { ConnectionBadge, SymbolIcon, SYMBOL_META } from '../../components/common.jsx';
import SoundwaveVisualizer from './SoundwaveVisualizer.jsx';
import Celebration from './Celebration.jsx';
import { useAmbientAudio } from './useAmbientAudio.js';

function Spotlight({ memory, lang, theme, chapter }) {
  return (
    <div className="relative h-full overflow-hidden rounded-3xl p-8 glass" style={{ borderColor: `${theme.primary}44` }}>
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl" style={{ background: theme.primary, opacity: 0.18 }} />
      <p className="relative flex items-center gap-2 font-mono text-xs uppercase tracking-[0.35em]" style={{ color: theme.primary }}>
        <Radio size={14} className={memory ? 'animate-pulse' : ''} /> {ui('spotlight', lang)}
      </p>
      <AnimatePresence mode="wait">
        {memory ? (
          <motion.div
            key={memory.id + lang}
            initial={{ opacity: 0, scale: 0.92, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.04, filter: 'blur(10px)' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="relative mt-6 flex h-[calc(100%-2rem)] flex-col"
          >
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
                style={{ background: `${SYMBOL_META[memory.symbol]?.color}22`, boxShadow: `0 0 40px ${SYMBOL_META[memory.symbol]?.color}66` }}
              >
                <SymbolIcon symbol={memory.symbol} size={30} />
              </div>
              <div>
                <h2 className="font-display text-4xl font-semibold leading-tight 2xl:text-5xl">{tr(memory.title, lang, memory.originalLanguage)}</h2>
                <p className="mt-1 font-mono text-sm text-mist">
                  {memory.author}
                  {memory.role ? ` · ${tr(memory.role, lang)}` : ''} · {memory.year}
                </p>
              </div>
            </div>
            <p className="mt-6 overflow-y-auto font-display text-2xl leading-relaxed text-ivory/90 2xl:text-3xl">
              “{tr(memory.text, lang, memory.originalLanguage)}”
            </p>
            <p className="mt-auto pt-4 font-mono text-[11px] uppercase tracking-widest text-mist">
              {memory.composite ? 'Composite testimony · based on historical accounts' : 'Visitor memory · added live'}
            </p>
          </motion.div>
        ) : (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative mt-6">
            <p className="font-display text-3xl leading-relaxed text-ivory/80">{chapter.narrative[lang]}</p>
            <p className="mt-8 font-mono text-sm text-mist">↳ {ui('tapAnOrb', lang)}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Archive({ memories, activeChapter, activeNodeId, lang, newestId }) {
  const sorted = useMemo(
    () =>
      [...memories].sort((a, b) => {
        const ca = a.chapter === activeChapter ? 0 : 1;
        const cb = b.chapter === activeChapter ? 0 : 1;
        return ca - cb || Date.parse(b.createdAt) - Date.parse(a.createdAt);
      }),
    [memories, activeChapter],
  );
  return (
    <LayoutGroup>
      <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
        {sorted.map((m) => {
          const inChapter = m.chapter === activeChapter;
          const active = m.id === activeNodeId;
          const color = CHAPTERS[m.chapter]?.theme.primary;
          return (
            <motion.div
              layout
              key={m.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: inChapter ? 1 : 0.35, scale: active ? 1.04 : 1 }}
              className="relative w-64 shrink-0 rounded-2xl p-4 glass"
              style={{
                borderColor: active ? color : undefined,
                boxShadow: active ? `0 0 30px ${color}66` : m.id === newestId ? `0 0 24px #f59e0b55` : undefined,
              }}
            >
              <div className="flex items-center gap-2">
                <SymbolIcon symbol={m.symbol} size={16} />
                <span className="truncate font-mono text-[11px] text-mist">
                  {m.author} · {m.year}
                </span>
                {!m.isSeed && <span className="ml-auto rounded-full bg-amber-gold/20 px-2 py-0.5 font-mono text-[9px] uppercase text-amber-gold">live</span>}
              </div>
              <p className="mt-2 line-clamp-2 font-display text-lg leading-snug">{tr(m.title, lang, m.originalLanguage)}</p>
              <span className="absolute inset-x-4 bottom-0 h-px" style={{ background: color, opacity: 0.6 }} />
            </motion.div>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return <span>{now.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>;
}

export default function StageView() {
  const { state, connected, lastAddedMemory } = useSocket();
  const lang = state?.language || 'ro';
  const chapterId = state?.activeChapter || CHAPTER_IDS[0];
  const chapter = CHAPTERS[chapterId];
  const theme = chapter.theme;
  const audio = useAmbientAudio(chapterId);
  const memories = state?.memories || [];
  const activeMemory = memories.find((m) => m.id === state?.activeNodeId) || null;
  const liveCount = memories.filter((m) => !m.isSeed).length;

  const { chime } = audio;
  const chimedRef = useRef(null);
  useEffect(() => {
    if (!lastAddedMemory || chimedRef.current === lastAddedMemory.receivedAt) return;
    chimedRef.current = lastAddedMemory.receivedAt;
    chime();
  }, [lastAddedMemory, chime]);

  const fullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.());

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-obsidian">
      <div
        className="pointer-events-none absolute inset-0 transition-[background] duration-[1500ms]"
        style={{ background: `radial-gradient(ellipse at 20% 30%, ${theme.primary}1f, transparent 55%), radial-gradient(ellipse at 90% 90%, ${theme.secondary}14, transparent 50%)` }}
      />
      <div className="pointer-events-none absolute inset-0 grain opacity-30" />

      {/* header */}
      <header className="relative z-10 flex items-center justify-between gap-6 px-10 pt-8">
        <div className="flex items-baseline gap-5">
          <h1 className="font-display text-3xl font-semibold holo-text">{ui('appName', lang)}</h1>
          <span className="font-mono text-xs uppercase tracking-[0.35em] text-mist">{ui('tagline', lang)}</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs text-mist">
          <span className="rounded-full px-3 py-1 uppercase glass">{LANGUAGES.find((l) => l.code === lang)?.label}</span>
          <span className="rounded-full px-3 py-1 glass">
            {memories.length} {ui('memories', lang).toLowerCase()} · {liveCount} live
          </span>
          <span className="rounded-full px-3 py-1 tabular-nums glass">
            <Clock />
          </span>
          <ConnectionBadge connected={connected} lang={lang} />
          <button onClick={audio.enabled ? audio.disable : audio.enable} className="rounded-full p-2 glass hover:text-ivory" title="Toggle sound">
            {audio.enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button onClick={fullscreen} className="rounded-full p-2 glass hover:text-ivory" title="Fullscreen">
            <Maximize size={16} />
          </button>
        </div>
      </header>

      {/* main */}
      <main className="relative z-10 grid min-h-0 flex-1 grid-cols-12 gap-8 px-10 py-8">
        <section className="col-span-7 flex min-h-0 flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={chapterId + lang}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              <p className="font-mono text-sm uppercase tracking-[0.4em]" style={{ color: theme.primary }}>
                {ui('chapter', lang)} {chapter.order} · {chapter.dateLabel[lang]} · {chapter.place}
              </p>
              <h2 className="mt-3 font-display text-7xl font-semibold leading-[0.95] 2xl:text-8xl">{chapter.title[lang]}</h2>
              <p className="mt-5 max-w-3xl text-2xl leading-snug text-ivory/75">{chapter.subtitle[lang]}</p>
            </motion.div>
          </AnimatePresence>

          <div className="relative mt-6 min-h-[160px] flex-1">
            <SoundwaveVisualizer
              analyser={audio.analyser}
              colors={[theme.primary, theme.secondary, theme.glow]}
              burst={lastAddedMemory?.receivedAt}
            />
            {!audio.enabled && (
              <button
                onClick={audio.enable}
                className="absolute bottom-2 left-0 flex items-center gap-2 rounded-full px-4 py-2 font-mono text-xs text-mist glass hover:text-ivory"
              >
                <Volume2 size={14} /> enable generative sound
              </button>
            )}
          </div>
        </section>

        <section className="col-span-5 min-h-0">
          <Spotlight memory={activeMemory} lang={lang} theme={theme} chapter={chapter} />
        </section>
      </main>

      {/* archive strip */}
      <footer className="relative z-10 px-10 pb-8">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.35em] text-mist">
          {ui('memories', lang)} — living archive
        </p>
        <Archive
          memories={memories}
          activeChapter={chapterId}
          activeNodeId={state?.activeNodeId}
          lang={lang}
          newestId={lastAddedMemory?.memory.id}
        />
      </footer>

      <Celebration lastAddedMemory={lastAddedMemory} lang={lang} />
    </div>
  );
}
