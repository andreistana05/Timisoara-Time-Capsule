/**
 * Geometry for the REALISTIC plazas (no React). Owner: Member 3.
 *
 * Walls are built by hand (not ExtrudeGeometry) so we control:
 *  - UVs in façade tiles: u = metres along the perimeter / 8 m (2 bays), v = FLOORS above the base,
 *    so the window texture repeats exactly once per floor and lines up around corners;
 *  - outward normals and front-face winding (courtyard walls face the courtyard);
 *  - per-building attributes: aTint (linear RGB: OSM colour or style palette) and aSeed (0..1 hash).
 * Everything is merged per STYLE bucket → one draw call per bucket.
 *
 * Coordinates: data [x, z] (x east, z south) → world (x, y, z) directly. Heights are already exaggerated;
 * vertical metres = units × metersPerUnit / verticalExaggeration.
 */
import * as THREE from 'three';
import { PALETTES } from './eraLook.js';
import { FACADE_STYLES } from './facadeTextures.js';
import { flatPolygon, linesGeometry, roofProfile } from './buildGeometry.js';
import { partsCoverage, drawsBuilding, baseMassFor } from './fit.js';

const TILE_M = 8; // façade tile width in metres (2 bays × 4 m)
const ROOF_TILE_M = 6;
const FLAT_TILE_M = 4;

const CHURCH_KEYS = new Set(['catedrala_mitropolitana', 'domul_catolic', 'catedrala_sarbeasca', 'sinagoga_cetate', 'church', 'synagogue']);
const BAROQUE_KEYS = new Set(['primaria_veche', 'palatul_baroc', 'casa_comandamentului', 'vicariatul_sarbesc', 'opera']);
const DOME_ROOFS = new Set(['round', 'dome', 'onion', 'tiled_cupola', 'cone']);

/** FNV-1a → 0..1, deterministic per OSM id. */
function hash01(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return ((h >>> 0) % 100000) / 100000;
}
const pick = (arr, h) => arr[Math.floor(h * arr.length) % arr.length];

/** Façade style for a building. Unknown buildings take the square's dominant style (Secession on Opera Square, Baroque in Cetate). */
export function styleOf(b, plazaDefault) {
  if (CHURCH_KEYS.has(b.landmarkKey) || b.style === 'neo_moldavian' || b.style === 'moorish_revival') return 'church';
  if (/concrete|glass/.test(b.material || '') || (b.builtYear && b.builtYear >= 1950)) return 'modern';
  if (b.style === 'secession' || ((b.landmarkKey || '').startsWith('palatul_') && b.landmarkKey !== 'palatul_baroc')) return 'secession';
  if (b.style === 'baroque' || b.style === 'neo_romanian_facade' || BAROQUE_KEYS.has(b.landmarkKey)) return 'baroque';
  if ((b.wallHeightM || 0) < 8) return 'generic';
  return plazaDefault;
}

function roofBucketOf(b, style) {
  if (!(b.roofHeight > 0.001) || !b.roof || b.roof === 'flat') return 'roof_flat';
  if (b.roof === 'tiled_multicolour' || b.landmarkKey === 'catedrala_mitropolitana') return 'roof_poly';
  if (DOME_ROOFS.has(b.roof) || (b.roof === 'pyramidal' && style === 'church')) return 'roof_dome';
  return 'roof_tile';
}

const _c = new THREE.Color();
const _hsl = {};
/** sRGB hex → linear RGB triple, with a small deterministic lightness jitter. */
function tintOf(hex, h, jitter = 0.04) {
  try {
    _c.set(hex);
  } catch {
    _c.set('#dddddd');
  }
  _c.getHSL(_hsl);
  _c.setHSL(_hsl.h, _hsl.s, THREE.MathUtils.clamp(_hsl.l + (h - 0.5) * 2 * jitter, 0, 1));
  return [_c.r, _c.g, _c.b];
}

