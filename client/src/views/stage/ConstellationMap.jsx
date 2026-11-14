/**
 * Constellation map of Timișoara: every memory is a star.
 * Stylised (not to scale): the Vauban star-fortress of Cetate, the Bega canal,
 * the historic districts and the two 1989 squares. Chapter-1 stars gather at
 * Piața Maria, chapter-2 stars at the Opera, Mosaic stars across the districts.
 * Click a star → SELECT_MEMORY_NODE (toggle).
 */
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CHAPTERS, tr } from '@shared/events.js';
import { SYMBOL_META, SymbolIcon } from '../../components/common.jsx';
import { s } from './stageStrings.js';

const W = 1000;
const H = 640;
const FORT = { x: 520, y: 245, r: 118 };

const PLACES = {
  unirii: { x: 508, y: 200, label: 'Piața Unirii' },
  opera: { x: 530, y: 305, label: 'Opera · Piața Victoriei' },
  cathedral: { x: 538, y: 385, label: 'Catedrala Mitropolitană' },
  maria: { x: 330, y: 470, label: 'Piața Maria' },
};
const DISTRICTS = [
  { id: 'cetate', label: 'Cetate', x: 470, y: 225, lx: 520, ly: 120 },
  { id: 'fabric', label: 'Fabric', x: 805, y: 270, lx: 805, ly: 175 },
  { id: 'iosefin', label: 'Iosefin', x: 175, y: 535, lx: 150, ly: 430 },
  { id: 'elisabetin', label: 'Elisabetin', x: 545, y: 545, lx: 640, ly: 610 },
];
const BEGA = 'M -10 372 C 120 352 230 410 360 412 S 520 398 640 408 S 820 450 900 438 S 980 420 1010 425';

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}
function seeded(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fortressPath() {
  const N = 7;
  const pts = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    [
      [-0.3, 0.76],
      [-0.13, 0.86],
      [0, 1],
      [0.13, 0.86],
      [0.3, 0.76],
    ].forEach(([da, rr]) => pts.push([FORT.x + Math.cos(a + da) * FORT.r * rr * 1.18, FORT.y + Math.sin(a + da) * FORT.r * rr]));
  }
  return `M ${pts.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join(' L ')} Z`;
}
const FORTRESS = fortressPath();

const BG_STARS = (() => {
  const r = seeded(1989);
  return Array.from({ length: 170 }, () => ({ x: r() * W, y: r() * H, r: r() * 1.1 + 0.2, d: (r() * 6 + 2).toFixed(1), o: r() * 0.5 + 0.15 }));
})();

function anchorFor(m) {
  if (m.chapter === '1989_piata_maria') return { key: 'maria', ...PLACES.maria };
  if (m.chapter === '1989_opera') return { key: 'opera', ...PLACES.opera };
  const d = DISTRICTS[hash(m.id) % DISTRICTS.length];
  return { key: d.id, x: d.x, y: d.y };
}

/** Golden-angle spiral around each anchor → never overlapping, stable. */
function layout(memories) {
  const counts = {};
  const sorted = [...memories].sort((a, b) => (a.isSeed === b.isSeed ? Date.parse(a.createdAt) - Date.parse(b.createdAt) : a.isSeed ? -1 : 1));
  const out = {};
  sorted.forEach((m) => {
    const an = anchorFor(m);
    const k = (counts[an.key] = (counts[an.key] ?? -1) + 1);
    const base = (hash(an.key) % 360) * (Math.PI / 180);
    const ang = base + k * 2.39996;
    const rad = 30 + 17 * Math.sqrt(k);
    out[m.id] = { x: an.x + Math.cos(ang) * rad * 1.15, y: an.y + Math.sin(ang) * rad, cluster: an.key, k };
  });
  return out;
}

/** Greedy nearest-neighbour chain per cluster → constellation lines. */
function constellationLines(points) {
  const byCluster = {};
  points.forEach((p) => (byCluster[p.cluster] ||= []).push(p));
  const lines = [];
  Object.values(byCluster).forEach((pts) => {
    if (pts.length < 2) return;
    const left = [...pts].sort((a, b) => a.k - b.k);
    let cur = left.shift();
    const chain = [cur];
    while (left.length) {
      let bi = 0;
      let bd = Infinity;
      left.forEach((p, i) => {
        const d = (p.x - cur.x) ** 2 + (p.y - cur.y) ** 2;
        if (d < bd) {
          bd = d;
          bi = i;
        }
      });
      cur = left.splice(bi, 1)[0];
      chain.push(cur);
    }
    lines.push(`M ${chain.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')}`);
  });
  return lines;
}

