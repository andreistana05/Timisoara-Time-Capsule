/**
 * The rotating tuning ring of the Time Tuner + the fixed index at 6 o'clock.
 *
 * Everything on the ring is drawn once (memoised) in "ring space"; only the wrapping
 * <g transform="rotate(…)"> changes per frame. Elements are designed at 6 o'clock and
 * carried to their timeline position with ringRotation(t), so their tops always face the
 * centre — upright at the index, readable from across the table on the far side.
 */
import { memo, useRef } from 'react';
import { TIMELINE, TIMELINE_ERAS, TIMELINE_ERA_BY_ID, progressFromYear } from '@shared/events.js';
import { DIAL, f, ringPoint, ringRotation } from './sealGeometry.js';
import { LOCK_GREEN, prefersReducedMotion, useDialFrame, useTimeDial } from './timeDial.js';

const { ringIn, ringOut, label: LABEL_R } = DIAL;
const MID = (ringIn + ringOut) / 2;
const YEARS = Array.from({ length: TIMELINE.endYear - TIMELINE.startYear + 1 }, (_, i) => TIMELINE.startYear + i);
const STOP_T = 0.996; // end-stop pin inside the 2026 plateau, just before the 1900 seam

const segment = (t, r0, r1) => {
  const [x0, y0] = ringPoint(r0, t);
  const [x1, y1] = ringPoint(r1, t);
  return `M${f(x0)},${f(y0)}L${f(x1)},${f(y1)}`;
};
const ticks = (years, r0, r1) => years.map((y) => segment(progressFromYear(y), r0, r1)).join('');

/** Arc along the ring from t0 to t1 (t grows counter-clockwise → sweep-flag 0). */
const arc = (r, t0, t1) => {
  const [x0, y0] = ringPoint(r, t0);
  const [x1, y1] = ringPoint(r, t1);
  return `M${f(x0)},${f(y0)}A${r},${r} 0 ${t1 - t0 > 0.5 ? 1 : 0} 0 ${f(x1)},${f(y1)}`;
};

const MINOR = ticks(YEARS.filter((y) => y % 5), 289, 297);
const LUSTRUM = ticks(YEARS.filter((y) => y % 5 === 0 && y % 10), 284, 297);
const DECADE = ticks(YEARS.filter((y) => y % 10 === 0), 278, 298);
const KNURL = Array.from({ length: 240 }, (_, i) => segment(i / 240, ringOut + 1, ringOut + 6)).join('');
// Decade numerals, except where a station numeral already sits.
const DECADE_LABELS = YEARS.filter((y) => y % 10 === 0)
  .map((y) => ({ y, t: progressFromYear(y) }))
  .filter(({ t }) => TIMELINE_ERAS.every((e) => Math.abs(e.t - t) > 0.022));

/** Static ring artwork (never re-renders). */
const RingScale = memo(function RingScale() {
  return (
    <g>
      <defs>
        <radialGradient id="tt-ring-metal" gradientUnits="userSpaceOnUse" cx="0" cy="0" r={ringOut}>
          <stop offset={ringIn / ringOut} stopColor="#0b0b12" />
          <stop offset="0.9" stopColor="#171723" />
          <stop offset="0.975" stopColor="#262634" />
          <stop offset="1" stopColor="#0d0d15" />
        </radialGradient>
      </defs>

      {/* ring body + rims + knurled edge */}
      <circle r={MID} fill="none" stroke="url(#tt-ring-metal)" strokeWidth={ringOut - ringIn} />
      <circle r={ringOut} fill="none" stroke="#f5f0e6" strokeOpacity={0.32} strokeWidth={1.2} />
      <circle r={ringIn} fill="none" stroke="#f5f0e6" strokeOpacity={0.14} strokeWidth={1} />
      <path d={KNURL} stroke="#f5f0e6" strokeOpacity={0.16} strokeWidth={1} />

      {/* era bands: where the static clears */}
      {TIMELINE_ERAS.map((e) => {
        const d = arc(ringIn + 4, Math.max(0, e.t - e.halfWidth), Math.min(1, e.t + e.halfWidth));
        return (
          <g key={e.id} fill="none" strokeLinecap="round">
            <path d={d} stroke={e.theme.primary} strokeWidth={10} strokeOpacity={0.14} />
            <path d={d} stroke={e.theme.primary} strokeWidth={3.5} strokeOpacity={0.6} />
          </g>
        );
      })}

      {/* the scale: one tick per year */}
      <path d={MINOR} stroke="#f5f0e6" strokeOpacity={0.3} strokeWidth={1} />
      <path d={LUSTRUM} stroke="#f5f0e6" strokeOpacity={0.5} strokeWidth={1.4} />
      <path d={DECADE} stroke="#f5f0e6" strokeOpacity={0.85} strokeWidth={2} />
      {DECADE_LABELS.map(({ y, t }) => (
        <text
          key={y}
          x={y === TIMELINE.startYear ? 4 : 0}
          y={LABEL_R}
          transform={`rotate(${f(ringRotation(t))})`}
          textAnchor={y === TIMELINE.startYear ? 'start' : 'middle'}
          dominantBaseline="central"
          className="font-mono"
          fontSize={12.5}
          letterSpacing={0.5}
          fill="#f5f0e6"
          fillOpacity={0.55}
        >
          {y}
        </text>
      ))}

      {/* end stop between 2026 and 1900 */}
      <path d={arc(MID, 0.982, 0.999)} stroke="#ef4444" strokeOpacity={0.14} strokeWidth={ringOut - ringIn - 6} fill="none" />
      <path d={segment(STOP_T, ringIn + 2, ringOut - 2)} stroke="#ef4444" strokeOpacity={0.85} strokeWidth={2.4} strokeLinecap="round" />

      {/* station notches (tappable) */}
      {TIMELINE_ERAS.map((e) => (
        <g key={e.id} transform={`rotate(${f(ringRotation(e.t))})`} data-station={e.id} className="cursor-pointer">
          <line x1={0} y1={276} x2={0} y2={ringOut} stroke={e.theme.primary} strokeWidth={12} strokeOpacity={0.2} strokeLinecap="round" />
          <line x1={0} y1={276} x2={0} y2={ringOut} stroke={e.theme.primary} strokeWidth={3.2} strokeLinecap="round" />
          <path d={`M-7,${ringOut + 9} L7,${ringOut + 9} L0,${ringOut - 2} Z`} fill={e.theme.primary} />
          <circle cy={ringIn + 4} r={3.2} fill={e.theme.glow} />
          <text
            y={LABEL_R - 1}
            textAnchor="middle"
            dominantBaseline="central"
            className="font-mono"
            fontSize={15}
            fontWeight={700}
            letterSpacing={0.5}
            fill={e.theme.primary}
          >
            {e.year}
          </text>
          {/* generous hit target, ≥ 44 px on a tablet */}
          <circle cy={MID} r={26} fill="transparent" />
        </g>
      ))}
    </g>
  );
});