class Acc {
  constructor() {
    this.pos = [];
    this.nrm = [];
    this.uv = [];
    this.tint = [];
    this.seed = [];
  }
  vert(p, n, uv, tint, seed) {
    this.pos.push(p[0], p[1], p[2]);
    this.nrm.push(n[0], n[1], n[2]);
    this.uv.push(uv[0], uv[1]);
    this.tint.push(tint[0], tint[1], tint[2]);
    this.seed.push(seed);
  }
  tri(a, b, c, n, uva, uvb, uvc, tint, seed) {
    this.vert(a, n, uva, tint, seed);
    this.vert(b, n, uvb, tint, seed);
    this.vert(c, n, uvc, tint, seed);
  }
  geometry() {
    if (!this.pos.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('aTint', new THREE.Float32BufferAttribute(this.tint, 3));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(this.seed, 1));
    g.computeBoundingSphere();
    return g;
  }
}

const signedArea = (ring) => {
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, z1] = ring[i];
    const [x2, z2] = ring[(i + 1) % ring.length];
    a += x1 * z2 - x2 * z1;
  }
  return a / 2;
};

function faceNormal(a, b, c) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
  const l = Math.hypot(n[0], n[1], n[2]) || 1;
  return [n[0] / l, n[1] / l, n[2] / l];
}

/** Vertical walls of one ring. */
function addWalls(acc, ring, isHole, y0, y1, floors, ctx, extra) {
  const area = signedArea(ring);
  if (Math.abs(area) < 1e-9) return;
  const outSign = (area > 0 ? 1 : -1) * (isHole ? -1 : 1); // outward = (dz,-dx)·outSign
  let perim = 0;
  for (let i = 0; i < ring.length; i++) {
    const [ax, az] = ring[i];
    const [bx, bz] = ring[(i + 1) % ring.length];
    const dx = bx - ax, dz = bz - az;
    const L = Math.hypot(dx, dz);
    if (L < 1e-6) continue;
    const n = [(dz / L) * outSign, 0, (-dx / L) * outSign];
    const u0 = (perim * ctx.mpu) / TILE_M;
    const u1 = ((perim + L) * ctx.mpu) / TILE_M;
    perim += L;
    const a0 = [ax, y0, az], b0 = [bx, y0, bz], a1 = [ax, y1, az], b1 = [bx, y1, bz];
    // triangle (a0,b0,b1) faces (-dz, dx); use that winding when it matches the outward normal
    if (n[0] * -dz + n[2] * dx > 0) {
      acc.tri(a0, b0, b1, n, [u0, 0], [u1, 0], [u1, floors], ctx.tint, ctx.seed);
      acc.tri(a0, b1, a1, n, [u0, 0], [u1, floors], [u0, floors], ctx.tint, ctx.seed);
      extra?.push(...a0, ...b0, ...b1, ...a0, ...b1, ...a1);
    } else {
      acc.tri(a0, b1, b0, n, [u0, 0], [u1, floors], [u1, 0], ctx.tint, ctx.seed);
      acc.tri(a0, a1, b1, n, [u0, 0], [u0, floors], [u1, floors], ctx.tint, ctx.seed);
      extra?.push(...a0, ...b1, ...b0, ...a0, ...a1, ...b1);
    }
  }
}

/** Horizontal cap (flat roof / inset gable top), facing up, planar UVs in metres. */
function addCap(acc, contour, holes, y, ctx, tint, seed, extra, tileM = FLAT_TILE_M) {
  const pts = [...contour, ...holes.flat()];
  let tris;
  try {
    tris = THREE.ShapeUtils.triangulateShape(contour.map(([x, z]) => new THREE.Vector2(x, z)), holes.map((h) => h.map(([x, z]) => new THREE.Vector2(x, z))));
  } catch {
    return;
  }
  const up = [0, 1, 0];
  for (let [i, j, k] of tris) {
    let a = pts[i], b = pts[j], c = pts[k];
    if (!a || !b || !c) continue;
    // keep counter-clockwise when seen from above (+y)
    if ((b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]) < 0) [b, c] = [c, b];
    const P = (p) => [p[0], y, p[1]];
    const U = (p) => [(p[0] * ctx.mpu) / tileM, (p[1] * ctx.mpu) / tileM];
    acc.tri(P(a), P(b), P(c), up, U(a), U(b), U(c), tint, seed);
    extra?.push(...P(a), ...P(b), ...P(c));
  }
}

