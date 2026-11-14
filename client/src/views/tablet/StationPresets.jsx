/**
 * Car-radio style preset buttons for the 4 Historical Tuning Stations. Tapping one sweeps
 * the dial there (through the static, so every screen hears the journey).
 */
import { motion } from 'framer-motion';
import { TIMELINE_ERAS } from '@shared/events.js';
import { LOCK_GREEN, dial, useTimeDial } from './timeDial.js';
import { STATION_SHORT, t } from './strings.js';

export default function StationPresets({ lang, layout = 'grid' }) {
  const lockedId = useTimeDial((s) => (s.inStation ? s.nearestStation : ''));
  return (
    <div className={`grid gap-2 ${layout === 'grid' ? 'grid-cols-2' : 'grid-cols-4'}`} role="group" aria-label={t('stations', lang)}>
      {TIMELINE_ERAS.map((era) => {
        const active = lockedId === era.id;
        const { primary } = era.theme;
        return (
          <motion.button
            key={era.id}
            type="button"
            aria-pressed={active}
            whileTap={{ scale: 0.96 }}
            onClick={() => dial.tuneToStation(era.id)}
            className="relative flex min-h-14 flex-col justify-center overflow-hidden rounded-2xl border px-3 py-2 text-left transition-[border-color,background-color,box-shadow] duration-700"
            style={{
              borderColor: active ? `${primary}cc` : 'rgba(245,240,230,.08)',
              backgroundColor: active ? `${primary}1a` : 'rgba(18,18,26,.7)',
              boxShadow: active ? `0 0 32px ${primary}40, inset 0 0 24px ${primary}1f` : 'inset 0 1px 0 rgba(255,255,255,.04)',
            }}
          >
            <span className="flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full transition-[background-color,box-shadow] duration-500"
                style={{ backgroundColor: active ? LOCK_GREEN : `${primary}55`, boxShadow: active ? `0 0 10px ${LOCK_GREEN}` : 'none' }}
              />
              <span className="font-mono text-xl font-semibold leading-none tabular-nums sm:text-2xl" style={{ color: primary }}>
                {era.year}
              </span>
            </span>
            <span className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.2em] text-mist">{STATION_SHORT[era.id][lang]}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
