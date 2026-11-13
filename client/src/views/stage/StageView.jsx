/**
 * /stage — "The Urban Projection & Living Archive". Owner: Member 4.
 * Full-screen, dark, projector-friendly (readable from 4 m).
 *
 *  ┌ header: title · language · counts · clock · connection · sound · fullscreen ┐
 *  │ chapter title + "now in the light" card + soundwave │  constellation map     │
 *  └ living archive strip ─────────────────────────────────────────────────────── ┘
 *  overlays: SpotlightOverlay (SELECT_MEMORY_NODE) · Celebration (MEMORY_ADDED)
 *
 * Keys: M = mute/unmute · F = fullscreen · Esc = close spotlight overlay.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Volume2, VolumeX, Maximize, Radio } from 'lucide-react';
import { useSocket } from '../../socket/useSocket.js';
import { CHAPTERS, CHAPTER_IDS, LANGUAGES, tr } from '@shared/events.js';
import { ui } from '@shared/i18n.js';
import { ConnectionBadge, SymbolIcon, SYMBOL_META } from '../../components/common.jsx';
import SoundwaveVisualizer from './SoundwaveVisualizer.jsx';
import Celebration from './Celebration.jsx';
import ConstellationMap from './ConstellationMap.jsx';
import SpotlightOverlay from './SpotlightOverlay.jsx';
import { useAmbientAudio } from './useAmbientAudio.js';
import { s } from './stageStrings.js';

/** Overlay time scales with testimony length (12–26 s). */
const overlayDuration = (memory, lang) => {
  if (!memory) return 0;
  const words = tr(memory.text, lang, memory.originalLanguage).split(/\s+/).length;
  return Math.min(26000, Math.max(12000, 7000 + words * 280));
};