const CSS = `
.stg-twinkle { animation: stg-tw var(--d) ease-in-out infinite alternate; }
@keyframes stg-tw { from { opacity: var(--o); } to { opacity: 0.05; } }
.stg-flow { stroke-dasharray: 6 14; animation: stg-flow 3s linear infinite; }
@keyframes stg-flow { to { stroke-dashoffset: -40; } }
.stg-march { stroke-dasharray: 2 10; animation: stg-flow 1.6s linear infinite; }
.stg-pulse { animation: stg-pulse 2.4s ease-out infinite; transform-box: fill-box; transform-origin: center; }
@keyframes stg-pulse { from { transform: scale(0.6); opacity: 0.9; } to { transform: scale(2.6); opacity: 0; } }
.stg-breathe { animation: stg-br var(--d) ease-in-out infinite alternate; }
@keyframes stg-br { from { opacity: 1; } to { opacity: 0.5; } }
`;

export default function ConstellationMap({ memories, chapterId, activeNodeId, newestId, lang, onSelect }) {
  const [hoverId, setHoverId] = useState(null);
  const theme = CHAPTERS[chapterId].theme;
  const pos = useMemo(() => layout(memories), [memories]);
  const activeMems = useMemo(() => memories.filter((m) => m.chapter === chapterId), [memories, chapterId]);
  const lines = useMemo(() => constellationLines(activeMems.map((m) => ({ ...pos[m.id], id: m.id }))), [activeMems, pos]);
  const hover = memories.find((m) => m.id === hoverId);
  const selected = memories.find((m) => m.id === activeNodeId);
  const counts = useMemo(() => {
    const c = { candle: 0, flower: 0, musical_note: 0 };
    memories.forEach((m) => (c[m.symbol] = (c[m.symbol] || 0) + 1));
    return c;
  }, [memories]);

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-3xl glass" style={{ borderColor: `${theme.primary}33` }}>
      <div
        className="pointer-events-none absolute inset-0 transition-[background] duration-[1500ms]"
        style={{ background: `radial-gradient(ellipse at 50% 45%, ${theme.primary}14, transparent 65%)` }}
      />

      {/* header row · map box (SVG scales to it, aspect preserved); hint overlays the bottom-left corner */}
      <div
        className="relative z-10 flex shrink-0 flex-wrap items-start justify-between gap-x-4 gap-y-1"
        style={{ padding: 'var(--stg-map-pad) var(--stg-map-pad) 0' }}
      >
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.35em]" style={{ color: theme.primary }}>
            ✦ {s('constellation', lang)}
          </p>
          <p className="mt-0.5 font-display leading-tight" style={{ fontSize: 'var(--stg-map-title)' }}>
            Timișoara · 45°45′N 21°14′E
          </p>
        </div>
        <div className="flex gap-4 font-mono text-xs text-mist">
          {Object.entries(counts).map(([sym, n]) => (
            <span key={sym} className="flex items-center gap-1.5">
              <SymbolIcon symbol={sym} size={14} /> {n}
            </span>
          ))}
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full">
        <style>{CSS}</style>
        <defs>
          {Object.entries(SYMBOL_META).map(([sym, { color }]) => (
            <radialGradient key={sym} id={`stg-glow-${sym}`}>
              <stop offset="0" stopColor={color} stopOpacity="0.95" />
              <stop offset="0.3" stopColor={color} stopOpacity="0.35" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </radialGradient>
          ))}
          <linearGradient id="stg-beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={theme.primary} stopOpacity="0" />
            <stop offset="1" stopColor={theme.primary} stopOpacity="0.55" />
          </linearGradient>
          <filter id="stg-blur">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* graticule + background stars */}
        <g stroke="#f5f0e6" strokeOpacity="0.04">
          {Array.from({ length: 13 }, (_, i) => (
            <line key={`v${i}`} x1={i * 80} y1="0" x2={i * 80} y2={H} />
          ))}
          {Array.from({ length: 9 }, (_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 80} x2={W} y2={i * 80} />
          ))}
        </g>
        {BG_STARS.map((st, i) => (
          <circle key={i} cx={st.x} cy={st.y} r={st.r} fill="#f5f0e6" className="stg-twinkle" style={{ '--d': `${st.d}s`, '--o': st.o }} />
        ))}

        {/* boulevards */}
        <g stroke="#f5f0e6" strokeOpacity="0.07" strokeWidth="1" fill="none">
          {[PLACES.maria, ...DISTRICTS.slice(1)].map((p, i) => (
            <line key={i} x1={FORT.x} y1={FORT.y} x2={p.x} y2={p.y} />
          ))}
        </g>

        {/* Bega canal */}
        <path d={BEGA} fill="none" stroke={theme.secondary} strokeOpacity="0.18" strokeWidth="10" filter="url(#stg-blur)" />
        <path d={BEGA} fill="none" stroke="#38bdf8" strokeOpacity="0.5" strokeWidth="1.5" className="stg-flow" />
        <text x="880" y="465" className="font-mono" fontSize="11" letterSpacing="4" fill="#38bdf8" fillOpacity="0.6">
          BEGA
        </text>

        {/* Cetate star fortress */}
        <path d={FORTRESS} fill={theme.primary} fillOpacity="0.035" stroke={theme.primary} strokeOpacity="0.4" strokeWidth="1.2" />
        <path d={FORTRESS} fill="none" stroke={theme.primary} strokeOpacity="0.12" strokeWidth="8" filter="url(#stg-blur)" />

        {/* district rings + labels */}
        {DISTRICTS.map((d) => {
          const lit = chapterId === 'multicultural_mosaic';
          return (
            <g key={d.id}>
              <motion.ellipse
                cx={d.x}
                cy={d.y}
                rx={110}
                ry={80}
                fill="none"
                stroke={theme.primary}
                strokeDasharray="2 8"
                animate={{ strokeOpacity: lit ? 0.45 : 0.08 }}
                transition={{ duration: 1.2 }}
              />
              <text x={d.lx} y={d.ly} textAnchor="middle" className="font-mono" fontSize="12" letterSpacing="5" fill="#f5f0e6" fillOpacity={lit ? 0.75 : 0.35}>
                {d.label.toUpperCase()}
              </text>
            </g>
          );
        })}

        {/* chapter routes: Piața Maria → centre (16 Dec), Fabric/Iosefin → Opera (20 Dec) */}
        <AnimatePresence>
          {chapterId === '1989_piata_maria' && (
            <motion.path
              key="r1"
              d={`M ${PLACES.maria.x} ${PLACES.maria.y} Q 400 360 ${PLACES.opera.x} ${PLACES.opera.y}`}
              fill="none"
              stroke={theme.primary}
              strokeWidth="2"
              className="stg-march"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2 }}
            />
          )}
          {chapterId === '1989_opera' &&
            [DISTRICTS[1], DISTRICTS[2], DISTRICTS[3]].map((d) => (
              <motion.path
                key={`r2-${d.id}`}
                d={`M ${d.x} ${d.y} Q ${(d.x + PLACES.opera.x) / 2} ${(d.y + PLACES.opera.y) / 2 - 40} ${PLACES.opera.x} ${PLACES.opera.y}`}
                fill="none"
                stroke={theme.primary}
                strokeWidth="2"
                className="stg-march"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2 }}
              />
            ))}
        </AnimatePresence>

        {/* landmarks */}
        {Object.entries(PLACES).map(([key, p]) => {
          const hot = (key === 'maria' && chapterId === '1989_piata_maria') || (key === 'opera' && chapterId === '1989_opera');
          return (
            <g key={key}>
              {hot && <circle cx={p.x} cy={p.y} r="16" fill="none" stroke={theme.primary} strokeWidth="1.5" className="stg-pulse" />}
              <rect x={p.x - 3} y={p.y - 3} width="6" height="6" transform={`rotate(45 ${p.x} ${p.y})`} fill={hot ? theme.primary : '#9ca3af'} fillOpacity={hot ? 1 : 0.6} />
              <text x={p.x + 10} y={p.y - 8} className="font-mono" fontSize={hot ? 13 : 10} fill={hot ? theme.primary : '#9ca3af'} fillOpacity={hot ? 1 : 0.6}>
                {p.label}
              </text>
            </g>
          );
        })}

        {/* constellation lines */}
        <g key={chapterId}>
          {lines.map((d, i) => (
            <motion.path
              key={i + d}
              d={d}
              fill="none"
              stroke={theme.glow}
              strokeOpacity="0.4"
              strokeWidth="1"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2.2, ease: 'easeOut', delay: 0.3 + i * 0.2 }}
            />
          ))}
        </g>

        {/* beam onto selected star */}
        {selected && pos[selected.id] && (
          <motion.polygon
            key={`beam-${selected.id}`}
            points={`${pos[selected.id].x - 60},0 ${pos[selected.id].x + 60},0 ${pos[selected.id].x + 8},${pos[selected.id].y} ${pos[selected.id].x - 8},${pos[selected.id].y}`}
            fill="url(#stg-beam)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ duration: 1 }}
          />
        )}

        {/* stars */}
        {memories.map((m) => {
          const p = pos[m.id];
          if (!p) return null;
          const inCh = m.chapter === chapterId;
          const sel = m.id === activeNodeId;
          const isNew = m.id === newestId;
          const color = SYMBOL_META[m.symbol]?.color || '#f59e0b';
          const tw = (hash(m.id) % 40) / 10 + 2;
          return (
            <motion.g
              key={m.id}
              initial={isNew ? { opacity: 0, y: -420 } : { opacity: 0 }}
              animate={{ opacity: inCh ? 1 : 0.22, y: 0 }}
              transition={isNew ? { type: 'spring', damping: 14, stiffness: 40 } : { duration: 1 }}
              style={{ cursor: 'pointer' }}
              onClick={() => onSelect(sel ? null : m.id)}
              onMouseEnter={() => setHoverId(m.id)}
              onMouseLeave={() => setHoverId((h) => (h === m.id ? null : h))}
            >
              <circle cx={p.x} cy={p.y} r="22" fill="transparent" />
              <circle cx={p.x} cy={p.y} r={sel ? 34 : inCh ? 18 : 9} fill={`url(#stg-glow-${m.symbol})`} className="stg-breathe" style={{ '--d': `${tw}s` }} />
              {inCh && (
                <g stroke={color} strokeOpacity="0.7" strokeWidth="0.8">
                  <line x1={p.x - (sel ? 22 : 10)} y1={p.y} x2={p.x + (sel ? 22 : 10)} y2={p.y} />
                  <line x1={p.x} y1={p.y - (sel ? 22 : 10)} x2={p.x} y2={p.y + (sel ? 22 : 10)} />
                </g>
              )}
              <circle cx={p.x} cy={p.y} r={sel ? 5 : inCh ? 3 : 1.8} fill="#fffaf0" />
              {sel && (
                <>
                  <circle cx={p.x} cy={p.y} r="14" fill="none" stroke={color} strokeWidth="1.5" className="stg-pulse" />
                  <circle cx={p.x} cy={p.y} r="26" fill="none" stroke={color} strokeOpacity="0.6" strokeDasharray="3 5" />
                </>
              )}
              {isNew && (
                <motion.circle
                  cx={p.x}
                  cy={p.y}
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  initial={{ r: 4, opacity: 1 }}
                  animate={{ r: 120, opacity: 0 }}
                  transition={{ duration: 2.4, delay: 1.2, repeat: 2, ease: 'easeOut' }}
                />
              )}
              {inCh && (
                <text x={p.x + 12} y={p.y + 16} className="font-mono" fontSize="10" fill="#f5f0e6" fillOpacity={sel ? 0.95 : 0.55}>
                  {m.author}
                  {!m.isSeed ? ' ✦' : ''}
                </text>
              )}
            </motion.g>
          );
        })}

        {/* hover tooltip */}
        {hover && pos[hover.id] && (
          <g pointerEvents="none">
            {(() => {
              const p = pos[hover.id];
              const title = tr(hover.title, lang, hover.originalLanguage) || hover.author;
              const label = title.length > 46 ? `${title.slice(0, 45)}…` : title;
              const w = Math.max(160, label.length * 8.2 + 28);
              const x = Math.min(Math.max(p.x - w / 2, 8), W - w - 8);
              const y = p.y - 70 < 8 ? p.y + 26 : p.y - 70;
              return (
                <>
                  <rect x={x} y={y} width={w} height="46" rx="10" fill="#12121a" fillOpacity="0.92" stroke={SYMBOL_META[hover.symbol]?.color} strokeOpacity="0.5" />
                  <text x={x + 14} y={y + 20} fontSize="15" fill="#f5f0e6" className="font-display">
                    {label}
                  </text>
                  <text x={x + 14} y={y + 36} fontSize="10" fill="#9ca3af" className="font-mono">
                    {hover.author} · {hover.year}
                  </text>
                </>
              );
            })()}
          </g>
        )}
      </svg>
      </div>

      <p
        className="pointer-events-none absolute bottom-0 left-0 z-10 font-mono text-[11px] uppercase tracking-[0.25em] text-mist/70"
        style={{ padding: '0 var(--stg-map-pad) calc(var(--stg-map-pad) * 0.75)' }}
      >
        ↳ {s('clickStar', lang)}
      </p>
    </div>
  );
}