/** Pitched / dome roof lofted toward the centroid; faceted normals, planar UVs. */
function addRoof(acc, b, ctx, tint, seed, extra) {
  const prof = roofProfile(b.roof) || [[1, 0], [0.55, 1]];
  const ring = b.footprint;
  let cx = 0, cz = 0;
  for (const p of ring) { cx += p[0]; cz += p[1]; }
  cx /= ring.length;
  cz /= ring.length;
  const y0 = (b.baseY || 0) + b.wallHeight;
  const levels = prof.map(([s, f]) => ({ s, y: y0 + f * b.roofHeight, pts: ring.map(([x, z]) => [cx + (x - cx) * s, cz + (z - cz) * s]) }));
  const axis = [cx, y0 - b.roofHeight * 0.5, cz];
  const U = (p) => [(p[0] * ctx.mpu) / ROOF_TILE_M, (p[2] * ctx.mpu) / ROOF_TILE_M + p[1] * 3];
  const emit = (a, c, d) => {
    let n = faceNormal(a, c, d);
    const m = [(a[0] + c[0] + d[0]) / 3 - axis[0], (a[1] + c[1] + d[1]) / 3 - axis[1], (a[2] + c[2] + d[2]) / 3 - axis[2]];
    if (n[0] * m[0] + n[1] * m[1] + n[2] * m[2] < 0) {
      [c, d] = [d, c];
      n = [-n[0], -n[1], -n[2]];
    }
    acc.tri(a, c, d, n, U(a), U(c), U(d), tint, seed);
    extra?.push(...a, ...c, ...d);
  };
  for (let k = 0; k < levels.length - 1; k++) {
    const A = levels[k], B = levels[k + 1];
    for (let i = 0; i < ring.length; i++) {
      const j = (i + 1) % ring.length;
      const a0 = [A.pts[i][0], A.y, A.pts[i][1]], a1 = [A.pts[j][0], A.y, A.pts[j][1]];
      const b0 = [B.pts[i][0], B.y, B.pts[i][1]], b1 = [B.pts[j][0], B.y, B.pts[j][1]];
      if (B.s < 1e-4) emit(a0, a1, b0);
      else {
        emit(a0, a1, b1);
        emit(a0, b1, b0);
      }
    }
  }
  const top = levels[levels.length - 1];
  if (top.s > 1e-4) addCap(acc, top.pts, [], top.y, ctx, tint, seed, extra, ROOF_TILE_M);
}

/* ───────────── inward-offset roofs (concave footprints, courtyards) ───────────── */

const LOFT_ROOFS = new Set(['pyramidal', 'cone', 'spire', 'round', 'dome', 'onion', 'tiled_cupola']);
const TAN40 = Math.tan((40 * Math.PI) / 180);

function cleanRing(ring) {
  const out = [];
  for (const p of ring) {
    const q = out[out.length - 1];
    if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-6) out.push(p);
  }
  if (out.length > 2 && Math.hypot(out[0][0] - out.at(-1)[0], out[0][1] - out.at(-1)[1]) < 1e-6) out.pop();
  return out;
}

export function isConvex(ring) {
  let sign = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length], c = ring[(i + 2) % ring.length];
    const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(cr) < 1e-10) continue;
    if (!sign) sign = Math.sign(cr);
    else if (Math.sign(cr) !== sign) return false;
  }
  return true;
}

