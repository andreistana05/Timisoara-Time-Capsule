/**
 * Tactile chapter selector cards. Each card carries a miniature of the
 * motif the Seal will morph into, so visitors can "see" the chapter first.
 */
import { motion } from 'framer-motion';
import { CHAPTERS, CHAPTER_IDS } from '@shared/events.js';
import { ui } from '@shared/i18n.js';
import { MOTIFS, N } from './sealGeometry.js';
import { ROMAN, haptic } from './strings.js';

function ChapterGlyph({ id, color, accent }) {
  return (
    <svg viewBox="-200 -200 400 400" className="h-full w-full" aria-hidden="true">
      {Array.from({ length: N }, (_, i) => (
        <path
          key={i}
          d={MOTIFS[id](i)}
          transform={`rotate(${(i * 360) / N})`}
          fill={accent}
          fillOpacity={id === '1989_piata_maria' ? 0 : 0.25}
          stroke={i % 3 === 0 ? accent : color}
          strokeWidth={id === '1989_piata_maria' ? 8 : 5}
        />
      ))}
      <circle r="112" fill="#0a0a0f" stroke="#f5f0e6" strokeWidth="10" />
      <rect x="-56" y="-56" width="112" height="112" fill="none" stroke={color} strokeWidth="10" transform="rotate(45)" />
    </svg>
  );
}

export default function ChapterCards({ lang, activeId, onChange, counts, layout = 'column' }) {
  return (
    <div
      className={layout === 'column' ? 'flex flex-col gap-3' : 'grid grid-cols-3 gap-2 sm:gap-3'}
      role="radiogroup"
      aria-label={ui('chapter', lang)}
    >
      {CHAPTER_IDS.map((id) => {
        const c = CHAPTERS[id];
        const active = id === activeId;
        const { primary, secondary } = c.theme;
        return (
          <motion.button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              if (active) return;
              haptic([8, 40, 8]);
              onChange(id);
            }}
            className="group relative flex min-h-[88px] items-center gap-3 overflow-hidden rounded-3xl border p-3 text-left transition-[border-color,box-shadow,background-color] duration-700 sm:gap-4 sm:p-4"
            style={{
              borderColor: active ? `${primary}cc` : 'rgba(245,240,230,.08)',
              backgroundColor: active ? `${primary}14` : 'rgba(18,18,26,.7)',
              boxShadow: active ? `0 0 48px ${primary}40, inset 0 0 36px ${primary}1f` : 'inset 0 1px 0 rgba(255,255,255,.04)',
            }}
          >
            {/* glyph */}
            <motion.div
              className={`shrink-0 ${layout === 'column' ? 'h-16 w-16' : 'hidden h-12 w-12 sm:block'}`}
              animate={{ rotate: active ? 360 : 0, opacity: active ? 1 : 0.55 }}
              transition={{ rotate: { duration: 1.4, ease: [0.65, 0, 0.35, 1] }, opacity: { duration: 0.6 } }}
            >
              <ChapterGlyph id={id} color={primary} accent={secondary} />
            </motion.div>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-semibold leading-none" style={{ color: primary }}>
                  {ROMAN[c.order]}
                </span>
                <span className="truncate font-mono text-[10px] uppercase tracking-[0.25em] text-mist">{c.dateLabel[lang]}</span>
              </div>
              <span className="mt-1 block font-display text-lg font-semibold leading-tight text-ivory sm:text-xl">{c.title[lang]}</span>
              <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-mist/80">
                {c.place} · {counts[id] ?? 0} ✦
              </span>
            </div>

            {active && (
              <motion.span
                layoutId={`chapter-bar-${layout}`}
                className={layout === 'column' ? 'absolute inset-y-4 left-0 w-1 rounded-r-full' : 'absolute inset-x-4 bottom-0 h-1 rounded-t-full'}
                style={{ background: `linear-gradient(${layout === 'column' ? '180deg' : '90deg'}, ${primary}, ${secondary})` }}
                transition={{ type: 'spring', damping: 30, stiffness: 260 }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
