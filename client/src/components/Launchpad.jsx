import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Tablet, Smartphone, MonitorPlay, ArrowUpRight } from 'lucide-react';
import { useSocket } from '../socket/useSocket.js';
import { ConnectionBadge } from './common.jsx';
import { CHAPTERS } from '@shared/events.js';
import { ui } from '@shared/i18n.js';

const SCREENS = [
  {
    to: '/tablet',
    Icon: Tablet,
    name: 'The Physical Pedestal',
    device: 'Tablet · lies flat on the table',
    desc: 'The Seal, chapter & language controls, and the "Ignite a Memory Spark" drawer.',
    accent: '#f59e0b',
  },
  {
    to: '/ar',
    Icon: Smartphone,
    name: 'The Holographic Lens',
    device: 'Phone · pointed at the tablet',
    desc: 'WebAR camera overlay with the 3D diorama and tappable memory orbs that speak.',
    accent: '#38bdf8',
  },
  {
    to: '/stage',
    Icon: MonitorPlay,
    name: 'The Urban Projection',
    device: 'Laptop / projector · faces the room',
    desc: 'Living archive, soundwave visualizer, spotlight panel and live celebrations.',
    accent: '#ef4444',
  },
];

export default function Launchpad() {
  const { connected, state } = useSocket();
  const lang = state?.language || 'en';
  const chapter = state ? CHAPTERS[state.activeChapter] : null;

  return (
    <div className="relative min-h-full overflow-hidden bg-obsidian px-5 py-10 sm:px-10">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-amber-gold/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 grain opacity-40" />

      <div className="relative mx-auto max-w-6xl">
        <header className="mb-12 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-cyan-holo/80">MuseumsQuartier · Timișoara</p>
            <h1 className="mt-2 font-display text-5xl font-semibold leading-none sm:text-7xl">
              <span className="holo-text">{ui('appName', 'en')}</span>
            </h1>
            <p className="mt-3 text-lg text-mist">{ui('tagline', 'en')} — a museum-in-a-box for three screens.</p>
          </div>
          <ConnectionBadge connected={connected} lang="en" />
        </header>

        <div className="grid gap-5 md:grid-cols-3">
          {SCREENS.map(({ to, Icon, name, device, desc, accent }, i) => (
            <motion.div
              key={to}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i, duration: 0.6, ease: 'easeOut' }}
            >
              <Link
                to={to}
                className="group relative flex h-full flex-col overflow-hidden rounded-3xl p-7 transition hover:-translate-y-1 glass"
                style={{ boxShadow: `inset 0 1px 0 ${accent}33` }}
              >
                <div
                  className="absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-20 blur-2xl transition group-hover:opacity-40"
                  style={{ background: accent }}
                />
                <div className="flex items-center justify-between">
                  <Icon size={40} style={{ color: accent }} strokeWidth={1.4} />
                  <ArrowUpRight className="text-mist transition group-hover:text-ivory" />
                </div>
                <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.25em] text-mist">{to}</p>
                <h2 className="mt-1 font-display text-3xl font-semibold">{name}</h2>
                <p className="mt-1 text-sm" style={{ color: accent }}>
                  {device}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-ivory/70">{desc}</p>
              </Link>
            </motion.div>
          ))}
        </div>

        <footer className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs text-mist">
          <span>
            Live chapter: <span className="text-ivory">{chapter ? chapter.title[lang] : '—'}</span>
          </span>
          <span>
            Language: <span className="text-ivory uppercase">{state?.language || '—'}</span>
          </span>
          <span>
            Memories in archive: <span className="text-ivory">{state?.memories.length ?? '—'}</span>
          </span>
        </footer>
      </div>
    </div>
  );
}