/** Glow on the station whose band the index is in — brightness follows the signal. */
const ActiveNotch = memo(function ActiveNotch() {
  const id = useTimeDial((s) => (s.stationProximity > 0 ? s.nearestStation : ''));
  const ref = useRef(null);
  useDialFrame((s) => {
    if (ref.current) ref.current.style.opacity = String(0.15 + 0.85 * s.stationProximity);
  });
  const era = id ? TIMELINE_ERA_BY_ID[id] : null;
  if (!era) return null;
  return (
    <g ref={ref} transform={`rotate(${f(ringRotation(era.t))})`} pointerEvents="none" style={{ opacity: 0 }}>
      <circle cy={286} r={20} fill={era.theme.glow} fillOpacity={0.28} filter="url(#seal-glow)" />
      <line x1={0} y1={274} x2={0} y2={ringOut + 2} stroke="#fff" strokeWidth={2} strokeLinecap="round" />
    </g>
  );
});

/** The rotating ring. Re-renders per frame, but only its transform changes. */
export default function DialRing() {
  const t = useTimeDial((s) => s.t);
  return (
    <g transform={`rotate(${(t * 360).toFixed(2)})`}>
      <RingScale />
      <ActiveNotch />
    </g>
  );
}

// ─── fixed index (6 o'clock) ────────────────────────────────────────────
const polar = (r, deg) => {
  const a = (deg * Math.PI) / 180;
  return `${f(r * Math.sin(a))},${f(-r * Math.cos(a))}`;
};
const WINDOW = `M${polar(ringOut + 4, 167)} A${ringOut + 4},${ringOut + 4} 0 0 1 ${polar(ringOut + 4, 193)} L${polar(ringIn - 2, 193)} A${ringIn - 2},${ringIn - 2} 0 0 0 ${polar(ringIn - 2, 167)} Z`;

/** Needle + glass window. Green and steady on a station; flickers with static between them. */
export const DialIndex = memo(function DialIndex({ accent }) {
  const locked = useTimeDial((s) => s.inStation);
  const needle = useRef(null);
  const reduce = prefersReducedMotion();
  useDialFrame((s, now) => {
    const el = needle.current;
    if (!el) return;
    if (s.inStation || reduce) {
      el.style.opacity = '1';
      return;
    }
    // ~20 Hz shimmer, deeper the further from a clean frequency
    const k = Math.floor(now / 50);
    const noise = Math.abs(Math.sin(k * 12.9898) * 43758.5453) % 1;
    el.style.opacity = String(1 - (1 - s.stationProximity) * 0.55 * noise);
  });
  const color = locked ? LOCK_GREEN : accent;
  return (
    <g pointerEvents="none">
      <path d={WINDOW} fill="#f5f0e6" fillOpacity={0.05} stroke="#f5f0e6" strokeOpacity={0.22} strokeWidth={1} />
      <g ref={needle}>
        <path d={`M0,${ringIn - 2} L0,${ringIn + 6} M0,276 L0,${ringOut + 2}`} stroke={color} strokeWidth={9} strokeOpacity={0.28} strokeLinecap="round" />
        <path d={`M0,${ringIn - 2} L0,${ringIn + 6} M0,276 L0,${ringOut + 2}`} stroke={color} strokeWidth={2.6} strokeLinecap="round" />
        <path d={`M0,${ringOut + 4} L-11,${ringOut + 18} L11,${ringOut + 18} Z`} fill={color} filter={locked ? 'url(#seal-glow)' : undefined} />
      </g>
    </g>
  );
});
