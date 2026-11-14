/**
 * Viewport-aware sizing for /stage. Every size that must shrink on short or narrow
 * screens is a CSS variable on `.stg-root`, re-tuned by height tiers, so the whole
 * dashboard (header · tuner · main · archive) fits one screen at 100% zoom.
 *
 *   tall   ≥ 960px   (1920×1080, 1920×1200 fullscreen)
 *   normal 801–959px (1440×900, 1600×900)
 *   short  ≤ 800px   (1366×768 fullscreen and browser window, 1280×720)
 *   xshort ≤ 640px   (1280×600, laptops with big browser chrome)
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export const STAGE_LAYOUT_CSS = `
.stg-root {
  --stg-px: 2.5rem;
  --stg-gap: 1rem;
  --stg-header-pt: 1.5rem;
  --stg-h1: 1.875rem;
  --stg-tuner-pad: 1.25rem;
  --stg-tuner-gap: 1.5rem;
  --stg-tuner-l: clamp(11.5rem, 14vw, 14rem);
  --stg-tuner-r: clamp(19rem, 27vw, 28rem);
  --stg-year: 5.5rem;
  --stg-band-h: 4.5rem;
  --stg-scope-h: 3rem;
  --stg-card-pad: 1rem;
  --stg-card-title: 1.5rem;
  --stg-card-body: 0.9375rem;
  --stg-kicker: 0.875rem;
  --stg-h2: 3rem;
  --stg-panel-pad: 1.5rem;
  --stg-wave-h: 6rem;
  --stg-map-pad: 1.5rem;
  --stg-map-title: 1.5rem;
  --stg-arch-label-mb: 0.75rem;
  --stg-arch-pad: 1rem;
  --stg-arch-title: 1.125rem;
  --stg-arch-min: 15rem;
  --stg-footer-pb: 1.5rem;
}
@media (max-width: 1440px) {
  .stg-root { --stg-px: 1.5rem; --stg-tuner-gap: 1.25rem; }
}
@media (min-height: 960px) {
  .stg-root {
    --stg-gap: 1.5rem;
    --stg-header-pt: 1.75rem;
    --stg-year: 6rem;
    --stg-band-h: 5rem;
    --stg-scope-h: 3.5rem;
    --stg-h2: 3.75rem;
    --stg-wave-h: 8rem;
    --stg-footer-pb: 1.75rem;
  }
}
@media (max-height: 800px) {
  .stg-root {
    --stg-gap: 0.75rem;
    --stg-header-pt: 0.875rem;
    --stg-h1: 1.5rem;
    --stg-tuner-pad: 0.875rem;
    --stg-tuner-gap: 1rem;
    --stg-year: 4.25rem;
    --stg-band-h: 3.25rem;
    --stg-scope-h: 2.25rem;
    --stg-card-pad: 0.75rem;
    --stg-card-title: 1.25rem;
    --stg-card-body: 0.875rem;
    --stg-kicker: 0.75rem;
    --stg-h2: 2.5rem;
    --stg-panel-pad: 1rem;
    --stg-wave-h: 3.5rem;
    --stg-map-pad: 1rem;
    --stg-map-title: 1.25rem;
    --stg-arch-label-mb: 0.5rem;
    --stg-arch-pad: 0.75rem;
    --stg-arch-title: 1rem;
    --stg-footer-pb: 0.875rem;
  }
}
@media (max-height: 640px) {
  .stg-root {
    --stg-gap: 0.5rem;
    --stg-header-pt: 0.625rem;
    --stg-h1: 1.375rem;
    --stg-tuner-pad: 0.625rem;
    --stg-tuner-gap: 0.875rem;
    --stg-year: 3.5rem;
    --stg-band-h: 2.75rem;
    --stg-scope-h: 1.75rem;
    --stg-card-pad: 0.625rem;
    --stg-card-title: 1.125rem;
    --stg-card-body: 0.8125rem;
    --stg-h2: 2rem;
    --stg-panel-pad: 0.75rem;
    --stg-wave-h: 2.5rem;
    --stg-map-pad: 0.75rem;
    --stg-map-title: 1.125rem;
    --stg-arch-label-mb: 0.375rem;
    --stg-arch-pad: 0.625rem;
    --stg-arch-title: 0.9375rem;
    --stg-arch-min: 13.5rem;
    --stg-footer-pb: 0.625rem;
  }
}
`;

/**
 * Pick the first of `count` content variants (0 = richest) that fits its box.
 * The box (`ref`) must get its size from the layout, not from its content
 * (e.g. a flex-1/min-h-0 child), otherwise shrinking the content would shrink
 * the box and the measurement would never settle.
 * Re-fits from variant 0 when the box resizes, when `resetKey` changes and
 * once web fonts have loaded.
 */
export function useFitVariant(count, resetKey) {
  const ref = useRef(null);
  const [state, setState] = useState({ i: 0, key: resetKey });
  // content changed → start over from the richest variant (during render, no flash)
  if (state.key !== resetKey) setState({ i: 0, key: resetKey });
  const i = state.key === resetKey ? state.i : 0;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || i >= count - 1) return;
    if (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) {
      setState((st) => ({ ...st, i: st.i + 1 }));
    }
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let w = el.clientWidth;
    let h = el.clientHeight;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === w && el.clientHeight === h) return;
      w = el.clientWidth;
      h = el.clientHeight;
      setState((st) => ({ ...st, i: 0 }));
    });
    ro.observe(el);
    let alive = true;
    document.fonts?.ready.then(() => alive && setState((st) => ({ ...st, i: 0 })));
    return () => {
      alive = false;
      ro.disconnect();
    };
  }, []);

  return [ref, i];
}

/** Width of an element, tracked with a ResizeObserver (0 until mounted). */
export function useElementWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}
