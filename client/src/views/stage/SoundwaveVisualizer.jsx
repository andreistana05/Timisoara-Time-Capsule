import { useEffect, useRef } from 'react';

/**
 * Layered generative soundwave. Reacts to the AnalyserNode when audio is on,
 * otherwise breathes on its own. `burst` (a changing number) adds a spike.
 */
export default function SoundwaveVisualizer({ analyser, colors, burst = 0, className = '' }) {
  const canvasRef = useRef(null);
  const colorsRef = useRef(colors);
  const burstRef = useRef(0);
  colorsRef.current = colors;

  useEffect(() => {
    if (burst) burstRef.current = 1;
  }, [burst]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let raf;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const freq = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    const time = analyser ? new Uint8Array(analyser.fftSize) : null;

    const draw = (ms) => {
      const t = ms / 1000;
      ctx.clearRect(0, 0, w, h);
      let level = 0.25 + Math.sin(t * 0.7) * 0.08;
      if (analyser) {
        analyser.getByteFrequencyData(freq);
        analyser.getByteTimeDomainData(time);
        let sum = 0;
        for (let i = 0; i < 64; i++) sum += freq[i];
        level = 0.15 + (sum / (64 * 255)) * 1.6;
      }
      burstRef.current *= 0.97;
      level += burstRef.current * 0.9;

      const [c1, c2, c3] = colorsRef.current;
      const layers = [
        { color: c1, amp: 0.32, f: 1.4, speed: 0.9, width: 2.5, alpha: 0.95 },
        { color: c2, amp: 0.22, f: 2.3, speed: -1.3, width: 1.5, alpha: 0.7 },
        { color: c3, amp: 0.15, f: 3.7, speed: 1.9, width: 1, alpha: 0.55 },
        { color: c1, amp: 0.1, f: 5.1, speed: -2.4, width: 1, alpha: 0.35 },
      ];
      const mid = h / 2;
      ctx.globalCompositeOperation = 'lighter';
      layers.forEach((L, li) => {
        ctx.beginPath();
        ctx.lineWidth = L.width;
        ctx.strokeStyle = L.color;
        ctx.globalAlpha = L.alpha;
        ctx.shadowColor = L.color;
        ctx.shadowBlur = 18;
        const steps = Math.max(80, Math.floor(w / 4));
        for (let i = 0; i <= steps; i++) {
          const x = (i / steps) * w;
          const u = i / steps;
          const envelope = Math.sin(Math.PI * u) ** 1.5; // pinch edges
          let y = Math.sin(u * Math.PI * 2 * L.f + t * L.speed + li) * L.amp * h * level * envelope;
          if (time && li === 0) y += ((time[Math.floor(u * (time.length - 1))] - 128) / 128) * h * 0.35 * envelope;
          i === 0 ? ctx.moveTo(x, mid + y) : ctx.lineTo(x, mid + y);
        }
        ctx.stroke();
      });
      // frequency bars along the bottom
      if (freq) {
        ctx.globalAlpha = 0.25;
        ctx.shadowBlur = 0;
        ctx.fillStyle = c2;
        const bars = 96;
        const bw = w / bars;
        for (let i = 0; i < bars; i++) {
          const v = freq[Math.floor((i / bars) * 300)] / 255;
          ctx.fillRect(i * bw, h - v * h * 0.4, bw * 0.6, v * h * 0.4);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [analyser]);

  return <canvas ref={canvasRef} className={`h-full w-full ${className}`} />;
}
