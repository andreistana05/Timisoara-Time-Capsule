/**
 * Pure geometry for the OSM hologram (no React). Owner: Member 3.
 *
 * Input: one Plaza from GET /api/monuments-3d (x east, z south, y up; all inside [-2, 2];
 * heights already vertically exaggerated). Output: a handful of MERGED BufferGeometries
 * (position only) so the whole plaza draws in ~10 calls.
 *
 * Shape convention (verified by M1's integration test): THREE.Shape is XY, so points are
 * Vector2(x, -z); after rotateX(-π/2) shape-y becomes world z and the extrusion goes up.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { partsCoverage, drawsBuilding, baseMassFor } from './fit.js';

const EDGE_ANGLE = 20; // degrees: crease threshold for the bright hologram edges
const LIFT = 0.004; // paths / outlines float just above the pedestal

/** Strip to position-only, non-indexed: every geometry we merge must share attributes. */
function positionsOnly(g) {
  const ni = g.index ? g.toNonIndexed() : g;
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', ni.getAttribute('position'));
  if (ni !== g) ni.dispose();
  if (out !== g) g.dispose();
  return out;
}

const merge = (list) => {
  const geos = list.filter(Boolean);
  if (!geos.length) return null;
  const m = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  if (m) m.computeBoundingSphere();
  return m;
};

const centroid = (ring) => {
  let x = 0, z = 0;
  for (const p of ring) { x += p[0]; z += p[1]; }
  return [x / ring.length, z / ring.length];
};

function wallGeometry(b) {
  if (!b.footprint || b.footprint.length < 3 || !(b.wallHeight > 0)) return null;
  const shape = new THREE.Shape(b.footprint.map(([x, z]) => new THREE.Vector2(x, -z)));
  for (const h of b.holes || []) if (h.length >= 3) shape.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))));
  const g = new THREE.ExtrudeGeometry(shape, { depth: b.wallHeight, bevelEnabled: false, curveSegments: 1 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, b.baseY || 0, 0);
  return g;
}

/** Roof profile: list of [scaleTowardCentroid, heightFraction]; scale 0 ends in an apex. */
export function roofProfile(roof) {
  switch (roof) {
    case null:
    case undefined:
    case 'flat':
      return null;
    case 'pyramidal':
    case 'cone':
    case 'spire':
      return [[1, 0], [0, 1]];
    case 'skillion':
    case 'gambrel':
    case 'saltbox':
      return [[1, 0], [0.8, 1]];
    case 'round':
    case 'dome':
    case 'tiled_cupola': {
      const n = 5;
      return Array.from({ length: n + 1 }, (_, k) => {
        const t = k / n;
        return [Math.cos((t * Math.PI) / 2), Math.sin((t * Math.PI) / 2)];
      });
    }
    case 'onion': {
      const n = 6;
      return Array.from({ length: n + 1 }, (_, k) => {
        const t = k / n;
        return [(1 + 0.3 * Math.sin(Math.PI * t * 1.2)) * Math.pow(1 - t, 0.8), t];
      });
    }
    case 'gabled':
    case 'hipped':
    case 'side_hipped':
    case 'mansard':
    case 'hip':
    case 'gable':
    case 'tiled_multicolour':
    default:
      // any other non-flat OSM roof shape (half-hipped, crosspitched, …): a generic pitched loft
      return [[1, 0], [0.55, 1]];
  }
}

