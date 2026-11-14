/**
 * "The Seal" — now the Rotary Time Tuner. Owner: Member 2.
 *
 * Anatomy (viewBox ±320, see DIAL in sealGeometry.js):
 *   0–143   STATIC 6DoF anchor: white quiet zone, ArUco #16 + 4 distinct L-markers.
 *           Never animated or tinted, so the phone's /ar lens can always solve its pose.
 *   148     rosette band (dash pattern morphs per chapter); green halo when the lens locks
 *   151–223 21 morphing motifs — one per community of Timișoara:
 *             ch.1 Piața Maria  → interlocking links of the human chain
 *             ch.2 Opera        → light beams fanning from the balcony
 *             ch.3 Mosaic       → Secession whiplash petals
 *   236     memory orbit — one tappable dot per memory of the active chapter,
 *           placed at the same azimuth the AR lens uses for its orbs.
 *   252–300 the TUNING RING: grab it anywhere outside the anchor and turn. One full turn =
 *           1900 → 2026. Tap a glowing station notch to glide there.
 *   6 o'clock  fixed index + glass window (green when a station is locked)
 *
 * Every chapter motif is built with the SAME path command structure (M + 4×C + Z),
 * so framer-motion can interpolate `d` smoothly between them.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Anchor, ScanLine } from 'lucide-react';
import { TIMELINE, TIMELINE_ERAS, TIMELINE_ERA_BY_ID } from '@shared/events.js';
import { SYMBOL_META } from '../../components/common.jsx';
import { N, STEP, MOTIFS, DIAL } from './sealGeometry.js';
import AnchorTarget from './AnchorTarget.jsx';
import DialRing, { DialIndex } from './DialRing.jsx';
import { LOCK_GREEN, dial, useTimeDial } from './timeDial.js';
import { t } from './strings.js';

const STYLE = {
  '1989_piata_maria': { fillOpacity: 0, strokeWidth: 2.6, band: '10 6' },
  '1989_opera': { fillOpacity: 0.32, strokeWidth: 1.2, band: '2 4' },
  multicultural_mosaic: { fillOpacity: 0.14, strokeWidth: 1.8, band: '18 3' },
};

const ORBIT_R = DIAL.orbit;
const DRAG_SLOP_PX = 7;
const VIEW = DIAL.view;

/** Azimuth of a memory on the table — matches its AR orb's x/z position. */
function memoryAngle(m) {
  const p = m.position;
  if (p && (p.x || p.z)) return Math.atan2(p.z, p.x);
  let h = 0;
  for (const ch of m.id || '') h = (h * 31 + ch.charCodeAt(0)) | 0;
  return ((h % 360) * Math.PI) / 180;
}

/**
 * Pointer → dial. A press becomes a drag after a few pixels (then the SVG captures the
 * pointer); a press that never moves is a tap — on a station notch it tunes there, on a
 * memory dot the dot's own onClick runs. `Math.atan2` gives the finger's angle around the
 * centre; each move turns the dial by the unwrapped angle delta (one full turn = 0 → 1).
 */
function useDialGesture(svgRef) {
  const g = useRef(null);
  return useMemo(() => {
    const locate = (e) => {
      const rect = svgRef.current.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      return { r: Math.hypot(dx, dy) / (rect.width / (2 * VIEW)), angle: Math.atan2(dy, dx) };
    };
    const end = (e, completed) => {
      const s = g.current;
      if (!s || s.id !== e.pointerId) return;
      g.current = null;
      if (s.dragging) dial.release({ fling: completed });
      else if (completed && s.station) dial.tuneToStation(s.station);
    };
    return {
      onPointerDown(e) {
        if (g.current?.dragging || !svgRef.current) return; // one finger turns the dial
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        const { r, angle } = locate(e);
        if (r < DIAL.grabMin) return; // never start on the anchor target
        g.current = {
          id: e.pointerId,
          x: e.clientX,
          y: e.clientY,
          angle,
          dragging: false,
          station: e.target.closest?.('[data-station]')?.getAttribute('data-station') ?? null,
        };
      },
      onPointerMove(e) {
        const s = g.current;
        if (!s || s.id !== e.pointerId) return;
        if (!s.dragging) {
          if (Math.hypot(e.clientX - s.x, e.clientY - s.y) < DRAG_SLOP_PX) return;
          s.dragging = true;
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            /* pointer already gone */
          }
          dial.grab();
        }
        const { angle } = locate(e);
        let d = angle - s.angle;
        if (d > Math.PI) d -= 2 * Math.PI;
        else if (d < -Math.PI) d += 2 * Math.PI;
        s.angle = angle;
        dial.turn(d / (2 * Math.PI));
      },
      onPointerUp: (e) => end(e, true),
      onPointerCancel: (e) => end(e, false),
      onLostPointerCapture: (e) => end(e, false),
      onPointerLeave: (e) => {
        if (g.current && !g.current.dragging && g.current.id === e.pointerId) g.current = null;
      },
    };
  }, [svgRef]);
}

