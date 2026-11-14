/**
 * Compact 5-language picker: one pill showing the current language; tap to open the
 * list. Switching here re-renders every screen.
 */
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { LANGUAGES } from '@shared/events.js';
import { ui } from '@shared/i18n.js';
import { haptic } from './strings.js';

export default function LanguageSwitcher({ lang, onChange, accent }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative z-40">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ui('language', lang)}
        onClick={() => {
          haptic();
          setOpen((o) => !o);
        }}
        className="glass flex min-h-11 items-center gap-2 rounded-2xl px-4 py-1.5 text-ivory"
        style={{ boxShadow: open ? `0 0 24px ${accent}55` : undefined }}
      >
        <span className="font-mono text-[10px] tracking-[0.3em] opacity-60">{current.short}</span>
        <span className="font-sans text-sm font-semibold sm:text-base">{current.label}</span>
        <ChevronLeft size={16} className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label={ui('language', lang)}
            initial={{ opacity: 0, x: 10, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10, scale: 0.97 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute right-full top-0 mr-2 flex gap-1 rounded-2xl border border-white/10 bg-obsidian-2 p-1 shadow-2xl"
          >
            {LANGUAGES.map((l) => {
              const active = l.code === lang;
              return (
                <li key={l.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    lang={l.code}
                    onClick={() => {
                      setOpen(false);
                      if (active) return;
                      haptic();
                      onChange(l.code);
                    }}
                    className="flex min-h-11 min-w-11 flex-col items-center justify-center rounded-xl px-3 py-1.5 transition-colors active:bg-white/10"
                    style={{ backgroundColor: active ? `${accent}22` : undefined }}
                  >
                    <span className={`whitespace-nowrap font-sans text-sm leading-none ${active ? 'font-semibold text-ivory' : 'text-ivory/80'}`}>{l.label}</span>
                    <span className="mt-1 font-mono text-[9px] tracking-[0.3em]" style={{ color: active ? accent : '#9ca3af' }}>{l.short}</span>
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
