/**
 * The authentic plaza as REAL-LOOKING buildings of its era. Owner: Member 3.
 * Same props/contract as <OsmHologram> (plaza, theme, leaving, onGone) so <OsmPlazaStage> can crossfade either.
 *
 * Draw calls ≈ façade buckets (≤5) + roof buckets (≤4) + hero rim/edges + ground/shadow/paths/tracks + life (≤5).
 * Auto-degrade: if the phone renders < 40 fps during the first 3 s after the build-up, life (people, tram, lamps,
 * flicker) is dropped and façade textures switch to 256 px.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { makeBeamMaterial, makeFlameMaterial, useShader, getDotTexture } from '../materials.js';
import { buildRealisticGeometry, disposeRealisticGeometry } from './realGeometry.js';
import { getFacadeTexture } from './facadeTextures.js';
import { makeRealMaterial, makeEraUniforms } from './realMaterial.js';
import { eraLook } from './eraLook.js';
import { makeHoloMaterial } from './OsmHologram.jsx';

const REVEAL_S = 1.6;
const QUALITY = (() => {
  try {
    return new URLSearchParams(window.location.search).get('quality'); // 'high' | 'low' | null (auto)
  } catch {
    return null;
  }
})();
const FADE_S = 0.8;
const noRaycast = () => null;

/* ───────────── helpers ───────────── */
function pointInPoly([x, z], poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
function samplePoly(poly, n, seed = 1) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const xs = poly.map((p) => p[0]), zs = poly.map((p) => p[1]);
  const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  const out = [];
  for (let k = 0; out.length < n && k < n * 40; k++) {
    const p = [x0 + rnd() * (x1 - x0), z0 + rnd() * (z1 - z0)];
    if (pointInPoly(p, poly)) out.push(p);
  }
  return out;
}
/** Polyline with cumulative lengths → point/direction at distance d. */
function polyline(points) {
  const cum = [0];
  for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  const total = cum[cum.length - 1];
  return {
    total,
    at(d) {
      d = Math.max(0, Math.min(total, d));
      let i = 1;
      while (i < cum.length - 1 && cum[i] < d) i++;
      const seg = cum[i] - cum[i - 1] || 1;
      const t = (d - cum[i - 1]) / seg;
      const a = points[i - 1], b = points[i];
      return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, dx: b[0] - a[0], dz: b[1] - a[1] };
    },
  };
}

let shadowTex;
function getShadowTexture() {
  if (shadowTex) return shadowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 10, 64, 64, 64);
  grd.addColorStop(0, 'rgba(0,0,0,0.55)');
  grd.addColorStop(0.7, 'rgba(0,0,0,0.25)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  shadowTex = new THREE.CanvasTexture(c);
  return shadowTex;
}