/** Miter offset; dist > 0 moves every edge toward this ring's own interior. Miter length clamped to 2·|dist|. */
function offsetRing(ring, dist) {
  const s = signedArea(ring) > 0 ? 1 : -1;
  const n = ring.length;
  const normals = [];
  for (let i = 0; i < n; i++) {
    const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % n];
    const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1e-12;
    normals.push([(-dz / L) * s, (dx / L) * s]); // inward (area > 0 → outward is (dz, −dx))
  }
  return ring.map(([x, z], i) => {
    const n1 = normals[(i - 1 + n) % n], n2 = normals[i];
    let mx = n1[0] + n2[0], mz = n1[1] + n2[1];
    const ml = Math.hypot(mx, mz);
    let len = dist;
    if (ml < 1e-6) { mx = n1[0]; mz = n1[1]; }
    else {
      mx /= ml; mz /= ml;
      len = dist / Math.max(mx * n1[0] + mz * n1[1], 1e-6);
      len = Math.sign(len) * Math.min(Math.abs(len), 2 * Math.abs(dist));
    }
    return [x + mx * len, z + mz * len];
  });
}

function segsCross(a, b, c, d) {
  const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = o(c, d, a), d2 = o(c, d, b), d3 = o(a, b, c), d4 = o(a, b, d);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}
