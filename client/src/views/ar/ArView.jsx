/**
 * /ar — "The Holographic WebAR Lens". Owner: Member 3.
 *
 * Layers, back to front:
 *   1. rear camera <video> (or a chapter-tinted gradient fallback)
 *   2. alpha-transparent R3F <Canvas>: Seal pedestal, chapter diorama, memory orbs
 *   3. glass HUD: chapter card, controls, toast, memory card
 *
 * Camera control: in AR mode on phones with motion sensors, a 3DoF gyro "world
 * lock" (useGyro); otherwise OrbitControls.
 * Audio: spatial HRTF chime/aura per orb (spatialAudio.js) plus WebSpeech narration
 * with word-synced highlighting (speech.js).
 */
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Box, Sparkles, Volume2, VolumeX, Crosshair, Compass } from 'lucide-react';
import { useSocket } from '../../socket/useSocket.js';
import { CHAPTERS, CHAPTER_IDS, tr } from '@shared/events.js';
import { ui } from '@shared/i18n.js';
import { ConnectionBadge } from '../../components/common.jsx';
import { useCamera } from './useCamera.js';
import { speak, stopSpeaking, canSpeak } from './speech.js';
import { Diorama, HoloBase } from './Dioramas.jsx';
import MemoryOrbs, { speechPulse } from './MemoryOrbs.jsx';
import HudCard from './HudCard.jsx';
import { ShaderClock } from './materials.js';
import { AudioListenerSync, unlockAudio, playChime, startAura, setAura, stopAura, getAura, playArrival, setMuted } from './spatialAudio.js';
import { useGyro, GyroCamera } from './useGyro.js';
import { t } from './strings.js';
import { usePlaza, resolvePlazaId } from './osmPlaza/usePlaza.js';
import { OsmPlazaStage } from './osmPlaza/OsmHologram.jsx';

const NEW_WINDOW_MS = 15000;
// Fit the camera distance so the ~4.6-unit-wide orbit ring fits horizontally on any aspect ratio.
const FOV = 50;
const initialCamera = () => {
  const aspect = window.innerWidth / window.innerHeight;
  const halfW = 2.4;
  const dist = THREE.MathUtils.clamp(halfW / (Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * Math.min(aspect, 1.4)), 5, 11.5);
  return [0, dist * 0.42, dist * 0.9];
};

function Pill({ children, onClick, active, color }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition active:scale-95 glass"
      style={active ? { boxShadow: `inset 0 0 0 1px ${color}`, color } : undefined}
    >
      {children}
    </button>
  );
}

