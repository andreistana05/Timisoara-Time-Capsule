/**
 * Shared "what to draw" rules + fit-to-content framing for the OSM plazas. Owner: Member 3.
 *
 *  - drawsBuilding(): Simple-3D-Buildings rule with a safety net: an outline whose parts cover < 85 % of its
 *    area is drawn too (as a base mass, see baseMassFor), so buildings with partially mapped parts don't vanish.
 *  - plazaFit(): yaw / scale / centre so the drawn buildings fill ~90 % of the pedestal, long axis left↔right.
 */
const PART_COVERAGE_MIN = 0.85;
const TARGET_SPAN = 3.6; // units: ≈ 90 % of the 4.1-unit pedestal disc
const SCALE_MIN = 0.6;
const SCALE_MAX = 1.6;

/** Fixed yaw per plaza. Opera Square keeps north-up: the Opera's balcony façade faces the default camera. */
const YAW = { piata_operei_1989: 0, timisoara_2026: 0 };

const area = (r) => {
  let a = 0;
  for (let i = 0; i < r.length; i++) {
    const [x1, z1] = r[i];
    const [x2, z2] = r[(i + 1) % r.length];
    a += x1 * z2 - x2 * z1;
  }
  return Math.abs(a / 2);
};

const coverageCache = new WeakMap();
/** outlineId → { ratio, minPart } for outlines rendered via parts. */
export function partsCoverage(plaza) {
  if (coverageCache.has(plaza)) return coverageCache.get(plaza);
  const byParent = new Map();
  for (const p of plaza.buildings || []) {
    if (!p.isPart || !p.parentId || p.existsInEra === false) continue;
    if (!byParent.has(p.parentId)) byParent.set(p.parentId, []);
    byParent.get(p.parentId).push(p);
  }
  const out = new Map();
  for (const o of plaza.buildings || []) {
    if (o.render !== 'parts') continue;
    const parts = byParent.get(o.id) || [];
    const oa = area(o.footprint || []) || 1e-9;
    const pa = parts.reduce((s, p) => s + area(p.footprint || []), 0);
    const minPart = parts.reduce((m, p) => (!m || p.height < m.height ? p : m), null);
    out.set(o.id, { ratio: pa / oa, minPart });
  }
  coverageCache.set(plaza, out);
  return out;
}

/** Should this building be drawn as a solid? */
export function drawsBuilding(b, coverage) {
  if (b.existsInEra === false) return false;
  if (b.render !== 'parts') return true;
  const c = coverage.get(b.id);
  return !!c && c.ratio < PART_COVERAGE_MIN;
}

/**
 * For an outline drawn despite having parts: a flat base mass. The server stores the TALLEST part's height on the
 * outline (heightSource 'parts'), so using it would turn the whole footprint into a tower-height block. Use the
 * outline's levels if mapped, else the lowest part's height; the taller parts rise out of it.
 */
export function baseMassFor(b, coverage, plaza) {
  if (b.render !== 'parts') return b;
  const c = coverage.get(b.id);
  const vmpu = (plaza.metersPerUnit || 60) / (plaza.verticalExaggeration || 1);
  let hM = b.levels ? b.levels * 3.5 : c?.minPart?.heightM ?? 12;
  hM = Math.min(hM, b.heightM || hM);
  const h = hM / vmpu;
  return { ...b, height: h, wallHeight: h, roofHeight: 0, heightM: hM, wallHeightM: hM, roofHeightM: 0, roof: null, minHeightM: 0, baseY: 0 };
}

const fitCache = new WeakMap();
/** @returns {{ id, yaw, scale, cx, cz, extX, extZ, maxY }} (cx/cz/ext in the yawed frame, data units) */
export function plazaFit(plaza) {
  if (fitCache.has(plaza)) return fitCache.get(plaza);
  const cov = partsCoverage(plaza);
  const pts = [];
  let maxY = 0;
  for (const b of plaza.buildings || []) {
    if (!drawsBuilding(b, cov) || !b.footprint) continue;
    for (const p of b.footprint) pts.push(p);
    maxY = Math.max(maxY, (b.baseY || 0) + (b.height || 0));
  }
  if (!pts.length) pts.push([-1, -1], [1, 1]);

  let yaw = YAW[plaza.id];
  if (yaw === undefined) {
    // principal axis of the building vertices → align it with screen x
    let mx = 0, mz = 0;
    for (const [x, z] of pts) { mx += x; mz += z; }
    mx /= pts.length;
    mz /= pts.length;
    let sxx = 0, szz = 0, sxz = 0;
    for (const [x, z] of pts) {
      sxx += (x - mx) ** 2;
      szz += (z - mz) ** 2;
      sxz += (x - mx) * (z - mz);
    }
    yaw = 0.5 * Math.atan2(2 * sxz, sxx - szz);
  }
  // three.js rotation.y = yaw maps (x, z) → (x cos + z sin, −x sin + z cos)
  const c = Math.cos(yaw), s = Math.sin(yaw);
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const [x, z] of pts) {
    const xr = x * c + z * s, zr = -x * s + z * c;
    x0 = Math.min(x0, xr); x1 = Math.max(x1, xr);
    z0 = Math.min(z0, zr); z1 = Math.max(z1, zr);
  }
  const extX = x1 - x0, extZ = z1 - z0;
  const scale = Math.min(SCALE_MAX, Math.max(SCALE_MIN, TARGET_SPAN / Math.max(extX, extZ, 1e-6)));
  const fit = { id: plaza.id, yaw, scale, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, extX, extZ, maxY };
  fitCache.set(plaza, fit);
  return fit;
}
