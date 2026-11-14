/**
 * Crossfades plazas: the outgoing one fades while the incoming one builds up. Owner: Member 3.
 * `plaza=null` fades everything out. `mode` = 'realistic' (era-lit textured buildings) | 'hologram' (glowing shells).
 * Switching mode remounts the layer, so the new look builds up from the tablet again.
 *
 * Each layer is FIT TO CONTENT (fit.js): rotated so its long axis runs left↔right (Opera Square stays north-up),
 * centred on the pedestal and scaled so the buildings span ~90 % of it. `verticalBoost` stretches heights a bit
 * (realistic mode) so façades read at phone size.
 */
import { useCallback, useEffect, useState } from 'react';
import { OsmHologram } from './OsmHologram.jsx';
import { OsmRealistic } from './OsmRealistic.jsx';
import { plazaFit, partsCoverage, drawsBuilding } from './fit.js';

export const VERTICAL_BOOST = { realistic: 1.25, hologram: 1 };

function FitGroup({ plaza, boost, children }) {
  const f = plazaFit(plaza);
  return (
    <group scale={[f.scale, f.scale * boost, f.scale]}>
      <group position={[-f.cx, 0, -f.cz]}>
        <group rotation-y={f.yaw}>{children}</group>
      </group>
    </group>
  );
}

export function OsmPlazaStage({ plaza, theme, mode = 'realistic' }) {
  const [layers, setLayers] = useState(() => (plaza ? [{ plaza, leaving: false }] : []));

  useEffect(() => {
    setLayers((prev) => {
      const leavingOthers = prev.filter((l) => l.plaza.id !== plaza?.id).map((l) => (l.leaving ? l : { ...l, leaving: true }));
      return plaza ? [...leavingOthers, { plaza, leaving: false }] : leavingOthers;
    });
  }, [plaza]);

  const handleGone = useCallback((id) => setLayers((prev) => prev.filter((l) => !(l.leaving && l.plaza.id === id))), []);
  const Layer = mode === 'hologram' ? OsmHologram : OsmRealistic;
  const boost = VERTICAL_BOOST[mode] ?? 1;

  return (
    <group>
      {layers.map((l) => (
        <FitGroup key={`${mode}:${l.plaza.id}`} plaza={l.plaza} boost={boost}>
          <Layer plaza={l.plaza} theme={theme} leaving={l.leaving} onGone={handleGone} />
        </FitGroup>
      ))}
    </group>
  );
}

const extCache = new Map();
/**
 * Pedestal-local extents of a fitted plaza, for camera framing and the orb lift:
 *  halfW/halfD (x/z), top (tallest roof), ringTop (tallest roof under the orb ring, radius ≥ ORB_RING_MIN).
 */
export const ORB_RING_MIN = 1.2;
const TOWER_MAX_M2 = 250;
export function fittedExtents(plaza, mode = 'realistic') {
  const key = `${plaza.id}:${mode}`;
  if (extCache.get(key)?.plaza === plaza) return extCache.get(key).ext;
  const f = plazaFit(plaza);
  const boost = VERTICAL_BOOST[mode] ?? 1;
  const cov = partsCoverage(plaza);
  const c = Math.cos(f.yaw), s = Math.sin(f.yaw);
  // each real roof (thin spires/towers excluded: orbs glide past them) with its farthest radius from the centre
  const roofs = [];
  for (const b of plaza.buildings || []) {
    if (!drawsBuilding(b, cov) || !b.footprint) continue;
    if ((b.areaM2 || 0) < TOWER_MAX_M2) continue;
    const rMax = Math.max(...b.footprint.map(([x, z]) => Math.hypot((x * c + z * s - f.cx) * f.scale, (-x * s + z * c - f.cz) * f.scale)));
    roofs.push({ rMax, top: ((b.baseY || 0) + (b.height || 0)) * f.scale * boost });
  }
  /** Tallest roof reaching out to radius ≥ r (what an orb orbit of inner radius r has to clear). */
  const ringTopAt = (r) => roofs.reduce((m, x) => (x.rMax >= r && x.top > m ? x.top : m), 0);
  const ext = {
    id: f.id,
    halfW: (f.extX * f.scale) / 2,
    halfD: (f.extZ * f.scale) / 2,
    top: f.maxY * f.scale * boost,
    ringTop: ringTopAt(ORB_RING_MIN),
    ringTopAt,
  };
  extCache.set(key, { plaza, ext });
  return ext;
}