function NowLit({ memory, lang, theme, chapter, onReopen }) {
  return (
    <div className="relative overflow-hidden rounded-3xl p-6 glass" style={{ borderColor: `${theme.primary}44` }}>
      <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full blur-3xl" style={{ background: theme.primary, opacity: 0.16 }} />
      <AnimatePresence mode="wait" initial={false}>
        {memory ? (
          <motion.button
            key={memory.id + lang}
            onClick={onReopen}
            initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -12, filter: 'blur(8px)' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="relative block w-full text-left"
            title={s('reopen', lang)}
          >
            <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.35em]" style={{ color: theme.primary }}>
              <Radio size={14} className="animate-pulse" /> {s('nowLit', lang)}
            </p>
            <div className="mt-4 flex items-center gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
                style={{ background: `${SYMBOL_META[memory.symbol]?.color}22`, boxShadow: `0 0 36px ${SYMBOL_META[memory.symbol]?.color}66` }}
              >
                <SymbolIcon symbol={memory.symbol} size={26} />
              </div>
              <div className="min-w-0">
                <h3 className="truncate font-display text-3xl font-semibold leading-tight 2xl:text-4xl">
                  {tr(memory.title, lang, memory.originalLanguage) || memory.author}
                </h3>
                <p className="mt-1 truncate font-mono text-sm text-mist">
                  {memory.author}
                  {memory.role ? ` · ${tr(memory.role, lang)}` : ''} · {memory.year}
                </p>
              </div>
            </div>
            <p className="mt-4 line-clamp-2 font-display text-2xl italic leading-snug text-ivory/80">“{tr(memory.text, lang, memory.originalLanguage)}”</p>
          </motion.button>
        ) : (
          <motion.div key={'idle' + chapter.id + lang} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} className="relative">
            <p className="line-clamp-5 font-display text-2xl leading-relaxed text-ivory/80 2xl:text-[1.7rem]">{chapter.narrative[lang]}</p>
            <p className="mt-4 font-mono text-sm text-mist">↳ {ui('tapAnOrb', lang)}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Archive({ memories, activeChapter, activeNodeId, lang, newestId, onSelect }) {
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
            <motion.button
              layout
              key={m.id}
              onClick={() => onSelect(active ? null : m.id)}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: inChapter ? 1 : 0.35, scale: active ? 1.04 : 1 }}
              className="relative w-64 shrink-0 rounded-2xl p-4 text-left glass"
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
                {!m.isSeed && (
                  <span className="ml-auto rounded-full bg-amber-gold/20 px-2 py-0.5 font-mono text-[9px] uppercase text-amber-gold">{s('live', lang)}</span>
                )}
              </div>
              <p className="mt-2 line-clamp-2 font-display text-lg leading-snug">{tr(m.title, lang, m.originalLanguage) || m.author}</p>
              <span className="absolute inset-x-4 bottom-0 h-px" style={{ background: color, opacity: 0.6 }} />
            </motion.button>
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
  const { state, connected, lastAddedMemory, selectMemoryNode } = useSocket();
  const lang = state?.language || 'ro';
  const chapterId = state?.activeChapter || CHAPTER_IDS[0];
  const chapter = CHAPTERS[chapterId];
  const theme = chapter.theme;
  const audio = useAmbientAudio(chapterId);
  const memories = useMemo(() => state?.memories || [], [state?.memories]);
  const activeNodeId = state?.activeNodeId ?? null;
  const activeMemory = memories.find((m) => m.id === activeNodeId) || null;
  const liveCount = memories.filter((m) => !m.isSeed).length;
  const newestId = lastAddedMemory && Date.now() - lastAddedMemory.receivedAt < 15000 ? lastAddedMemory.memory.id : null;

  const { chime, enable, toggle, enabled, wantsSound } = audio;

  // ---- spotlight overlay: opens on every *new* selection ------------------
  const [overlayId, setOverlayId] = useState(null);
  const [selectPulse, setSelectPulse] = useState(0);
  const seenSelRef = useRef(undefined); // undefined = first snapshot not seen yet
  useEffect(() => {
    if (!state) return;
    const prev = seenSelRef.current;
    seenSelRef.current = activeNodeId;
    if (prev === undefined) return; // don't replay the selection we found on load
    if (activeNodeId && activeNodeId !== prev) {
      setOverlayId(activeNodeId);
      setSelectPulse(Date.now());
      chime('select');
    } else if (!activeNodeId) {
      setOverlayId(null);
    }
  }, [state, activeNodeId, chime]);

  const overlayMemory = memories.find((m) => m.id === overlayId) || null;
  const duration = overlayDuration(overlayMemory, lang);
  useEffect(() => {
    if (!overlayId) return;
    const t = setTimeout(() => setOverlayId((id) => (id === overlayId ? null : id)), duration);
    return () => clearTimeout(t);
  }, [overlayId, duration]);

  // ---- new memory: chime (celebration renders itself) ---------------------
  const chimedRef = useRef(null);
  useEffect(() => {
    if (!lastAddedMemory || chimedRef.current === lastAddedMemory.receivedAt) return;
    chimedRef.current = lastAddedMemory.receivedAt;
    if (Date.now() - lastAddedMemory.receivedAt < 10000) chime('add');
  }, [lastAddedMemory, chime]);

  // ---- input: resume sound on first click, keyboard shortcuts --------------
  const fullscreen = useCallback(() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.()), []);
  useEffect(() => {
    const onPointer = () => {
      if (wantsSound && !enabled) enable();
    };
    const onKey = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.toLowerCase();
      if (k === 'm') toggle();
      else if (k === 'f') fullscreen();
      else if (k === 'escape') setOverlayId(null);
    };
    window.addEventListener('pointerdown', onPointer, { once: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [wantsSound, enabled, enable, toggle, fullscreen]);

  const select = useCallback((id) => selectMemoryNode(id), [selectMemoryNode]);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-obsidian">
      <div
        className="pointer-events-none absolute inset-0 transition-[background] duration-[1500ms]"
        style={{ background: `radial-gradient(ellipse at 20% 30%, ${theme.primary}1f, transparent 55%), radial-gradient(ellipse at 90% 90%, ${theme.secondary}14, transparent 50%)` }}
      />
      <div className="pointer-events-none absolute inset-0 grain opacity-30" />

      {/* header */}
      <header className="relative z-10 flex items-center justify-between gap-6 px-10 pt-7">
        <div className="flex items-baseline gap-5">
          <h1 className="font-display text-3xl font-semibold holo-text">{ui('appName', lang)}</h1>
          <span className="font-mono text-xs uppercase tracking-[0.35em] text-mist">{ui('tagline', lang)}</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs text-mist">
          <span className="rounded-full px-3 py-1 uppercase glass">{LANGUAGES.find((l) => l.code === lang)?.label}</span>
          <span className="rounded-full px-3 py-1 glass">
            {memories.length} {s('sparks', lang)} · {liveCount} {s('live', lang)}
          </span>
          <span className="rounded-full px-3 py-1 tabular-nums glass">
            <Clock />
          </span>
          <ConnectionBadge connected={connected} lang={lang} />
          <button
            onClick={toggle}
            className="flex items-center gap-2 rounded-full px-3 py-2 glass hover:text-ivory"
            title={s(enabled ? 'mute' : 'unmute', lang)}
            style={enabled ? { color: theme.primary, borderColor: `${theme.primary}66` } : undefined}
          >
            {enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            {enabled && (
              <span className="flex h-3 items-end gap-[2px]">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-[2px] rounded-full"
                    style={{ background: theme.primary }}
                    animate={{ height: ['30%', '100%', '45%', '80%', '30%'] }}
                    transition={{ duration: 1.6 + i * 0.3, repeat: Infinity, ease: 'easeInOut' }}
                  />
                ))}
              </span>
            )}
          </button>
          <button onClick={fullscreen} className="rounded-full p-2 glass hover:text-ivory" title={s('fullscreen', lang)}>
            <Maximize size={16} />
          </button>
        </div>
      </header>

      {/* main */}
      <main className="relative z-10 grid min-h-0 flex-1 grid-cols-12 gap-8 px-10 py-6">
        <section className="col-span-5 flex min-h-0 flex-col gap-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={chapterId + lang}
              initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -30, filter: 'blur(8px)' }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              <p className="font-mono text-sm uppercase tracking-[0.4em]" style={{ color: theme.primary }}>
                {ui('chapter', lang)} {chapter.order} · {chapter.dateLabel[lang]}
              </p>
              <h2 className="mt-3 font-display text-6xl font-semibold leading-[0.95] 2xl:text-7xl">{chapter.title[lang]}</h2>
              <p className="mt-4 text-2xl leading-snug text-ivory/75">{chapter.subtitle[lang]}</p>
            </motion.div>
          </AnimatePresence>

          <NowLit memory={activeMemory} lang={lang} theme={theme} chapter={chapter} onReopen={() => activeMemory && setOverlayId(activeMemory.id)} />

          <div className="relative min-h-[110px] flex-1">
            <SoundwaveVisualizer
              analyser={audio.analyser}
              colors={[theme.primary, theme.secondary, theme.glow]}
              burst={(lastAddedMemory?.receivedAt || 0) + selectPulse}
            />
            {!enabled && (
              <button
                onClick={enable}
                className="absolute bottom-2 left-0 flex items-center gap-2 rounded-full px-4 py-2 font-mono text-xs text-mist glass hover:text-ivory"
                style={{ borderColor: `${theme.primary}55` }}
              >
                <Volume2 size={14} /> {s(wantsSound ? 'resumeSound' : 'enableSound', lang)}
              </button>
            )}
          </div>
        </section>

        <section className="col-span-7 min-h-0">
          <ConstellationMap memories={memories} chapterId={chapterId} activeNodeId={activeNodeId} newestId={newestId} lang={lang} onSelect={select} />
        </section>
      </main>

      {/* archive strip */}
      <footer className="relative z-10 px-10 pb-7">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.35em] text-mist">
          {ui('memories', lang)} — {s('livingArchive', lang)}
        </p>
        <Archive memories={memories} activeChapter={chapterId} activeNodeId={activeNodeId} lang={lang} newestId={newestId} onSelect={select} />
      </footer>

      <SpotlightOverlay memory={overlayMemory} lang={lang} duration={duration} onClose={() => setOverlayId(null)} />
      <Celebration lastAddedMemory={lastAddedMemory} lang={lang} />
    </div>
  );
}
