/**
 * The authentic plaza as a hologram: translucent additive shells, bright crease edges, blueprint
 * footprints, glowing heroes (Opera, cathedrals, Secession palaces), a scan-line build-up on arrival
 * and a crossfade between plazas. Owner: Member 3.
 *
 * <OsmPlazaStage plaza theme scale />  — keeps the outgoing plaza fading while the new one builds up.
 * All meshes/lines have raycast disabled so Memory Orbs stay tappable.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { sharedTime, makeBeamMaterial, useShader } from '../materials.js';
import { buildPlazaGeometry, disposePlazaGeometry } from './buildGeometry.js';

const REVEAL_S = 1.4;
const FADE_S = 0.8;
const AMBER = '#f59e0b';
const IVORY = '#f5f0e6';
const noRaycast = () => null;

/* ───────────── one shader for fills and lines ───────────── */
const vert = /* glsl */ `
  varying float vY;
  void main() {
    vY = position.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const frag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uScan;
  uniform float uPulse;
  uniform float uTime;
  uniform float uReveal;
  uniform float uBand;
  uniform float uFade;
  varying float vY;
  void main() {
    if (vY > uReveal) discard;
    float scan = mix(1.0, 0.72 + 0.28 * sin(vY * 150.0 - uTime * 4.0), uScan);
    float pulse = 1.0 + uPulse * 0.35 * sin(uTime * 2.2);
    float front = smoothstep(0.07, 0.0, uReveal - vY) * uBand;      // bright build-up front
    float a = (uOpacity * scan * pulse + front * 0.75) * uFade;
    gl_FragColor = vec4(mix(uColor, vec3(1.0), front * 0.65), a);
  }
`;

function makeHoloMaterial(shared, { color, opacity, scan = 1, pulse = 0 }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uScan: { value: scan },
      uPulse: { value: pulse },
      uTime: sharedTime,
      uReveal: shared.uReveal,
      uBand: shared.uBand,
      uFade: shared.uFade,
    },
    vertexShader: vert,
    fragmentShader: frag,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

/* palette per role; colours come from the active chapter theme */
const ROLES = (theme) => ({
  fill: { color: theme.primary, opacity: 0.07 },
  fillDim: { color: theme.primary, opacity: 0.035 },
  fillHero: { color: theme.glow || AMBER, opacity: 0.12, pulse: 1 },
  roof: { color: theme.primary, opacity: 0.1 },
  roofHero: { color: theme.glow || AMBER, opacity: 0.16, pulse: 1 },
  edge: { color: theme.glow || theme.primary, opacity: 0.42, scan: 0.4 },
  edgeHero: { color: AMBER, opacity: 0.8, scan: 0.2, pulse: 1 },
  footprint: { color: theme.primary, opacity: 0.35, scan: 0 },
  path: { color: IVORY, opacity: 0.16, scan: 0 },
  track: { color: theme.secondary || theme.primary, opacity: 0.85, scan: 0 },
  ground: { color: theme.primary, opacity: 0.06, scan: 0 },
  groundEdge: { color: theme.glow || theme.primary, opacity: 0.6, scan: 0 },
  crowd: { color: AMBER, opacity: 0.09, scan: 0, pulse: 1 },
  pillar: { color: theme.glow || theme.primary, opacity: 0.5, scan: 0 },
  pillarHero: { color: AMBER, opacity: 0.9, scan: 0, pulse: 1 },
});

