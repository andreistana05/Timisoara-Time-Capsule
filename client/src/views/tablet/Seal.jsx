/**
 * "The Seal" — Secession-inspired, high-contrast geometric marker.
 * Acts as the visual anchor the phone camera is pointed at.
 * The outer rings animate; the inner core stays static & high-contrast
 * so it can later be swapped for a real image-tracking target.
 */
export default function Seal({ color = '#f59e0b', accent = '#38bdf8', pulseKey }) {
  const petals = Array.from({ length: 12 }, (_, i) => i * 30);
  const ticks = Array.from({ length: 72 }, (_, i) => i * 5);

  return (
    <div className="relative aspect-square w-full">
      {/* glow */}
      <div
        key={pulseKey}
        className="absolute inset-[12%] rounded-full blur-3xl transition-colors duration-1000"
        style={{ background: color, opacity: 0.22, animation: 'seal-pulse 2.4s ease-out' }}
      />
      <svg viewBox="-200 -200 400 400" className="relative h-full w-full">
        <defs>
          <radialGradient id="seal-core" r="0.6">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="100%" stopColor="#f5f0e6" />
          </radialGradient>
        </defs>

        {/* outer tick ring — slow spin */}
        <g className="origin-center animate-spin-slower" style={{ transformBox: 'fill-box' }}>
          <circle r="192" fill="none" stroke={color} strokeOpacity="0.35" strokeWidth="1" />
          {ticks.map((a) => (
            <line
              key={a}
              x1="0"
              y1={-192}
              x2="0"
              y2={a % 30 === 0 ? -172 : -183}
              stroke={color}
              strokeWidth={a % 30 === 0 ? 2.5 : 1}
              transform={`rotate(${a})`}
            />
          ))}
        </g>

        {/* Secession whiplash petals — counter spin */}
        <g className="origin-center" style={{ transformBox: 'fill-box', animation: 'spin 60s linear infinite reverse' }}>
          {petals.map((a) => (
            <path
              key={a}
              d="M0,-160 C30,-130 30,-100 0,-80 C-30,-100 -30,-130 0,-160 Z"
              fill="none"
              stroke={accent}
              strokeOpacity="0.8"
              strokeWidth="1.5"
              transform={`rotate(${a})`}
            />
          ))}
          <circle r="150" fill="none" stroke={accent} strokeOpacity="0.25" strokeDasharray="2 6" />
        </g>

        {/* static high-contrast core (the actual marker) */}
        <g>
          <circle r="118" fill="#0a0a0f" stroke="#f5f0e6" strokeWidth="6" />
          <rect x="-70" y="-70" width="140" height="140" fill="none" stroke="#f5f0e6" strokeWidth="5" transform="rotate(45)" />
          <rect x="-58" y="-58" width="116" height="116" fill="none" stroke={color} strokeWidth="4" />
          <circle r="46" fill="url(#seal-core)" />
          <path d="M0,-38 L11,-11 L38,0 L11,11 L0,38 L-11,11 L-38,0 L-11,-11 Z" fill="#0a0a0f" />
          <circle r="7" fill={color} />
          {/* asymmetric orientation notches so a tracker knows "up" */}
          <rect x="-8" y="-112" width="16" height="22" fill="#f5f0e6" />
          <circle cx="78" cy="78" r="9" fill="#f5f0e6" />
        </g>
      </svg>
      <style>{`@keyframes seal-pulse { 0% { opacity: .7; transform: scale(.8) } 100% { opacity: .22; transform: scale(1) } }`}</style>
    </div>
  );
}