/* ───────────── signs of life ───────────── */
function Walkers({ polylines, count, mpu, vmpu, dark }) {
  const ref = useRef();
  const walkers = useMemo(() => {
    const lines = polylines.map(polyline).filter((p) => p.total > 0.05);
    if (!lines.length) return [];
    const out = [];
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < count; i++) {
      const line = lines[Math.floor(rnd() * lines.length)];
      out.push({ line, d: rnd() * line.total, dir: rnd() < 0.5 ? 1 : -1, speed: ((1.0 + rnd() * 0.6) * 4) / mpu, side: (rnd() - 0.5) * (3 / mpu) });
    }
    return out;
  }, [polylines, count, mpu]);
  const h = (1.75 / vmpu) * 1.6; // slightly oversized so they read on a phone
  useEffect(() => {
    if (!ref.current) return;
    const c = new THREE.Color();
    walkers.forEach((_, i) => ref.current.setColorAt(i, c.setHSL(0.05 + (i % 7) * 0.09, 0.25, dark ? 0.18 : 0.3)));
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [walkers, dark]);
  const m = useMemo(() => new THREE.Matrix4(), []);
  useFrame((_, dt) => {
    if (!ref.current) return;
    walkers.forEach((w, i) => {
      w.d += w.dir * w.speed * Math.min(dt, 0.1);
      if (w.d < 0 || w.d > w.line.total) w.dir *= -1;
      const p = w.line.at(w.d);
      const len = Math.hypot(p.dx, p.dz) || 1;
      m.makeTranslation(p.x + (-p.dz / len) * w.side, h / 2, p.z + (p.dx / len) * w.side);
      ref.current.setMatrixAt(i, m);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });
  if (!walkers.length) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, walkers.length]} raycast={noRaycast} frustumCulled={false}>
      <cylinderGeometry args={[h * 0.14, h * 0.16, h, 5]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

function Crowd({ polygon, count, vmpu }) {
  const people = useRef();
  const flames = useRef();
  const flameMat = useShader(makeFlameMaterial, '#ff9a3c');
  const pts = useMemo(() => samplePoly(polygon, count, 11), [polygon, count]);
  const h = (1.75 / vmpu) * 1.6;
  useEffect(() => {
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    pts.forEach(([x, z], i) => {
      m.makeTranslation(x, h / 2, z);
      people.current?.setMatrixAt(i, m);
      people.current?.setColorAt(i, c.setHSL(0.6, 0.1, 0.08 + (i % 5) * 0.02));
      m.compose(new THREE.Vector3(x + 0.004, h * 1.02, z), new THREE.Quaternion(), new THREE.Vector3(h * 0.12, h * 0.24, h * 0.12));
      flames.current?.setMatrixAt(i, m);
    });
    if (people.current) {
      people.current.instanceMatrix.needsUpdate = true;
      if (people.current.instanceColor) people.current.instanceColor.needsUpdate = true;
    }
    if (flames.current) flames.current.instanceMatrix.needsUpdate = true;
  }, [pts, h]);
  if (!pts.length) return null;
  return (
    <group>
      <instancedMesh ref={people} args={[undefined, undefined, pts.length]} raycast={noRaycast} frustumCulled={false}>
        <cylinderGeometry args={[h * 0.14, h * 0.16, h, 5]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={flames} args={[undefined, flameMat, pts.length]} raycast={noRaycast} frustumCulled={false}>
        <sphereGeometry args={[1, 8, 6]} />
      </instancedMesh>
    </group>
  );
}

function Tram({ polylines, mpu, vmpu }) {
  const ref = useRef();
  const line = useMemo(() => {
    const all = polylines.map(polyline).sort((a, b) => b.total - a.total);
    return all[0] && all[0].total > 0.2 ? all[0] : null;
  }, [polylines]);
  const st = useRef({ d: 0, dir: 1 });
  const L = 14 / mpu, W = 2.4 / mpu, H = 3.0 / vmpu;
  useFrame((_, dt) => {
    if (!ref.current || !line) return;
    const s = st.current;
    s.d += s.dir * (8 / mpu) * Math.min(dt, 0.1);
    if (s.d > line.total) { s.d = line.total; s.dir = -1; }
    if (s.d < 0) { s.d = 0; s.dir = 1; }
    const p = line.at(s.d);
    ref.current.position.set(p.x, 0, p.z);
    ref.current.rotation.y = -Math.atan2(p.dz, p.dx);
  });
  if (!line) return null;
  return (
    <group ref={ref}>
      <mesh position-y={H * 0.32} raycast={noRaycast}>
        <boxGeometry args={[L, H * 0.62, W]} />
        <meshLambertMaterial color="#a8322d" />
      </mesh>
      <mesh position-y={H * 0.8} raycast={noRaycast}>
        <boxGeometry args={[L, H * 0.36, W * 0.98]} />
        <meshLambertMaterial color="#efe3c4" emissive="#3a2c12" />
      </mesh>
    </group>
  );
}

function Lamps({ polylines, lamps, mpu, vmpu }) {
  const geo = useMemo(() => {
    const pos = [];
    const step = lamps.spacingM / mpu;
    for (const pts of polylines) {
      const pl = polyline(pts);
      for (let d = step / 2; d < pl.total && pos.length / 3 < lamps.max; d += step) {
        const p = pl.at(d);
        pos.push(p.x, 4.5 / vmpu, p.z);
      }
      if (pos.length / 3 >= lamps.max) break;
    }
    if (!pos.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    return g;
  }, [polylines, lamps, mpu, vmpu]);
  useEffect(() => () => geo?.dispose(), [geo]);
  if (!geo) return null;
  return (
    <points geometry={geo} raycast={noRaycast} frustumCulled={false}>
      <pointsMaterial map={getDotTexture()} color={lamps.color} size={lamps.size} sizeAttenuation transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  );
}

/* ───────────── the plaza ───────────── */
export function OsmRealistic({ plaza, theme, leaving = false, onGone }) {
  const look = eraLook(plaza.year);
  const geo = useMemo(() => buildRealisticGeometry(plaza), [plaza]);
  useEffect(() => () => disposeRealisticGeometry(geo), [geo]);

  const shared = useMemo(() => ({ uReveal: { value: -0.01 }, uBand: { value: 1 }, uFade: { value: 1 } }), []);
  const era = useMemo(() => makeEraUniforms(look), [look]);
  const mats = useMemo(
    () =>
      geo.buckets.map((b) =>
        makeRealMaterial(shared, era, b.key === 'roof_flat' ? null : getFacadeTexture(b.key), b.kind === 'wall'),
      ),
    [geo, shared, era],
  );
  useEffect(() => () => mats.forEach((m) => m.dispose()), [mats]);

  // faint holographic touch on hero landmarks only
  const heroRim = useMemo(() => makeHoloMaterial(shared, { color: theme.glow || '#f59e0b', opacity: 0.05, scan: 1 }), [shared]); // eslint-disable-line react-hooks/exhaustive-deps
  const heroEdge = useMemo(() => makeHoloMaterial(shared, { color: '#f59e0b', opacity: 0.25, scan: 0.2, pulse: 1 }), [shared]);
  useEffect(() => () => { heroRim.dispose(); heroEdge.dispose(); }, [heroRim, heroEdge]);
  useEffect(() => { heroRim.uniforms.uColor.value.set(theme.glow || '#f59e0b'); }, [theme, heroRim]);

  const beam = useShader(makeBeamMaterial, '#ffb347', plaza.year === 1989 ? 0.6 : 0.3);
  const [low, setLow] = useState(QUALITY === 'low');
  const scanRing = useRef();
  const fadeMats = useRef([]);
  const anim = useRef({ t0: null, fadeFrom: null, gone: false, fpsT0: null, frames: 0, judged: false });

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
    if (leaving) {
      if (a.fadeFrom === null) a.fadeFrom = now;
      shared.uFade.value = Math.max(0, 1 - (now - a.fadeFrom) / FADE_S);
      if (shared.uFade.value === 0 && !a.gone) {
        a.gone = true;
        onGone?.(plaza.id);
      }
    } else {
      a.fadeFrom = null;
      a.gone = false;
      shared.uFade.value = Math.min(1, shared.uFade.value + 0.05);
    }
    fadeMats.current.forEach((m) => m && (m.opacity = m.userData.baseOpacity * shared.uFade.value));
    beam.uniforms.uIntensity.value = (plaza.year === 1989 ? 0.6 : 0.3) * shared.uFade.value * e;

    // auto-degrade: measure 3 s right after the build-up
    if (k >= 1 && !a.judged && !leaving && !QUALITY) {
      if (a.fpsT0 === null) a.fpsT0 = now;
      a.frames++;
      if (now - a.fpsT0 >= 3) {
        a.judged = true;
        const fps = a.frames / (now - a.fpsT0);
        if (fps < 40) {
          console.info(`[ar] realistic plaza at ${fps.toFixed(0)} fps → low-quality mode`);
          setLow(true);
        }
      }
    }
  });

  useEffect(() => {
    if (!low) return;
    era.uFlicker.value = 0;
    geo.buckets.forEach((b, i) => {
      if (b.key !== 'roof_flat') mats[i].uniforms.uMap.value = getFacadeTexture(b.key, 256);
    });
  }, [low, era, geo, mats]);

  const regFade = (baseOpacity) => (m) => {
    if (!m) return;
    m.userData.baseOpacity = baseOpacity;
    if (!fadeMats.current.includes(m)) fadeMats.current.push(m);
  };
  const half = 2.2;

  return (
    <group>
      {/* contact shadow + paving + rails + paths */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.004} raycast={noRaycast} renderOrder={1}>
        <planeGeometry args={[half * 2, half * 2]} />
        <meshBasicMaterial ref={regFade(1)} map={getShadowTexture()} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      {geo.ground && (
        <mesh geometry={geo.ground} position-y={0.005} raycast={noRaycast} renderOrder={2}>
          <meshBasicMaterial ref={regFade(look.pavingOpacity)} color={look.paving} transparent opacity={look.pavingOpacity} depthWrite toneMapped={false} />
        </mesh>
      )}
      {geo.paths && (
        <lineSegments geometry={geo.paths} raycast={noRaycast}>
          <lineBasicMaterial ref={regFade(0.35)} color={look.pathColor} transparent opacity={0.35} depthWrite={false} />
        </lineSegments>
      )}
      {geo.tracks && (
        <lineSegments geometry={geo.tracks} raycast={noRaycast}>
          <lineBasicMaterial ref={regFade(0.95)} color={look.railColor} transparent opacity={0.95} />
        </lineSegments>
      )}

      {/* buildings */}
      {geo.buckets.map((b, i) => (
        <mesh key={b.key} geometry={b.geometry} material={mats[i]} raycast={noRaycast} />
      ))}
      {geo.heroOverlay && <mesh geometry={geo.heroOverlay} material={heroRim} raycast={noRaycast} />}
      {geo.heroEdges && <lineSegments geometry={geo.heroEdges} material={heroEdge} raycast={noRaycast} />}

      {/* the Opera balcony, 20 Dec 1989 */}
      {geo.balcony && (
        <group position={geo.balcony.position}>
          <mesh raycast={noRaycast}>
            <boxGeometry args={[Math.max(0.05, geo.balcony.widthUnits), 0.012, 0.03]} />
            <meshBasicMaterial ref={regFade(1)} color="#ffcf8a" transparent toneMapped={false} />
          </mesh>
          <mesh position-y={0.45} material={beam} raycast={noRaycast}>
            <cylinderGeometry args={[0.07, 0.035, 0.9, 24, 1, true]} />
          </mesh>
        </group>
      )}

      {/* signs of life (dropped in low-quality mode, and while fading out) */}
      {!low && !leaving && (
        <>
          {look.candles && geo.crowdPolygon && <Crowd polygon={geo.crowdPolygon} count={look.crowd || 200} vmpu={geo.vmpu} />}
          {look.people > 0 && <Walkers polylines={geo.pathPolylines} count={look.people} mpu={geo.metersPerUnit} vmpu={geo.vmpu} dark={plaza.year === 1989} />}
          {look.tram && geo.trackPolylines.length > 0 && <Tram polylines={geo.trackPolylines} mpu={geo.metersPerUnit} vmpu={geo.vmpu} />}
          {look.lamps && <Lamps polylines={geo.pathPolylines} lamps={look.lamps} mpu={geo.metersPerUnit} vmpu={geo.vmpu} />}
        </>
      )}

      <mesh ref={scanRing} rotation-x={-Math.PI / 2} raycast={noRaycast}>
        <ringGeometry args={[1.9, 2.25, 96]} />
        <meshBasicMaterial color={theme.glow || theme.primary} transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}