export function OsmHologram({ plaza, theme, leaving = false, onGone }) {
  const geo = useMemo(() => buildPlazaGeometry(plaza), [plaza]);
  useEffect(() => () => disposePlazaGeometry(geo), [geo]);

  // uniforms shared by every material of this plaza (reveal / fade drive them all at once)
  const shared = useMemo(() => ({ uReveal: { value: -0.01 }, uBand: { value: 1 }, uFade: { value: 1 } }), []);
  const mats = useMemo(() => {
    const r = ROLES(theme);
    return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, makeHoloMaterial(shared, v)]));
  }, [shared]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  // recolour in place when the chapter theme changes
  useEffect(() => {
    const r = ROLES(theme);
    for (const [k, m] of Object.entries(mats)) m.uniforms.uColor.value.set(r[k].color);
  }, [theme, mats]);

  const beam = useShader(makeBeamMaterial, AMBER, 0.55);
  const scanRing = useRef();
  const anim = useRef({ t0: null, fadeFrom: null, gone: false });

  useFrame(({ clock }) => {
    const a = anim.current;
    const now = clock.elapsedTime;
    if (a.t0 === null) a.t0 = now;
    const k = Math.min(1, (now - a.t0) / REVEAL_S);
    const e = 1 - Math.pow(1 - k, 3);
    shared.uReveal.value = -0.01 + e * (geo.maxY + 0.06);
    shared.uBand.value = 1 - k;
    if (scanRing.current) {
      scanRing.current.visible = k < 1 && !leaving;
      scanRing.current.position.y = shared.uReveal.value;
      scanRing.current.material.opacity = (1 - k) * 0.8;
    }
    // fade out when leaving, fade back in if re-selected mid-fade
    if (leaving) {
      if (a.fadeFrom === null) a.fadeFrom = now;
      shared.uFade.value = Math.max(0, 1 - (now - a.fadeFrom) / FADE_S);
      beam.uniforms.uIntensity.value = 0.55 * shared.uFade.value;
      if (shared.uFade.value === 0 && !a.gone) {
        a.gone = true;
        onGone?.(plaza.id);
      }
    } else {
      a.fadeFrom = null;
      a.gone = false;
      shared.uFade.value = Math.min(1, shared.uFade.value + 0.05);
      beam.uniforms.uIntensity.value = 0.55 * e;
    }
  });

  const M = (g, m, key) => g && <mesh key={key} geometry={g} material={m} raycast={noRaycast} frustumCulled={false} />;
  const L = (g, m, key) => g && <lineSegments key={key} geometry={g} material={m} raycast={noRaycast} frustumCulled={false} />;

  return (
    <group>
      {M(geo.ground, mats.ground, 'ground')}
      {L(geo.groundEdge, mats.groundEdge, 'groundEdge')}
      {M(geo.crowd, mats.crowd, 'crowd')}
      {L(geo.footprints, mats.footprint, 'footprints')}
      {L(geo.paths, mats.path, 'paths')}
      {L(geo.tracks, mats.track, 'tracks')}
      {M(geo.fills.regular, mats.fill, 'fill')}
      {M(geo.fills.dim, mats.fillDim, 'fillDim')}
      {M(geo.fills.hero, mats.fillHero, 'fillHero')}
      {M(geo.roofs.regular, mats.roof, 'roof')}
      {M(geo.roofs.hero, mats.roofHero, 'roofHero')}
      {L(geo.edges.regular, mats.edge, 'edge')}
      {L(geo.edges.hero, mats.edgeHero, 'edgeHero')}
      {M(geo.pillars.regular, mats.pillar, 'pillar')}
      {M(geo.pillars.hero, mats.pillarHero, 'pillarHero')}

      {geo.balcony && (
        // 20 Dec 1989: Timișoara declared free from the Opera balcony — a light column rises from it
        <group position={geo.balcony.position}>
          <mesh material={mats.pillarHero} raycast={noRaycast}>
            <boxGeometry args={[Math.max(0.05, geo.balcony.widthUnits), 0.012, 0.03]} />
          </mesh>
          <mesh position-y={0.45} material={beam} raycast={noRaycast}>
            <cylinderGeometry args={[0.07, 0.035, 0.9, 24, 1, true]} />
          </mesh>
        </group>
      )}

      <mesh ref={scanRing} rotation-x={-Math.PI / 2} raycast={noRaycast}>
        <ringGeometry args={[1.9, 2.25, 96]} />
        <meshBasicMaterial color={theme.glow || theme.primary} transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Crossfades plazas: the outgoing one fades while the incoming one builds up. `plaza=null` fades everything out. */
export function OsmPlazaStage({ plaza, theme, scale = 0.68 }) {
  const [layers, setLayers] = useState(() => (plaza ? [{ plaza, leaving: false }] : []));

  useEffect(() => {
    setLayers((prev) => {
      const leavingOthers = prev.filter((l) => l.plaza.id !== plaza?.id).map((l) => (l.leaving ? l : { ...l, leaving: true }));
      if (!plaza) return leavingOthers;
      const same = prev.find((l) => l.plaza.id === plaza.id);
      return [...leavingOthers, same ? { plaza, leaving: false } : { plaza, leaving: false }];
    });
  }, [plaza]);

  const handleGone = useCallback((id) => setLayers((prev) => prev.filter((l) => !(l.leaving && l.plaza.id === id))), []);

  return (
    <group scale={scale}>
      {layers.map((l) => (
        <OsmHologram key={l.plaza.id} plaza={l.plaza} theme={theme} leaving={l.leaving} onGone={handleGone} />
      ))}
    </group>
  );
}