export default function ArView() {
  const { state, connected, selectMemoryNode, lastAddedMemory } = useSocket();
  const [mode, setMode] = useState(() => (window.isSecureContext && navigator.mediaDevices ? 'camera' : 'orbit'));
  const { videoRef, status: camStatus } = useCamera(mode === 'camera');
  const gyro = useGyro();
  const [recenterKey, setRecenterKey] = useState(0);
  const [sound, setSound] = useState('off'); // off | on | muted
  const [speech, setSpeech] = useState(null); // { id, char, offset }
  const speechIdRef = useRef(null);
  const [toast, setToast] = useState(null);

  const lang = state?.language || 'ro';
  const chapterId = state?.activeChapter || CHAPTER_IDS[0];
  const chapter = CHAPTERS[chapterId];
  const theme = chapter.theme;
  const memories = useMemo(() => (state?.memories || []).filter((m) => m.chapter === chapterId), [state?.memories, chapterId]);
  const active = state?.memories.find((m) => m.id === state.activeNodeId) || null;
  const newId = lastAddedMemory && Date.now() - lastAddedMemory.receivedAt < NEW_WINDOW_MS ? lastAddedMemory.memory.id : null;
  const gyroActive = mode === 'camera' && gyro.status === 'active';
  const cameraLive = mode === 'camera' && camStatus === 'live';

  /* ───────── authentic OSM plaza (hologram) vs procedural diorama ───────── */
  const plazaId = resolvePlazaId(state);
  const { plaza, status: plazaStatus } = usePlaza(plazaId);
  const lastHolo = useRef(null);
  // while the next plaza downloads, keep the current one instead of flashing back to the diorama
  const holo = !plazaId ? null : plazaStatus === 'ready' ? plaza : plazaStatus === 'loading' ? lastHolo.current : null;
  lastHolo.current = holo;

  /* ───────── audio & speech ───────── */
  const enableSound = () => {
    unlockAudio();
    setMuted(false);
    setSound('on');
  };
  const toggleSound = () => {
    if (sound === 'on') {
      setMuted(true);
      setSound('muted');
    } else enableSound();
  };

  const silence = () => {
    stopSpeaking();
    stopAura();
    speechIdRef.current = null;
    setSpeech(null);
  };

  // must run synchronously inside a tap (iOS)
  const readAloud = (m) => {
    const lng = m.text[lang] ? lang : m.originalLanguage;
    const title = tr(m.title, lng);
    const full = `${title}. ${tr(m.text, lng)}`;
    speechIdRef.current = m.id;
    setSpeech({ id: m.id, char: 0, offset: title.length + 2 });
    speak(full, lng, {
      onWord: (idx) => {
        if (speechIdRef.current !== m.id) return;
        setSpeech((s) => (s && s.id === m.id ? { ...s, char: idx } : s));
        speechPulse.value = 1;
        getAura()?.handle.pulse();
      },
      onEnd: () => {
        if (speechIdRef.current !== m.id) return;
        speechIdRef.current = null;
        setSpeech(null);
      },
    });
  };

  const handleSelect = (m, worldPos) => {
    if (sound !== 'muted') enableSound();
    playChime(worldPos, m.symbol);
    setAura(m.id, startAura(worldPos, m.symbol));
    if (canSpeak) readAloud(m);
    selectMemoryNode(m.id);
  };

  const close = () => {
    silence();
    selectMemoryNode(null);
  };

  // stop on chapter/language change …
  useEffect(silence, [lang, chapterId]);
  // … or when another device selects a different node / clears it
  useEffect(() => {
    if (state?.activeNodeId !== speechIdRef.current) silence();
  }, [state?.activeNodeId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => silence(), []); // eslint-disable-line react-hooks/exhaustive-deps

  // chapter arrival sound (not on first mount)
  const firstChapter = useRef(true);
  useEffect(() => {
    if (firstChapter.current) {
      firstChapter.current = false;
      return;
    }
    playArrival(chapterId);
  }, [chapterId]);

  // toast when a memory rises
  useEffect(() => {
    if (!lastAddedMemory) return;
    setToast(lastAddedMemory.memory);
    const tm = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(tm);
  }, [lastAddedMemory]);

  const speakingThis = !!speech && speech.id === active?.id;

  return (
    <div className="fixed inset-0 overflow-hidden bg-obsidian select-none">
      {/* 1 · camera / fallback */}
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
          style={{ background: `radial-gradient(ellipse at 50% 62%, ${theme.primary}38, #0a0a0f 66%)` }}
        />
      )}
      {cameraLive && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 50% 55%, transparent 40%, rgba(0,0,0,0.55)), linear-gradient(to top, ${theme.primary}22, transparent 35%)`,
          }}
        />
      )}

      {/* 2 · 3D */}
      <Canvas
        className="!absolute inset-0"
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
        camera={{ position: initialCamera(), fov: FOV, near: 0.05, far: 100 }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      >
        <ShaderClock />
        <AudioListenerSync />
        <GyroCamera orientation={gyro.orientation} enabled={gyroActive} recenterKey={recenterKey} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 5, 2]} intensity={0.9} />
        <directionalLight position={[-3, 2, -2]} intensity={0.3} color={theme.secondary} />
        <Suspense fallback={null}>
          <group position-y={-0.6}>
            <HoloBase color={theme.primary} accent={theme.secondary} />
            {!holo && <Diorama key={chapterId} chapterId={chapterId} theme={theme} />}
            <OsmPlazaStage plaza={holo} theme={theme} />
            <MemoryOrbs memories={memories} activeNodeId={state?.activeNodeId} newId={newId} onSelect={handleSelect} />
          </group>
        </Suspense>
        {!gyroActive && (
          <OrbitControls
            enablePan={false}
            minDistance={2.5}
            maxDistance={14}
            maxPolarAngle={Math.PI / 2.05}
            autoRotate={mode === 'orbit' && !active}
            autoRotateSpeed={0.5}
            target={[0, 0.1, 0]}
            enableDamping
          />
        )}
      </Canvas>

      {/* scanlines (subtle hologram texture) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-screen"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 3px)' }}
      />

      {/* 3 · HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={chapterId + lang}
            initial={{ opacity: 0, x: -16, filter: 'blur(6px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: -16 }}
            className="max-w-[60%] rounded-2xl px-4 py-3 glass"
            style={{ boxShadow: `inset 3px 0 0 ${theme.primary}` }}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: theme.primary }}>
              {chapter.dateLabel[lang]}
            </p>
            <p className="font-display text-xl font-semibold leading-tight">{chapter.title[lang]}</p>
            {holo && (
              <div className="mt-1.5 space-y-0.5">
                <p className="text-xs text-ivory/80">{tr(holo.name, lang)}</p>
                {holo.caveat && <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-mist">{tr(holo.caveat, lang)}</p>}
                <p className="font-mono text-[9px] tracking-[0.1em] text-mist/80">{holo.attribution}</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <ConnectionBadge connected={connected} lang={lang} />
          <Pill onClick={() => setMode((m) => (m === 'camera' ? 'orbit' : 'camera'))}>
            {mode === 'camera' ? <Box size={15} /> : <Camera size={15} />}
            {t(mode === 'camera' ? 'orbit' : 'arCamera', lang)}
          </Pill>
          <Pill onClick={toggleSound} active={sound === 'on'} color={theme.primary}>
            {sound === 'on' ? <Volume2 size={15} /> : <VolumeX size={15} />}
            {t('soundOn', lang)}
          </Pill>
          {mode === 'camera' && gyro.status === 'needs-permission' && (
            <Pill onClick={gyro.requestPermission}>
              <Compass size={15} /> {t('enableMotion', lang)}
            </Pill>
          )}
          {gyroActive && (
            <Pill onClick={() => setRecenterKey((k) => k + 1)}>
              <Crosshair size={15} /> {t('recenter', lang)}
            </Pill>
          )}
          {mode === 'camera' && (camStatus === 'denied' || camStatus === 'unsupported') && (
            <span className="max-w-[12rem] rounded-xl bg-crimson/20 px-3 py-1.5 text-right text-[11px] text-ivory/80 backdrop-blur">
              {t(camStatus === 'denied' ? 'camBlocked' : 'camHttps', lang)}
            </span>
          )}
        </div>
      </div>

      {/* new-memory toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="pointer-events-none absolute left-1/2 top-[7.5rem] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm glass"
            style={{ boxShadow: `0 0 30px ${theme.primary}55` }}
          >
            <Sparkles size={16} className="text-amber-gold" />
            <b>{toast.author}</b> <span className="text-ivory/70">{t('rising', lang)}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* bottom: memory card or hint */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <AnimatePresence mode="wait">
          {active ? (
            <div key={active.id + lang} className="pointer-events-auto">
              <HudCard
                memory={active}
                lang={lang}
                theme={theme}
                speaking={speakingThis}
                bodyCharIndex={speakingThis ? speech.char - speech.offset : null}
                titleActive={speakingThis && speech.char < speech.offset}
                canSpeak={canSpeak}
                onClose={close}
                onToggleSpeak={() => (speakingThis ? silence() : readAloud(active))}
              />
            </div>
          ) : (
            <motion.p
              key="hint"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-auto w-fit rounded-full px-4 py-2 text-center text-sm text-ivory/80 glass"
            >
              {ui('tapAnOrb', lang)} · <span style={{ color: theme.primary }}>{memories.length}</span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
