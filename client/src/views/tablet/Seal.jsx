/**
 * "The Seal" — Secession / Revolution sacred-geometry marker. Owner: Member 2.
 *
 * Anatomy (viewBox ±232, radii in user units):
 *   0–118   STATIC high-contrast core. Never morphs, so it stays a stable
 *           image-tracking target for the phone (asymmetric notches = "up").
 *   122–132 rotating rosette band (dash pattern morphs per chapter)
 *   130–192 21 morphing motifs — one per community of Timișoara:
 *             ch.1 Piața Maria  → interlocking links of the human chain
 *             ch.2 Opera        → light beams fanning from the balcony
 *             ch.3 Mosaic       → Secession whiplash petals
 *   182–212 21-point crown (jagged sparks → sunburst → near-circle band)
 *   220     memory orbit — one tappable dot per memory of the active chapter,
 *           placed at the same azimuth the AR lens uses for its orbs.
 *
 * Every chapter motif is built with the SAME path command structure
 * (M + 4×C + Z), so framer-motion can interpolate `d` smoothly between them.
 */
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { SYMBOL_META } from '../../components/common.jsx';
import { N, STEP, f, MOTIFS } from './sealGeometry.js';


const CROWN = {
  '1989_piata_maria': { rIn: 186, rOut: 210 }, // flickering sparks
  '1989_opera': { rIn: 194, rOut: 212 }, // sunburst
  multicultural_mosaic: { rIn: 199, rOut: 203 }, // calm mosaic band
};

const crownPath = ({ rIn, rOut }) => {
  const pts = [];
  for (let i = 0; i < N * 2; i++) {
    const r = i % 2 ? rIn : rOut;
    const a = ((i * 180) / N - 90) * (Math.PI / 180);
    pts.push(`${f(Math.cos(a) * r)},${f(Math.sin(a) * r)}`);
  }
  return `M${pts.join(' L')} Z`;
};

const STYLE = {
  '1989_piata_maria': { fillOpacity: 0, strokeWidth: 2.6, band: '10 6' },
  '1989_opera': { fillOpacity: 0.32, strokeWidth: 1.2, band: '2 4' },
  multicultural_mosaic: { fillOpacity: 0.14, strokeWidth: 1.8, band: '18 3' },
};

const ORBIT_R = 220;

/** Azimuth of a memory on the table — matches its AR orb's x/z position. */
function memoryAngle(m) {
  const p = m.position;
  if (p && (p.x || p.z)) return Math.atan2(p.z, p.x);
  let h = 0;
  for (const ch of m.id || '') h = (h * 31 + ch.charCodeAt(0)) | 0;
  return ((h % 360) * Math.PI) / 180;
}

export default function Seal({ chapterId, theme, memories = [], activeNodeId, onSelectMemory, lastAddedMemory }) {
  const reduce = useReducedMotion();
  const { primary, secondary, glow } = theme;
  const style = STYLE[chapterId] || STYLE['1989_piata_maria'];
  const motif = MOTIFS[chapterId] || MOTIFS['1989_piata_maria'];
  const paths = useMemo(() => Array.from({ length: N }, (_, i) => motif(i)), [motif]);
  const crown = useMemo(() => crownPath(CROWN[chapterId] || CROWN['1989_piata_maria']), [chapterId]);

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
    <div className="relative aspect-square w-full">
      {/* breathing halo */}
      <motion.div
        className="pointer-events-none absolute inset-[14%] rounded-full blur-3xl"
        animate={{ backgroundColor: glow, opacity: reduce ? 0.25 : [0.18, 0.34, 0.18], scale: reduce ? 1 : [0.94, 1.04, 0.94] }}
        transition={{ backgroundColor: { duration: 1.2 }, default: { duration: 6, repeat: Infinity, ease: 'easeInOut' } }}
      />

      <svg viewBox="-232 -232 464 464" className="relative h-full w-full overflow-visible" role="img" aria-label="The Seal">
        <defs>
          <radialGradient id="seal-core" r="0.6">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="100%" stopColor="#f5f0e6" />
          </radialGradient>
          <filter id="seal-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ripples */}
        <AnimatePresence>
          {ripples.map((r) => (
            <motion.circle
              key={r.id}
              r={118}
              fill="none"
              stroke={r.color}
              strokeWidth={3}
              initial={{ r: 118, opacity: 0.9 }}
              animate={{ r: 236, opacity: 0, strokeWidth: 0.5 }}
              transition={{ duration: 2.2, ease: 'easeOut' }}
              onAnimationComplete={() => setRipples((all) => all.filter((x) => x.id !== r.id))}
            />
          ))}
        </AnimatePresence>

        {/* crown */}
        <g>
          {spin(260, true)}
          <motion.path
            initial={false}
            animate={{ d: crown, stroke: primary }}
            transition={morph}
            fill="none"
            strokeWidth={1.4}
            strokeLinejoin="round"
            strokeOpacity={0.75}
          />
          <circle r={ORBIT_R} fill="none" stroke="#f5f0e6" strokeOpacity={0.08} strokeWidth={1} />
        </g>

        {/* 21 morphing motifs */}
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

        {/* rosette band */}
        <g>
          {spin(70, true)}
          <motion.circle
            r={126}
            fill="none"
            strokeWidth={5}
            initial={false}
            animate={{ stroke: primary, strokeDasharray: style.band }}
            transition={morph}
            strokeOpacity={0.9}
          />
        </g>

        {/* STATIC high-contrast core — the tracking target */}
        <g>
          <circle r="118" fill="#0a0a0f" stroke="#f5f0e6" strokeWidth="6" />
          <rect x="-70" y="-70" width="140" height="140" fill="none" stroke="#f5f0e6" strokeWidth="5" transform="rotate(45)" />
          <motion.rect
            x="-58"
            y="-58"
            width="116"
            height="116"
            fill="none"
            strokeWidth="4"
            initial={false}
            animate={{ stroke: primary }}
            transition={{ duration: 1.2 }}
          />
          <circle r="46" fill="url(#seal-core)" />
          <path d="M0,-38 L11,-11 L38,0 L11,11 L0,38 L-11,11 L-38,0 L-11,-11 Z" fill="#0a0a0f" />
          <motion.circle r="7" initial={false} animate={{ fill: primary }} transition={{ duration: 1.2 }} />
          <rect x="-8" y="-112" width="16" height="22" fill="#f5f0e6" />
          <circle cx="78" cy="78" r="9" fill="#f5f0e6" />
        </g>

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
                  <circle cx={x} cy={y} r={20} fill="transparent" />
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
      </svg>
    </div>
  );
}