export function selfIntersects(r) {
  const n = r.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue; // adjacent through the closing edge
      if (segsCross(r[i], r[(i + 1) % n], r[j], r[(j + 1) % n])) return true;
    }
  }
  return false;
}
function ringsCross(a, b) {
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) if (segsCross(a[i], a[(i + 1) % a.length], b[j], b[(j + 1) % b.length])) return true;
  return false;
}
function pointInRing([x, z], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
const validOffset = (off, orig) =>
  Math.sign(signedArea(off)) === Math.sign(signedArea(orig)) && Math.abs(signedArea(off)) > 0.05 * Math.abs(signedArea(orig)) && !selfIntersects(off);

/** Emit a roof triangle with its own face normal, oriented so the roof never faces down. */
function emitUp(acc, a, b, c, tint, seed, ctx, extra) {
  let n = faceNormal(a, b, c);
  if (n[1] < 0) {
    [b, c] = [c, b];
    n = [-n[0], -n[1], -n[2]];
  }
  const U = (p) => [(p[0] * ctx.mpu) / ROOF_TILE_M, (p[2] * ctx.mpu) / ROOF_TILE_M + p[1] * 3];
  acc.tri(a, b, c, n, U(a), U(b), U(c), tint, seed);
  extra?.push(...a, ...b, ...c);
}

/**
 * Hipped-style roof from an inward polygon offset: sloped bands from every edge (outer ring AND courtyards) up to
 * the offset rings, then a flat ridge cap between them. Returns false if no valid offset exists (caller falls back).
 */
function addOffsetRoof(acc, b, ctx, tint, seed, extra) {
  const outer = cleanRing(b.footprint);
  const holes = (b.holes || []).map(cleanRing).filter((h) => h.length >= 3);
  if (outer.length < 3) return false;
  const aEff = Math.abs(signedArea(outer)) - holes.reduce((s, h) => s + Math.abs(signedArea(h)), 0);
  const perim = [outer, ...holes].reduce((s, r) => s + r.reduce((t, p, i) => t + Math.hypot(r[(i + 1) % r.length][0] - p[0], r[(i + 1) % r.length][1] - p[1]), 0), 0);
  const thickness = (2 * Math.max(aEff, 0)) / Math.max(perim, 1e-9);
  const d0 = Math.min((b.roofHeightM || 4) / TAN40 / ctx.mpu, 0.45 * thickness);
  if (!(d0 > 1e-5)) return false;

  for (const f of [1, 0.6, 0.36]) {
    const d = d0 * f;
    const offOuter = offsetRing(outer, d);
    const offHoles = holes.map((h) => offsetRing(h, -d)); // grow courtyards
    if (!validOffset(offOuter, outer)) continue;
    if (!offHoles.every((oh, i) => validOffset(oh, holes[i]) && pointInRing(oh[0], offOuter) && !ringsCross(oh, offOuter))) continue;
    if (offHoles.some((a, i) => offHoles.some((c, j) => j > i && ringsCross(a, c)))) continue;

    const y0 = (b.baseY || 0) + b.wallHeight;
    const y1 = y0 + b.roofHeight;
    const band = (r, o) => {
      for (let i = 0; i < r.length; i++) {
        const j = (i + 1) % r.length;
        const a0 = [r[i][0], y0, r[i][1]], b0 = [r[j][0], y0, r[j][1]];
        const a1 = [o[i][0], y1, o[i][1]], b1 = [o[j][0], y1, o[j][1]];
        emitUp(acc, a0, b0, b1, tint, seed, ctx, extra);
        emitUp(acc, a0, b1, a1, tint, seed, ctx, extra);
      }
    };
    band(outer, offOuter);
    holes.forEach((h, i) => band(h, offHoles[i]));
    addCap(acc, offOuter, offHoles, y1, ctx, tint, seed, extra, ROOF_TILE_M);
    return true;
  }
  return false;
}

/**
 * @returns {{ buckets: {key, kind:'wall'|'roof', geometry}[], heroOverlay, heroEdges, statues, ground, paths, tracks,
 *             pathPolylines, trackPolylines, crowdPolygon, balcony, maxY, stats }}
 */
export function buildRealisticGeometry(plaza) {
  const mpu = plaza.metersPerUnit || 60;
  const vmpu = mpu / (plaza.verticalExaggeration || 1);
  const plazaDefault = plaza.osmMap === 'piata_victoriei' ? 'secession' : 'baroque';
  const accs = new Map();
  const acc = (key) => {
    if (!accs.has(key)) accs.set(key, new Acc());
    return accs.get(key);
  };
  const heroPos = [];
  let maxY = 0, built = 0, skipped = 0;
  const flatFallbacks = [];
  const coverage = partsCoverage(plaza);

  for (const src of plaza.buildings || []) {
    if (!drawsBuilding(src, coverage)) continue;
    const b = baseMassFor(src, coverage, plaza); // outline drawn despite partial parts → flat base mass
    if (!b.footprint || b.footprint.length < 3 || !(b.height > 0)) continue;
    try {
      const style = styleOf(b, plazaDefault);
      const h = hash01(b.id);
      const seed = hash01(b.id + '#s');
      const tint = tintOf(b.color || pick(PALETTES[style], h), h);
      const floorH = b.levels && b.wallHeightM ? THREE.MathUtils.clamp(b.wallHeightM / b.levels, 2.8, 6) : style === 'modern' ? 3.2 : style === 'church' ? 8 : 3.8;
      const y0 = b.baseY || 0;
      const y1 = y0 + (b.wallHeight || 0);
      const floors = Math.max(0.5, ((b.wallHeight || 0) * vmpu) / floorH);
      const ctx = { mpu, tint, seed };
      const hero = b.landmark ? heroPos : null;

      if (b.wallHeight > 0) {
        addWalls(acc(style), b.footprint, false, y0, y1, floors, ctx, hero);
        for (const hole of b.holes || []) if (hole.length >= 3) addWalls(acc(style), hole, true, y0, y1, floors, ctx, hero);
      }
      const rb = roofBucketOf(b, style);
      const rTint = rb === 'roof_poly' ? [1, 1, 1] : tintOf(b.roofColor || pick(PALETTES[rb === 'roof_flat' ? 'roof_flat' : rb], h), seed, 0.03);
      const holes = (b.holes || []).filter((x) => x.length >= 3);
      const flatCap = () => addCap(acc('roof_flat'), b.footprint, holes, y1, ctx, rTint, seed, hero);
      if (rb === 'roof_flat') flatCap();
      else if (LOFT_ROOFS.has(b.roof) && !holes.length && isConvex(b.footprint)) addRoof(acc(rb), b, ctx, rTint, seed, hero); // towers, cupolas
      else if (!addOffsetRoof(acc(rb), b, ctx, rTint, seed, hero)) {
        // never let a roof vanish: flat cap + a low parapet (0.6 m)
        flatCap();
        const p = 0.6 / vmpu;
        const pctx = { mpu, tint: rTint, seed };
        addWalls(acc('roof_flat'), b.footprint, false, y1, y1 + p, 0.2, pctx, hero);
        for (const hole of holes) addWalls(acc('roof_flat'), hole, true, y1, y1 + p, 0.2, pctx, hero);
        flatFallbacks.push(b.id);
      }
      maxY = Math.max(maxY, y0 + b.height);
      built++;
    } catch (err) {
      skipped++;
      console.warn('[ar] realistic: skipped', b.id, err.message);
    }
  }

  // statues / columns / memorials as small stone pillars (into the untextured bucket)
  for (const l of plaza.landmarks || []) {
    if (l.existsInEra === false || l.atmosphere || l.type === 'balcony' || !l.position) continue;
    const hgt = l.height || 0.08;
    const r = l.landmark ? 0.016 : 0.01;
    const g = new THREE.CylinderGeometry(r * 0.6, r, hgt, 8).toNonIndexed();
    g.translate(l.position[0], hgt / 2, l.position[2]);
    const p = g.getAttribute('position'), n = g.getAttribute('normal');
    const tint = tintOf('#d9d3c5', 0.5, 0);
    for (let i = 0; i < p.count; i++) acc('roof_flat').vert([p.getX(i), p.getY(i), p.getZ(i)], [n.getX(i), n.getY(i), n.getZ(i)], [0, 0], tint, 0.5);
    g.dispose();
    maxY = Math.max(maxY, hgt);
  }

  const buckets = [];
  for (const [key, a] of accs) {
    const geometry = a.geometry();
    if (geometry) buckets.push({ key, kind: FACADE_STYLES.includes(key) ? 'wall' : 'roof', geometry });
  }

  let heroOverlay = null, heroEdges = null;
  if (heroPos.length) {
    heroOverlay = new THREE.BufferGeometry();
    heroOverlay.setAttribute('position', new THREE.Float32BufferAttribute(heroPos, 3));
    const e = new THREE.EdgesGeometry(heroOverlay, 25);
    heroEdges = new THREE.BufferGeometry();
    heroEdges.setAttribute('position', e.getAttribute('position'));
    e.dispose();
  }

  let balcony = null;
  const bl = (plaza.landmarks || []).find((l) => l.type === 'balcony' && l.existsInEra !== false);
  if (bl) balcony = { position: bl.position, widthUnits: bl.widthM ? bl.widthM / mpu : 0.12 };

  const trackPolylines = (plaza.tracks || []).map((t) => t.points).filter((p) => p.length > 1);
  const pathPolylines = (plaza.paths || []).filter((p) => p.kind !== 'steps').map((p) => p.points).filter((p) => p.length > 1);

  return {
    buckets,
    heroOverlay,
    heroEdges,
    ground: flatPolygon(plaza.ground?.polygon, 0.002),
    paths: linesGeometry(pathPolylines, 0.008),
    tracks: linesGeometry(trackPolylines, 0.009),
    pathPolylines,
    trackPolylines,
    crowdPolygon: (plaza.areas || []).find((a) => a.kind === 'crowd')?.polygon || null,
    balcony,
    maxY: maxY || 0.5,
    metersPerUnit: mpu,
    vmpu,
    stats: { built, skipped, buckets: buckets.length, flatFallbacks },
  };
}

export function disposeRealisticGeometry(geo) {
  if (!geo) return;
  geo.buckets.forEach((b) => b.geometry.dispose());
  for (const k of ['heroOverlay', 'heroEdges', 'ground', 'paths', 'tracks']) geo[k]?.dispose();
}

