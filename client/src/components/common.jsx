/**
 * Tiny shared UI primitives — FROZEN. Copy into your own view folder if you
 * want a variant, instead of editing these.
 */
import { Flame, Flower2, Music } from 'lucide-react';
import { ui } from '@shared/i18n.js';

export const SYMBOL_META = {
  candle: { Icon: Flame, color: '#f59e0b' },
  flower: { Icon: Flower2, color: '#f472b6' },
  musical_note: { Icon: Music, color: '#38bdf8' },
};

export function SymbolIcon({ symbol, size = 20, className = '', style }) {
  const meta = SYMBOL_META[symbol] || SYMBOL_META.candle;
  const { Icon } = meta;
  return <Icon size={size} className={className} style={{ color: meta.color, ...style }} />;
}

export function ConnectionBadge({ connected, lang = 'en', className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-widest glass ${className}`}
    >
      <span className="relative flex h-2 w-2">
        {connected && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-crimson'}`} />
      </span>
      {ui(connected ? 'connected' : 'offline', lang)}
    </span>
  );
}