const KEY_STEPS = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10, Home: -999, End: 999 };

/**
 * The focusable slider around the Seal: keyboard, mouse wheel and ARIA. It re-renders
 * when the year changes; its children (the whole Seal artwork) are passed in and don't.
 */
function DialSurface({ lang, children }) {
  const year = useTimeDial((s) => s.currentYear);
  const lockedId = useTimeDial((s) => (s.inStation ? s.nearestStation : ''));
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let acc = 0;
    const onWheel = (e) => {
      e.preventDefault();
      acc += Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      const steps = Math.trunc(acc / 40);
      if (steps) {
        acc -= steps * 40;
        dial.stepYears(steps);
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onKeyDown = (e) => {
    if (e.key in KEY_STEPS) {
      e.preventDefault();
      dial.stepYears(KEY_STEPS[e.key]);
      return;
    }
    const preset = ['1', '2', '3', '4'].indexOf(e.key);
    if (preset >= 0) {
      e.preventDefault();
      dial.tuneToStation(TIMELINE_ERAS[preset].id);
    }
  };

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label={t('yearDial', lang)}
      aria-valuemin={TIMELINE.startYear}
      aria-valuemax={TIMELINE.endYear}
      aria-valuenow={year}
      aria-valuetext={lockedId ? `${year} — ${TIMELINE_ERA_BY_ID[lockedId].title[lang]}` : String(year)}
      onKeyDown={onKeyDown}
      onContextMenu={(e) => e.preventDefault()}
      className="relative aspect-square w-full rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ivory/40"
      style={{ touchAction: 'none', WebkitTouchCallout: 'none' }}
    >
      {children}
    </div>
  );
}

export default function Seal({
  chapterId,
  theme,
  memories = [],
  activeNodeId,
  onSelectMemory,
  lastAddedMemory,
  anchorLocked = false,
  lang = 'ro',
}) {
  const reduce = useReducedMotion();
  const { primary, secondary, glow } = theme;
  const style = STYLE[chapterId] || STYLE['1989_piata_maria'];
  const motif = MOTIFS[chapterId] || MOTIFS['1989_piata_maria'];
  const paths = useMemo(() => Array.from({ length: N }, (_, i) => motif(i)), [motif]);
  const svgRef = useRef(null);
  const gesture = useDialGesture(svgRef);

  // Ripples: one per chapter change + one per new memory (in its symbol colour).
  const [ripples, setRipples] = useState([]);
  const addRipple = (color) => {
    const id = Math.random().toString(36).slice(2);
    setRipples((r) => [...r.slice(-4), { id, color }]);
  };
  useEffect(() => addRipple(primary), [chapterId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (lastAddedMemory) addRipple(SYMBOL_META[lastAddedMemory.memory.symbol]?.color || primary);
  }, [lastAddedMemory]); // eslint-disable-line react-hooks/exhaustive-deps

  const morph = { duration: reduce ? 0 : 1.4, ease: [0.65, 0, 0.35, 1] };
  /** Exact rotation about the Seal's centre (user-space origin). */
  const spin = (secs, rev) =>
    reduce ? null : (
      <animateTransform attributeName="transform" type="rotate" from={rev ? 360 : 0} to={rev ? 0 : 360} dur={`${secs}s`} repeatCount="indefinite" />
    );

  return (
    <DialSurface lang={lang}>
      {/* breathing halo */}
      <motion.div
        className="pointer-events-none absolute inset-[18%] rounded-full blur-3xl"
        animate={{ backgroundColor: glow, opacity: reduce ? 0.22 : [0.16, 0.3, 0.16], scale: reduce ? 1 : [0.94, 1.04, 0.94] }}
        transition={{ backgroundColor: { duration: 1.2 }, default: { duration: 6, repeat: Infinity, ease: 'easeInOut' } }}
      />

      {/* AR anchor status (sits in the empty corner of the square) */}
      <div
        className="pointer-events-none absolute left-0 top-0 z-10 flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.22em] backdrop-blur-md transition-colors duration-700 sm:text-[10px]"
        style={{
          color: anchorLocked ? LOCK_GREEN : '#9ca3af',
          borderColor: anchorLocked ? `${LOCK_GREEN}80` : 'rgba(245,240,230,.1)',
          backgroundColor: anchorLocked ? `${LOCK_GREEN}14` : 'rgba(10,10,15,.55)',
        }}
        title={t('sealHint', lang)}
      >
        {anchorLocked ? <Anchor size={12} /> : <ScanLine size={12} />}
        <span>{anchorLocked ? t('anchorLocked', lang) : t('arAnchor', lang)}</span>
        
      </div>

      <svg
        ref={svgRef}
        viewBox={`${-VIEW} ${-VIEW} ${VIEW * 2} ${VIEW * 2}`}
        className="relative h-full w-full cursor-grab overflow-visible active:cursor-grabbing"
        aria-hidden="true"
        {...gesture}
      >
        <defs>
          <filter id="seal-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* the tuning ring (rotates with time) */}
        <DialRing />

        {/* 21 morphing motifs, scaled out of the anchor's way */}
        <g transform={`scale(${DIAL.motifScale})`} pointerEvents="none">
          <g>
            {spin(160)}
            {paths.map((d, i) => (
              <g key={i} transform={`rotate(${i * STEP})`}>
                <motion.path
                  initial={false}
                  animate={{
                    d,
                    stroke: i % 3 === 0 ? secondary : primary,
                    fill: secondary,
                    fillOpacity: style.fillOpacity,
                    strokeWidth: style.strokeWidth,
                  }}
                  transition={{ ...morph, delay: reduce ? 0 : i * 0.035 }}
                  strokeLinejoin="round"
                />
              </g>
            ))}
          </g>
        </g>

        {/* rosette band + lens-locked halo */}
        <g pointerEvents="none">
          <AnimatePresence>
            {anchorLocked && (
              <motion.circle
                key="anchor-lock"
                r={DIAL.rosette}
                fill="none"
                stroke={LOCK_GREEN}
                strokeWidth={14}
                filter="url(#seal-glow)"
                initial={{ opacity: 0 }}
                animate={{ opacity: reduce ? 0.4 : [0.25, 0.5, 0.25] }}
                exit={{ opacity: 0, transition: { duration: 0.6 } }}
                transition={{ duration: 2.4, repeat: reduce ? 0 : Infinity, ease: 'easeInOut' }}
              />
            )}
          </AnimatePresence>
          <g>
            {spin(70, true)}
            <motion.circle
              r={DIAL.rosette}
              fill="none"
              strokeWidth={5}
              initial={false}
              animate={{ stroke: primary, strokeDasharray: style.band }}
              transition={morph}
              strokeOpacity={0.9}
            />
          </g>
        </g>

        {/* ripples */}
        <g pointerEvents="none">
          <AnimatePresence>
            {ripples.map((r) => (
              <motion.circle
                key={r.id}
                r={DIAL.rosette}
                fill="none"
                stroke={r.color}
                strokeWidth={3}
                initial={{ r: DIAL.rosette, opacity: 0.9 }}
                animate={{ r: VIEW + 10, opacity: 0, strokeWidth: 0.5 }}
                transition={{ duration: 2.2, ease: 'easeOut' }}
                onAnimationComplete={() => setRipples((all) => all.filter((x) => x.id !== r.id))}
              />
            ))}
          </AnimatePresence>
        </g>

        {/* STATIC high-contrast core — the 6DoF tracking target */}
        <AnchorTarget accent={primary} />

        {/* memory orbit */}
        <g>
          <AnimatePresence>
            {memories.map((m) => {
              const a = memoryAngle(m);
              const x = Math.cos(a) * ORBIT_R;
              const y = Math.sin(a) * ORBIT_R;
              const color = SYMBOL_META[m.symbol]?.color || primary;
              const active = m.id === activeNodeId;
              return (
                <motion.g
                  key={m.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ type: 'spring', damping: 18, stiffness: 140 }}
                  style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                  onClick={() => onSelectMemory?.(active ? null : m.id)}
                  className="cursor-pointer"
                >
                  {/* generous invisible hit target (≥44px on a typical tablet) */}
                  <circle cx={x} cy={y} r={24} fill="transparent" />
                  {active && !reduce && (
                    <motion.circle
                      cx={x}
                      cy={y}
                      fill="none"
                      stroke={color}
                      strokeWidth={2}
                      initial={{ r: 8, opacity: 1 }}
                      animate={{ r: 22, opacity: 0 }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                    />
                  )}
                  <circle cx={x} cy={y} r={active ? 10 : 6} fill={color} opacity={active ? 1 : 0.85} filter="url(#seal-glow)" />
                  <circle cx={x} cy={y} r={active ? 4 : 2.2} fill="#fff" />
                </motion.g>
              );
            })}
          </AnimatePresence>
        </g>

        {/* fixed index at 6 o'clock */}
        <DialIndex accent={primary} />
      </svg>
    </DialSurface>
  );
}
