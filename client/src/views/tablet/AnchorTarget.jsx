/**
 * Static, high-contrast core of the Time Tuner — the original Secession Seal emblem
 * (dark disc, diamond, chapter-coloured square, ivory star disc). Never rotates; the
 * notch at the top and the dot at the lower right are asymmetric so the AR lens
 * always knows which way is up while the outer ring spins.
 */
import { memo } from 'react';
import { motion } from 'framer-motion';

const S = 1.2; // original core was r=118 in a ±232 box; scaled to fill the tuner's static core

function AnchorTarget({ accent = '#ef4444' }) {
  return (
    <g pointerEvents="none" aria-hidden="true" transform={`scale(${S})`}>
      <defs>
        <radialGradient id="seal-core" r="0.6">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="100%" stopColor="#f5f0e6" />
        </radialGradient>
      </defs>
      <circle r="118" fill="#0a0a0f" stroke="#f5f0e6" strokeWidth="6" />
      <rect x="-70" y="-70" width="140" height="140" fill="none" stroke="#f5f0e6" strokeWidth="5" transform="rotate(45)" />
      <motion.rect x="-58" y="-58" width="116" height="116" fill="none" strokeWidth="4" initial={false} animate={{ stroke: accent }} transition={{ duration: 1.2 }} />
      <circle r="46" fill="url(#seal-core)" />
      <path d="M0,-38 L11,-11 L38,0 L11,11 L0,38 L-11,11 L-38,0 L-11,-11 Z" fill="#0a0a0f" />
      <motion.circle r="7" initial={false} animate={{ fill: accent }} transition={{ duration: 1.2 }} />
      <rect x="-8" y="-112" width="16" height="22" fill="#f5f0e6" />
      <circle cx="78" cy="78" r="9" fill="#f5f0e6" />
    </g>
  );
}

export default memo(AnchorTarget);