/** Generic "loft to centroid" roof: works for any footprint (concave too, good enough for a hologram). */
function roofGeometry(b) {
  if (!(b.roofHeight > 0.001) || !b.footprint || b.footprint.length < 3) return null;
  const prof = roofProfile(b.roof);
  if (!prof) return null;
  const ring = b.footprint;
  const [cx, cz] = centroid(ring);
  const y0 = (b.baseY || 0) + b.wallHeight;
  const levels = prof.map(([s, f]) => ({ s, y: y0 + f * b.roofHeight, pts: ring.map(([x, z]) => [cx + (x - cx) * s, cz + (z - cz) * s]) }));
  const pos = [];
  const n = ring.length;
  for (let k = 0; k < levels.length - 1; k++) {
    const A = levels[k], B = levels[k + 1];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const a0 = [A.pts[i][0], A.y, A.pts[i][1]], a1 = [A.pts[j][0], A.y, A.pts[j][1]];
      const b0 = [B.pts[i][0], B.y, B.pts[i][1]], b1 = [B.pts[j][0], B.y, B.pts[j][1]];
      if (B.s < 1e-4) pos.push(...a0, ...a1, ...b0); // apex
      else pos.push(...a0, ...a1, ...b1, ...a0, ...b1, ...b0);
    }
  }
  const top = levels[levels.length - 1];
  if (top.s > 1e-4) {
    // cap the inset ring
    const contour = top.pts.map(([x, z]) => new THREE.Vector2(x, z));
    for (const [a, c, d] of THREE.ShapeUtils.triangulateShape(contour, [])) {
      for (const idx of [a, c, d]) pos.push(top.pts[idx][0], top.y, top.pts[idx][1]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

/** Polylines → one LineSegments geometry. `closed` joins last→first. */
export function linesGeometry(polylines, y = LIFT, closed = false) {
  const pos = [];
  for (const pts of polylines) {
    if (!pts || pts.length < 2) continue;
    const m = closed ? pts.length : pts.length - 1;
    for (let i = 0; i < m; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      pos.push(a[0], y, a[1], b[0], y, b[1]);
    }
  }
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

export function flatPolygon(poly, y) {
  if (!poly || poly.length < 3) return null;
  try {
    const g = new THREE.ShapeGeometry(new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z))));
    g.rotateX(-Math.PI / 2);
    g.translate(0, y, 0);
    return positionsOnly(g);
  } catch {
    return null;
  }
}

function pillarGeometry([x, , z], h, r) {
  const g = new THREE.CylinderGeometry(r * 0.6, r, h, 8, 1, false);
  g.translate(x, h / 2, z);
  return positionsOnly(g);
}

/**
 * @returns {{ fills:{regular,dim,hero}, roofs:{regular,hero}, edges:{regular,hero}, footprints, paths, tracks,
 *             ground, groundEdge, crowd, pillars:{regular,hero}, balcony, maxY, stats }}
 */
export function buildPlazaGeometry(plaza) {
  const visible = (x) => x.existsInEra !== false;
  const buckets = { regular: [], dim: [], hero: [] };
  const roofB = { regular: [], hero: [] };
  const edgeB = { regular: [], hero: [] };
  const footprints = [];
  let maxY = 0, built = 0, skipped = 0;

  const coverage = partsCoverage(plaza);
  for (const src of plaza.buildings || []) {
    if (!visible(src)) continue;
    footprints.push(src.footprint, ...(src.holes || [])); // blueprint outline on the ground for every building
    // Simple 3D Buildings: the parts carry the real massing, unless they cover < 85 % of the outline
    if (!drawsBuilding(src, coverage)) continue;
    const b = baseMassFor(src, coverage, plaza);
    const hero = !!b.landmark;
    const guessed = b.approximate || b.heightSource === 'default' || b.heightSource === 'estimate';
    try {
      const wall = wallGeometry(b);
      if (wall) {
        edgeB[hero ? 'hero' : 'regular'].push(positionsOnly(new THREE.EdgesGeometry(wall, EDGE_ANGLE)));
        buckets[hero ? 'hero' : guessed ? 'dim' : 'regular'].push(positionsOnly(wall));
      }
      const roof = roofGeometry(b);
      if (roof) {
        edgeB[hero ? 'hero' : 'regular'].push(positionsOnly(new THREE.EdgesGeometry(roof, EDGE_ANGLE)));
        roofB[hero ? 'hero' : 'regular'].push(roof);
      }
      maxY = Math.max(maxY, (b.baseY || 0) + (b.height || 0));
      built++;
    } catch (err) {
      skipped++;
      console.warn('[ar] skipped building', b.id, err.message);
    }
  }

  const pillarsB = { regular: [], hero: [] };
  let balcony = null;
  for (const l of plaza.landmarks || []) {
    if (!visible(l) || l.atmosphere || !l.position) continue;
    if (l.type === 'balcony') {
      balcony = { position: l.position, widthUnits: l.widthM && plaza.metersPerUnit ? l.widthM / plaza.metersPerUnit : 0.12 };
      continue;
    }
    const h = l.height || 0.08;
    pillarsB[l.landmark ? 'hero' : 'regular'].push(pillarGeometry(l.position, h, l.landmark ? 0.018 : 0.011));
    maxY = Math.max(maxY, h);
  }

  const tracks = (plaza.tracks || []).map((t) => t.points);
  const paths = (plaza.paths || []).map((p) => p.points);
  const crowd = (plaza.areas || []).find((a) => a.kind === 'crowd');

  return {
    fills: { regular: merge(buckets.regular), dim: merge(buckets.dim), hero: merge(buckets.hero) },
    roofs: { regular: merge(roofB.regular), hero: merge(roofB.hero) },
    edges: { regular: merge(edgeB.regular), hero: merge(edgeB.hero) },
    footprints: linesGeometry(footprints, LIFT * 0.5, true),
    paths: linesGeometry(paths, LIFT),
    tracks: linesGeometry(tracks, LIFT * 1.5),
    ground: flatPolygon(plaza.ground?.polygon, LIFT * 0.25),
    groundEdge: linesGeometry([plaza.ground?.polygon], LIFT * 0.75, true),
    crowd: crowd ? flatPolygon(crowd.polygon, LIFT * 0.6) : null,
    pillars: { regular: merge(pillarsB.regular), hero: merge(pillarsB.hero) },
    balcony,
    maxY: maxY || 0.5,
    stats: { built, skipped },
  };
}

/** Dispose everything buildPlazaGeometry returned. */
export function disposePlazaGeometry(geo) {
  const walk = (v) => {
    if (!v) return;
    if (v.isBufferGeometry) v.dispose();
    else if (typeof v === 'object' && !Array.isArray(v)) Object.values(v).forEach(walk);
  };
  walk(geo);
}
