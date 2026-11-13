/**
 * /ar — "The Holographic WebAR Lens". Owner: Member 3.
 * Camera feed (or gradient fallback) + transparent R3F canvas on top.
 */
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Box, X, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { useSocket } from '../../socket/useSocket.js';
import { CHAPTERS, CHAPTER_IDS, tr } from '@shared/events.js';
import { ui } from '@shared/i18n.js';
import { ConnectionBadge, SymbolIcon } from '../../components/common.jsx';
import { useCamera } from './useCamera.js';
import { speak, stopSpeaking, canSpeak } from './speech.js';
import { Diorama, HoloBase } from './Dioramas.jsx';
import MemoryOrbs from './MemoryOrbs.jsx';

const NEW_WINDOW_MS = 15000;
// portrait phones need the camera further back to fit the ~4.5-unit-wide diorama
const initialCamera = () => (window.innerWidth / window.innerHeight < 1 ? [0, 3.6, 7.2] : [0, 2.4, 4.6]);

export default function ArView() {
  const { state, connected, selectMemoryNode, lastAddedMemory } = useSocket();
  const [mode, setMode] = useState(() => (window.isSecureContext && navigator.mediaDevices ? 'camera' : 'orbit'));
  const { videoRef, status: camStatus } = useCamera(mode === 'camera');
  const [speaking, setSpeaking] = useState(false);
  const speakingIdRef = useRef(null);
  const [toast, setToast] = useState(null);

  const lang = state?.language || 'ro';
  const chapterId = state?.activeChapter || CHAPTER_IDS[0];
  const chapter = CHAPTERS[chapterId];
  const memories = useMemo(() => (state?.memories || []).filter((m) => m.chapter === chapterId), [state?.memories, chapterId]);
  const active = state?.memories.find((m) => m.id === state.activeNodeId) || null;
  const newId =
    lastAddedMemory && Date.now() - lastAddedMemory.receivedAt < NEW_WINDOW_MS ? lastAddedMemory.memory.id : null;

  // toast when a memory rises
  useEffect(() => {
    if (!lastAddedMemory) return;
    setToast(lastAddedMemory.memory);
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [lastAddedMemory]);

  const silence = () => {
    stopSpeaking();
    speakingIdRef.current = null;
    setSpeaking(false);
  };

  // stop talking on language/chapter change
  useEffect(silence, [lang, chapterId]);
  // ...or when someone else selects a different node / deselects
  useEffect(() => {
    if (state?.activeNodeId !== speakingIdRef.current) silence();
  }, [state?.activeNodeId]);

  // must run synchronously inside the tap handler (iOS gesture requirement)
  const readAloud = (m) => {
    const lng = m.text[lang] ? lang : m.originalLanguage;
    speakingIdRef.current = m.id;
    setSpeaking(true);
    speak(`${tr(m.title, lng)}. ${tr(m.text, lng)}`, lng, {
      onEnd: () => {
        if (speakingIdRef.current === m.id) setSpeaking(false);
      },
    });
  };

  const handleSelect = (m) => {
    readAloud(m);
    selectMemoryNode(m.id);
  };

  const cameraLive = mode === 'camera' && camStatus === 'live';

  return (
    <div className="fixed inset-0 overflow-hidden bg-obsidian select-none">
      {/* background: camera or fallback gradient */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${cameraLive ? 'opacity-100' : 'opacity-0'}`}
      />
      {!cameraLive && (
        <div
          className="absolute inset-0 transition-[background] duration-1000"
          style={{ background: `radial-gradient(ellipse at 50% 65%, ${chapter.theme.primary}33, #0a0a0f 65%)` }}
        />
      )}
      {cameraLive && <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />}

      {/* 3D layer */}
      <Canvas
        className="!absolute inset-0"
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 2]}
        camera={{ position: initialCamera(), fov: 50 }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[3, 5, 2]} intensity={0.8} />
        <Suspense fallback={null}>
          <group position-y={-0.6}>
            <HoloBase color={chapter.theme.primary} />
            <Diorama key={chapterId} chapterId={chapterId} theme={chapter.theme} />
            <MemoryOrbs memories={memories} activeNodeId={state?.activeNodeId} newId={newId} onSelect={handleSelect} />
          </group>
        </Suspense>
        <OrbitControls
          enablePan={false}
          minDistance={2.5}
          maxDistance={11}
          maxPolarAngle={Math.PI / 2.05}
          autoRotate={mode === 'orbit' && !active}
          autoRotateSpeed={0.6}
          target={[0, 0.2, 0]}
        />
      </Canvas>

      {/* top HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <motion.div key={chapterId + lang} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="rounded-2xl px-4 py-3 glass">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: chapter.theme.primary }}>
            {chapter.dateLabel[lang]}
          </p>
          <p className="font-display text-xl font-semibold leading-tight">{chapter.title[lang]}</p>
        </motion.div>
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <ConnectionBadge connected={connected} lang={lang} />
          <button
            onClick={() => setMode((m) => (m === 'camera' ? 'orbit' : 'camera'))}
            className="flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold glass"
          >
            {mode === 'camera' ? <Box size={16} /> : <Camera size={16} />}
            {mode === 'camera' ? '3D Orbit' : 'AR Camera'}
          </button>
          {mode === 'camera' && (camStatus === 'denied' || camStatus === 'unsupported') && (
            <span className="max-w-[12rem] rounded-xl bg-crimson/20 px-3 py-1.5 text-right text-[11px] text-ivory/80">
              {camStatus === 'denied' ? 'Camera blocked — showing hologram only.' : 'Camera needs HTTPS — use the tunnel URL.'}
            </span>
          )}
        </div>
      </div>

      {/* new memory toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pointer-events-none absolute left-1/2 top-28 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-sm glass"
          >
            <Sparkles size={16} className="text-amber-gold" />
            {ui('newMemory', lang)}: <b>{toast.author}</b>
          </motion.div>
        )}
      </AnimatePresence>

      {/* bottom: hint or memory card */}
      <div className="absolute inset-x-0 bottom-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <AnimatePresence mode="wait">
          {active ? (
            <motion.article
              key={active.id + lang}
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40 }}
              className="mx-auto max-w-lg rounded-3xl p-5 glass"
              style={{ boxShadow: `0 0 60px ${chapter.theme.primary}33`, borderColor: `${chapter.theme.primary}55` }}
            >
              <div className="flex items-start gap-3">
                <SymbolIcon symbol={active.symbol} size={26} className="mt-1 shrink-0" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-2xl font-semibold leading-tight">{tr(active.title, lang, active.originalLanguage)}</h3>
                  <p className="mt-0.5 font-mono text-[11px] text-mist">
                    {active.author}
                    {active.role ? ` · ${tr(active.role, lang)}` : ''} · {active.year}
                  </p>
                </div>
                <button onClick={() => selectMemoryNode(null)} className="pointer-events-auto rounded-full p-1.5 text-mist hover:bg-white/10" aria-label="close">
                  <X size={20} />
                </button>
              </div>
              <p className="mt-3 max-h-[30vh] overflow-y-auto text-[15px] leading-relaxed text-ivory/90">
                {tr(active.text, lang, active.originalLanguage)}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-mist">
                  {active.composite ? 'Composite testimony' : 'Visitor memory'}
                </span>
                {canSpeak && (
                  <button
                    onClick={() => (speaking ? silence() : readAloud(active))}
                    className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"
                  >
                    {speaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    {speaking ? 'Stop' : 'Listen'}
                  </button>
                )}
              </div>
            </motion.article>
          ) : (
            <motion.p
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mx-auto w-fit rounded-full px-4 py-2 text-center text-sm text-ivory/80 glass"
            >
              {ui('tapAnOrb', lang)} · {memories.length}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
