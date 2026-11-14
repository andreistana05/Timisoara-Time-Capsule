/**
 * /stage — "The Urban Projection & Living Archive". Owner: Member 4.
 * Full-screen, dark, projector-friendly (readable from 4 m).
 *
 *  ┌ header: title · language · counts · clock · connection · sound · fullscreen ┐  auto
 *  │ TIME TUNER: giant year · 1900–2026 band + needle · scopes · archival card    │  auto
 *  │ chapter title + "now in the light" card + soundwave │  constellation map     │  1fr (shrinks)
 *  └ living archive: whole cards only, paged ‹ › ──────────────────────────────── ┘  auto
 *  One screen at 100% zoom: the rows are a CSS grid sized to the viewport, and all
 *  height-sensitive sizes come from the --stg-* variables in stageLayout.js.
 *  overlays: SpotlightOverlay (SELECT_MEMORY_NODE) · Celebration (MEMORY_ADDED)
 *
 * Sound: "Activate Museum Sound System" starts BOTH engines — the Time Tuner radio
 * (useTimeTuner, driven by TIME_SCRUB_UPDATED) and the chapter drone + chimes
 * (useAmbientAudio, its drone bed ducked under the radio).
 *
 * Keys: M = mute/unmute · F = fullscreen · Esc = close spotlight overlay.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Maximize, Radio, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSocket } from '../../socket/useSocket.js';
import { CHAPTERS, CHAPTER_IDS, LANGUAGES, tr } from '@shared/events.js';
import { ui } from '@shared/i18n.js';
import { ConnectionBadge, SymbolIcon, SYMBOL_META } from '../../components/common.jsx';
import SoundwaveVisualizer from './SoundwaveVisualizer.jsx';
import Celebration from './Celebration.jsx';
import ConstellationMap from './ConstellationMap.jsx';
import SpotlightOverlay from './SpotlightOverlay.jsx';
import TimeTunerHUD from './TimeTunerHUD.jsx';
import { useAmbientAudio } from './useAmbientAudio.js';
import { useTimeTuner } from './useTimeTuner.js';
import { useTimeScrub } from './useTimeScrub.js';
import { s } from './stageStrings.js';
import { t_ } from './tunerStrings.js';
import { STAGE_LAYOUT_CSS, useElementWidth, useFitVariant } from './stageLayout.js';

/** Overlay time scales with testimony length (12–26 s). */
const overlayDuration = (memory, lang) => {
  if (!memory) return 0;
  const words = tr(memory.text, lang, memory.originalLanguage).split(/\s+/).length;
  return Math.min(26000, Math.max(12000, 7000 + words * 280));
};

/**
 * Content variants for the "now in the light" panel, richest first. useFitVariant
 * picks the first one that fits the panel's box, so text is never cut mid-sentence:
 * the chapter summary falls back from the full narrative to the (complete) subtitle,
 * and a spotlighted memory shortens its excerpt (the full testimony is one click
 * away in the Spotlight overlay).
 */
const SUMMARY_VARIANTS = [
  { field: 'narrative', size: '1.625rem', hint: true },
  { field: 'narrative', size: '1.375rem', hint: true },
  { field: 'narrative', size: '1.1875rem', hint: true },
  { field: 'subtitle', size: '1.5rem', hint: true },
  { field: 'subtitle', size: '1.25rem', hint: true },
  { field: 'subtitle', size: '1.125rem', hint: false },
  { field: 'subtitle', size: '1rem', hint: false },
  { field: 'subtitle', size: '0.875rem', hint: false },
];
const LIT_VARIANTS = [
  { kicker: true, title: '2.125rem', icon: 56, quote: '1.5rem', lines: 5 },
  { kicker: true, title: '1.875rem', icon: 56, quote: '1.5rem', lines: 3 },
  { kicker: true, title: '1.625rem', icon: 48, quote: '1.25rem', lines: 2 },
  { kicker: true, title: '1.375rem', icon: 40, quote: '1.125rem', lines: 2 },
  { kicker: true, title: '1.25rem', icon: 36, quote: '1rem', lines: 1 },
  { kicker: true, title: '1.125rem', icon: 32, quote: '1rem', lines: 0 },
  { kicker: false, title: '1.125rem', icon: 32, quote: '1rem', lines: 0 },
  { kicker: false, title: '1rem', icon: 0, quote: '1rem', lines: 0 },
  { kicker: false, title: '0.875rem', icon: 0, quote: '1rem', lines: 0 },
];

function ChapterSummary({ chapter, lang }) {
  const [ref, i] = useFitVariant(SUMMARY_VARIANTS.length, chapter.id + lang);
  const v = SUMMARY_VARIANTS[i];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="relative flex min-h-0 flex-1 flex-col"
    >
      <div ref={ref} className="min-h-0 flex-1">
        <p className="font-display leading-snug text-ivory/80" style={{ fontSize: v.size }}>
          {chapter[v.field][lang] || chapter[v.field].en}
        </p>
        {v.hint && <p className="mt-3 font-mono text-sm text-mist">↳ {ui('tapAnOrb', lang)}</p>}
      </div>
    </motion.div>
  );
}

