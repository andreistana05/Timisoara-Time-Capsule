/**
 * 5-language switcher with native names. Switching here re-renders every screen.
 */
import { motion } from 'framer-motion';
import { LANGUAGES } from '@shared/events.js';
import { ui } from '@shared/i18n.js';
import { haptic } from './strings.js';

export default function LanguageSwitcher({ lang, onChange, accent }) {
  return (
    <div className="flex flex-wrap rounded-2xl p-1 glass" role="radiogroup" aria-label={ui('language', lang)}>
      {LANGUAGES.map((l) => {
        const active = l.code === lang;
        return (
          <button
            key={l.code}
            type="button"
            role="radio"
            aria-checked={active}
            lang={l.code}
            onClick={() => {
              if (active) return;
              haptic();
              onChange(l.code);
            }}
            className={`relative flex min-h-11 min-w-11 flex-col items-center justify-center rounded-xl px-3 py-1.5 transition-colors duration-500 sm:px-4 ${
              active ? 'text-obsidian' : 'text-mist active:text-ivory'
            }`}
          >
            {active && (
              <motion.span
                layoutId="tablet-lang-pill"
                className="absolute inset-0 rounded-xl"
                style={{ background: `linear-gradient(135deg, #f5f0e6, ${accent}55)`, boxShadow: `0 0 24px ${accent}55` }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              />
            )}
            <span className="relative font-sans text-sm font-semibold leading-none sm:text-base">{l.label}</span>
            <span className="relative mt-1 font-mono text-[9px] tracking-[0.3em] opacity-60">{l.short}</span>
          </button>
        );
      })}
    </div>
  );
}