function LitMemory({ memory, lang, theme, onReopen }) {
  const [ref, i] = useFitVariant(LIT_VARIANTS.length, memory.id + lang);
  const v = LIT_VARIANTS[i];
  const color = SYMBOL_META[memory.symbol]?.color;
  return (
    <motion.button
      onClick={onReopen}
      initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -12, filter: 'blur(8px)' }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="relative flex min-h-0 w-full flex-1 flex-col text-left"
      title={s('reopen', lang)}
    >
      <div ref={ref} className="min-h-0 w-full flex-1">
        {v.kicker && (
          <p className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.35em]" style={{ color: theme.primary }}>
            <Radio size={14} className="animate-pulse" /> {s('nowLit', lang)}
          </p>
        )}
        <div className="flex items-center gap-4">
          {v.icon > 0 && (
            <div
              className="flex shrink-0 items-center justify-center rounded-full"
              style={{ width: v.icon, height: v.icon, background: `${color}22`, boxShadow: `0 0 36px ${color}66` }}
            >
              <SymbolIcon symbol={memory.symbol} size={Math.round(v.icon * 0.46)} />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-display font-semibold leading-tight" style={{ fontSize: v.title }}>
              {!v.kicker && <Radio size={12} className="mr-1.5 inline animate-pulse align-baseline" style={{ color: theme.primary }} />}
              {tr(memory.title, lang, memory.originalLanguage) || memory.author}
            </h3>
            <p className={`mt-0.5 font-mono text-mist ${v.kicker ? 'text-sm' : 'text-xs'}`}>
              {memory.author}
              {memory.role ? ` · ${tr(memory.role, lang)}` : ''} · {memory.year}
            </p>
          </div>
        </div>
        {v.lines > 0 && (
          <p
            className="mt-3 font-display italic leading-snug text-ivory/80"
            style={{ fontSize: v.quote, display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: v.lines, overflow: 'hidden' }}
          >
            “{tr(memory.text, lang, memory.originalLanguage)}”
          </p>
        )}
      </div>
    </motion.button>
  );
}

function NowLit({ memory, lang, theme, chapter, onReopen }) {
  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl glass"
      style={{ borderColor: `${theme.primary}44`, padding: 'var(--stg-panel-pad)' }}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full blur-3xl" style={{ background: theme.primary, opacity: 0.16 }} />
      <AnimatePresence mode="wait" initial={false}>
        {memory ? (
          <LitMemory key={memory.id + lang} memory={memory} lang={lang} theme={theme} onReopen={onReopen} />
        ) : (
          <ChapterSummary key={'idle' + chapter.id + lang} chapter={chapter} lang={lang} />
        )}
      </AnimatePresence>
    </div>
  );
}

const ARCHIVE_GAP = 12; // px
const ARCHIVE_MIN_CARD = 232; // px: below this a card would wrap author + title badly

/**
 * Living archive: shows only as many whole cards as fit the row (they stretch to
 * fill it exactly), paged with ‹ › (or ←/→). Jumps to the page holding a newly
 * added or newly spotlighted memory.
 */
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
  const [rowRef, rowW] = useElementWidth();
  const perPage = rowW ? Math.max(1, Math.floor((rowW + ARCHIVE_GAP) / (ARCHIVE_MIN_CARD + ARCHIVE_GAP))) : 1;
  const cardW = rowW ? (rowW - ARCHIVE_GAP * (perPage - 1)) / perPage : ARCHIVE_MIN_CARD;
  const pages = Math.max(1, Math.ceil(sorted.length / perPage));
  const [{ page, dir }, setNav] = useState({ page: 0, dir: 1 });
  const cur = Math.min(page, pages - 1);
  const go = useCallback((p) => setNav((n) => ({ page: Math.max(0, Math.min(pages - 1, p)), dir: p >= n.page ? 1 : -1 })), [pages]);

  // new chapter → its memories are sorted first → back to page 1
  const [seenChapter, setSeenChapter] = useState(activeChapter);
  if (seenChapter !== activeChapter) {
    setSeenChapter(activeChapter);
    setNav({ page: 0, dir: -1 });
  }

  // follow a new arrival / a new spotlight (once per id, so manual paging isn't yanked back)
  const followed = useRef({ newest: null, active: null });
  useEffect(() => {
    const f = followed.current;
    const target = newestId && newestId !== f.newest ? newestId : activeNodeId && activeNodeId !== f.active ? activeNodeId : null;
    f.newest = newestId;
    f.active = activeNodeId;
    if (!target || !rowW) return;
    const idx = sorted.findIndex((m) => m.id === target);
    if (idx >= 0) go(Math.floor(idx / perPage));
  }, [newestId, activeNodeId, sorted, perPage, rowW, go]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') go(cur - 1);
      else if (e.key === 'ArrowRight') go(cur + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cur, go]);

  const first = cur * perPage;
  const visible = sorted.slice(first, first + perPage);
  const navBtn = 'flex h-9 w-9 [@media(max-height:800px)]:h-8 [@media(max-height:800px)]:w-8 items-center justify-center rounded-full glass transition-colors hover:text-ivory disabled:opacity-30 disabled:hover:text-mist';

  return (
    <>
      <div className="flex items-center justify-between gap-4" style={{ marginBottom: 'var(--stg-arch-label-mb)' }}>
        <p className="font-mono text-xs uppercase tracking-[0.35em] text-mist">
          {ui('memories', lang)} — {s('livingArchive', lang)}
        </p>
        {pages > 1 && (
          <div className="flex items-center gap-2 font-mono text-xs tabular-nums text-mist">
            <button onClick={() => go(cur - 1)} disabled={cur === 0} className={navBtn} aria-label="‹" title="←">
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-[5.5rem] text-center">
              {first + 1}–{first + visible.length} / {sorted.length}
            </span>
            <button onClick={() => go(cur + 1)} disabled={cur >= pages - 1} className={navBtn} aria-label="›" title="→">
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
      <div ref={rowRef} className="relative">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={cur + ':' + perPage}
            custom={dir}
            variants={{
              enter: (d) => ({ opacity: 0, x: d * 60 }),
              center: { opacity: 1, x: 0 },
              exit: (d) => ({ opacity: 0, x: d * -60 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex"
            style={{ gap: ARCHIVE_GAP }}
          >
            {visible.map((m) => {
              const inChapter = m.chapter === activeChapter;
              const active = m.id === activeNodeId;
              const color = CHAPTERS[m.chapter]?.theme.primary;
              return (
                <motion.button
                  key={m.id}
                  onClick={() => onSelect(active ? null : m.id)}
                  title={`${tr(m.title, lang, m.originalLanguage) || m.author} — ${m.author} · ${m.year}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: inChapter ? 1 : 0.35, scale: active ? 1.03 : 1 }}
                  className="relative shrink-0 rounded-2xl text-left glass"
                  style={{
                    width: cardW,
                    padding: 'var(--stg-arch-pad)',
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
                      <span className="ml-auto shrink-0 rounded-full bg-amber-gold/20 px-2 py-0.5 font-mono text-[9px] uppercase text-amber-gold">{s('live', lang)}</span>
                    )}
                  </div>
                  <p
                    className="mt-1.5 line-clamp-2 font-display leading-snug"
                    style={{ fontSize: 'var(--stg-arch-title)', minHeight: 'calc(var(--stg-arch-title) * 2.75)' }}
                  >
                    {tr(m.title, lang, m.originalLanguage) || m.author}
                  </p>
                  <span className="absolute inset-x-4 bottom-0 h-px" style={{ background: color, opacity: 0.6 }} />
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
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

  const { chime, setBedLevel } = audio;

  // ---- Time Tuner: live dial + radio engine ---------------------------------
  const { targetRef, reading, scrubTo } = useTimeScrub(state);
  const tuner = useTimeTuner();
  const soundOn = audio.enabled || tuner.enabled;
  const wantsSound = audio.wantsSound || tuner.wantsSound;
  const { enable: enableAmbient, disable: disableAmbient } = audio;
  const { enable: enableTuner, disable: disableTuner } = tuner;
  const activate = useCallback(() => {
    enableAmbient();
    enableTuner();
  }, [enableAmbient, enableTuner]);
  const silence = useCallback(() => {
    disableAmbient();
    disableTuner();
  }, [disableAmbient, disableTuner]);
  const toggleSound = useCallback(() => (soundOn ? silence() : activate()), [soundOn, silence, activate]);
  useEffect(() => setBedLevel(tuner.enabled ? 0.3 : 1), [tuner.enabled, setBedLevel]);

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
      if (wantsSound && !soundOn) activate();
    };
    const onKey = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.toLowerCase();
      if (k === 'm') toggleSound();
      else if (k === 'f') fullscreen();
      else if (k === 'escape') setOverlayId(null);
    };
    window.addEventListener('pointerdown', onPointer, { once: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [wantsSound, soundOn, activate, toggleSound, fullscreen]);

  const select = useCallback((id) => selectMemoryNode(id), [selectMemoryNode]);

  return (
    <div className="stg-root relative grid h-full grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-[var(--stg-gap)] overflow-hidden bg-obsidian">
      <style>{STAGE_LAYOUT_CSS}</style>
      <div
        className="pointer-events-none absolute inset-0 transition-[background] duration-[1500ms]"
        style={{ background: `radial-gradient(ellipse at 20% 30%, ${theme.primary}1f, transparent 55%), radial-gradient(ellipse at 90% 90%, ${theme.secondary}14, transparent 50%)` }}
      />
      <div className="pointer-events-none absolute inset-0 grain opacity-30" />

      {/* header */}
      <header className="relative z-10 flex items-center justify-between gap-6 px-[var(--stg-px)] pt-[var(--stg-header-pt)]">
        <div className="flex min-w-0 items-baseline gap-5">
          <h1 className="shrink-0 font-display font-semibold leading-tight holo-text" style={{ fontSize: 'var(--stg-h1)' }}>
            {ui('appName', lang)}
          </h1>
          <span className="truncate font-mono text-xs uppercase tracking-[0.35em] text-mist" title={ui('tagline', lang)}>
            {ui('tagline', lang)}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3 font-mono text-xs text-mist">
          <span className="rounded-full px-3 py-1 uppercase glass">{LANGUAGES.find((l) => l.code === lang)?.label}</span>
          <span className="rounded-full px-3 py-1 glass">
            {memories.length} {s('sparks', lang)} · {liveCount} {s('live', lang)}
          </span>
          <span className="rounded-full px-3 py-1 tabular-nums glass">
            <Clock />
          </span>
          <ConnectionBadge connected={connected} lang={lang} />
          <button
            onClick={toggleSound}
            className="flex items-center gap-2 rounded-full px-3 py-2 glass hover:text-ivory"
            title={s(soundOn ? 'mute' : 'unmute', lang)}
            style={soundOn ? { color: theme.primary, borderColor: `${theme.primary}66` } : undefined}
          >
            {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
            {soundOn && (
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

      {/* time tuner band */}
      <TimeTunerHUD targetRef={targetRef} reading={reading} tuner={tuner} lang={lang} soundOn={soundOn} onActivate={activate} scrubTo={scrubTo} />

      {/* main */}
      <main className="relative z-10 grid min-h-0 grid-cols-12 grid-rows-[minmax(0,1fr)] gap-x-[calc(var(--stg-gap)*1.5)] px-[var(--stg-px)]">
        <section className="col-span-5 flex min-h-0 flex-col gap-[var(--stg-gap)]">
          {/* chapter heading (the summary lives in the panel below, sized to fit) */}
          <AnimatePresence mode="wait">
            <motion.div
              key={chapterId + lang}
              className="shrink-0"
              initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -30, filter: 'blur(8px)' }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              <p className="font-mono uppercase tracking-[0.4em]" style={{ color: theme.primary, fontSize: 'var(--stg-kicker)' }}>
                {ui('chapter', lang)} {chapter.order} · {chapter.dateLabel[lang]}
              </p>
              <h2 className="mt-2 font-display font-semibold leading-[1.05]" style={{ fontSize: 'var(--stg-h2)' }}>
                {chapter.title[lang]}
              </h2>
            </motion.div>
          </AnimatePresence>

          <NowLit memory={activeMemory} lang={lang} theme={theme} chapter={chapter} onReopen={() => activeMemory && setOverlayId(activeMemory.id)} />

          <div className="relative shrink-0" style={{ height: 'var(--stg-wave-h)' }}>
            <SoundwaveVisualizer
              analyser={audio.analyser}
              colors={[theme.primary, theme.secondary, theme.glow]}
              burst={(lastAddedMemory?.receivedAt || 0) + selectPulse}
            />
            {!soundOn && (
              <button
                onClick={activate}
                className="absolute bottom-1/2 left-0 flex translate-y-1/2 items-center gap-2 rounded-full px-4 py-2 font-mono text-xs text-mist glass hover:text-ivory"
                style={{ borderColor: `${theme.primary}55` }}
              >
                <Volume2 size={14} /> {wantsSound ? s('resumeSound', lang) : t_('activate', lang)}
              </button>
            )}
          </div>
        </section>

        <section className="col-span-7 min-h-0">
          <ConstellationMap memories={memories} chapterId={chapterId} activeNodeId={activeNodeId} newestId={newestId} lang={lang} onSelect={select} />
        </section>
      </main>

      {/* archive strip */}
      <footer className="relative z-10 min-w-0 px-[var(--stg-px)] pb-[var(--stg-footer-pb)]">
        <Archive memories={memories} activeChapter={chapterId} activeNodeId={activeNodeId} lang={lang} newestId={newestId} onSelect={select} />
      </footer>

      <SpotlightOverlay memory={overlayMemory} lang={lang} duration={duration} onClose={() => setOverlayId(null)} />
      <Celebration lastAddedMemory={lastAddedMemory} lang={lang} />
    </div>
  );
}
