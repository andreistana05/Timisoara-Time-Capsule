/**
 * AUTHENTIC miniature plazas for the AR hologram, built from real OpenStreetMap data. Owner: Member 1.
 * Served by GET /api/monuments-3d (default). The hand-drawn version stays at ?source=schematic.
 *
 * Input: client/public/assets/ar/maps/<map>.json, produced by scripts/fetchTimisoaraOSM.js
 * (surveyed OSM footprints, heights, 3D building parts, tram tracks). We only READ those files.
 *
 * What this adds on top of the raw export:
 *  - Same schema + grid as server/monuments3d.js ([-2, 2], x east, z south, y up), so /ar can switch sources freely.
 *  - Simple-3D-Buildings logic: every `building:part` is linked to its outline (`parentId`), and outlines that
 *    have parts get `hasParts: true` → renderers draw the PARTS (real towers, domes, wings) and skip the outline.
 *  - Roof split: `wallHeightM` + `roofHeightM` (OSM height includes the roof), from roof:height or a
 *    shape-based estimate (`roofHeightSource`).
 *  - Hero landmarks keep their OSM geometry; the few heroes OSM gives no height get a schematic estimate
 *    (`heightSource: 'estimate'`), and a `synthetic: true` part where needed (Metropolitan Cathedral's
 *    central tower: OSM only tags the overall 90.5 m top).
 *  - The Opera balcony is placed on the real south façade of the Opera footprint.
 *  - Era honesty: footprints are TODAY's city. Each plaza has `footprintsAsOf` + a 5-language `caveat`, and
 *    features with a known build year get `existsInEra` (e.g. the 1989 Revolution memorials are false in 1989).
 *
 * Data © OpenStreetMap contributors, ODbL 1.0 — `attribution` must be shown wherever this is rendered.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MONUMENTS_3D } from './monuments3d.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAPS_DIR = path.resolve(__dirname, '..', 'client', 'public', 'assets', 'ar', 'maps');
const GRID = 2; // target half-extent (schematic grid); OSM exports use 2.5
const LANGS = ['ro', 'en', 'hu', 'de', 'sr'];
const r3 = (n) => Math.round(n * 1000) / 1000;
const r1 = (n) => Math.round(n * 10) / 10;

/** Era plaza id (shared/events.js TIMELINE_ERAS[].plazaId) → OSM map file. */
export const OSM_MAP_FOR_PLAZA = Object.freeze({
  piata_libertatii_1900: 'piata_libertatii',
  piata_unirii_1977: 'piata_unirii',
  piata_operei_1989: 'piata_victoriei',
  timisoara_2026: 'piata_victoriei',
});

/**
 * Hero landmarks, by the `landmark.key` the fetch script assigns.
 * `schematicId` reuses the hand-checked 5-language name / style / dates from monuments3d.js.
 * `heightM` is ONLY applied when OSM has no measured height for the outline and it has no parts.
 */
const HEROES = {
  opera: { schematicId: 'opera_house', style: 'neo_romanian_facade', heightM: 28 },
  catedrala_mitropolitana: { schematicId: 'metropolitan_cathedral', style: 'neo_moldavian', bodyHeightM: 30, built: '1936–1946' },
  domul_catolic: { schematicId: 'roman_catholic_cathedral', style: 'baroque', heightM: 35 },
  catedrala_sarbeasca: { schematicId: 'serbian_orthodox_cathedral', style: 'baroque', heightM: 32 },
  palatul_baroc: { schematicId: 'baroque_palace', style: 'baroque', heightM: 20 },
  primaria_veche: { schematicId: 'old_city_hall', style: 'baroque', heightM: 18, built: '1731–1734' },
  sinagoga_cetate: { style: 'moorish_revival', heightM: 22, built: '1865', name: { ro: 'Sinagoga din Cetate', en: 'Cetate Synagogue', hu: 'Belvárosi zsinagóga', de: 'Synagoge in der Innenstadt', sr: 'Sinagoga u Cetateu' } },
  casa_comandamentului: { style: 'baroque' },
  vicariatul_sarbesc: { style: 'baroque' },
  palatul_brück: { style: 'secession' },
  // the Secession palace rows lining Opera Square (heights are measured in OSM)
  palatul_lloyd: { style: 'secession', heightM: 24, name: { ro: 'Palatul Lloyd', en: 'Lloyd Palace', hu: 'Lloyd-palota', de: 'Lloyd-Palais', sr: 'Palata Lojd' } },
  palatul_loffler: { style: 'secession', heightM: 24, name: { ro: 'Palatul Löffler', en: 'Löffler Palace', hu: 'Löffler-palota', de: 'Löffler-Palais', sr: 'Palata Lefler' } },
  palatul_neuhausz: { style: 'secession', heightM: 24, name: { ro: 'Palatul Neuhausz', en: 'Neuhausz Palace', hu: 'Neuhausz-palota', de: 'Neuhausz-Palais', sr: 'Palata Nojhaus' } },
  palatul_dauerbach: { style: 'secession', heightM: 24, name: { ro: 'Palatul Dauerbach', en: 'Dauerbach Palace', hu: 'Dauerbach-palota', de: 'Dauerbach-Palais', sr: 'Palata Dauerbah' } },
  palatul_weiss: { style: 'secession', heightM: 24, name: { ro: 'Palatul Weiss', en: 'Weiss Palace', hu: 'Weiss-palota', de: 'Weiss-Palais', sr: 'Palata Vajs' } },
  palatul_hilt_vogel: { style: 'secession', heightM: 24, name: { ro: 'Palatul Hilt-Vogel', en: 'Hilt & Vogel Palace', hu: 'Hilt–Vogel-palota', de: 'Hilt-Vogel-Palais', sr: 'Palata Hilt-Fogel' } },
  palatul_szechenyi: { style: 'secession', heightM: 24, name: { ro: 'Palatul Széchényi', en: 'Széchényi Palace', hu: 'Széchenyi-palota', de: 'Széchenyi-Palais', sr: 'Palata Sečenji' } },
};
/** Point landmarks (statues, columns) → schematic landmark for names + approximate height. */
const POINT_HEROES = {
  statuia_sf_maria: 'st_mary_nepomuk_statue',
  coloana_ciumei: 'holy_trinity_column',
  lupoaica: 'capitoline_wolf',
};
/** Memorials raised after December 1989: must not appear in the 1989 scene. */
const BUILT_AFTER = { monument_martirii_1989: 1990 };

const CAVEAT = {
  ro: 'Amprentele clădirilor de azi · OpenStreetMap',
  en: "Today's building footprints · OpenStreetMap",
  hu: 'Az épületek mai alaprajza · OpenStreetMap',
  de: 'Heutige Gebäudegrundrisse · OpenStreetMap',
  sr: 'Današnji tlocrti zgrada · OpenStreetMap',
};

// ───────────────────────────── helpers ─────────────────────────────

const signedArea = (ring) => {
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, z1] = ring[i];
    const [x2, z2] = ring[(i + 1) % ring.length];
    a += x1 * z2 - x2 * z1;
  }
  return a / 2;
};
const centroidOf = (ring) => {
  // area-weighted centroid (falls back to the vertex mean for degenerate rings)
  let a = 0, cx = 0, cz = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, z1] = ring[i];
    const [x2, z2] = ring[(i + 1) % ring.length];
    const f = x1 * z2 - x2 * z1;
    a += f; cx += (x1 + x2) * f; cz += (z1 + z2) * f;
  }
  if (Math.abs(a) < 1e-9) return ring.reduce((s, p) => [s[0] + p[0] / ring.length, s[1] + p[1] / ring.length], [0, 0]);
  return [cx / (3 * a), cz / (3 * a)];
};
const pointInRing = ([px, pz], ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j];
    if (zi > pz !== zj > pz && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
};
/** Largest z where the vertical line x = px crosses the ring (the southern façade). */
const southEdgeZ = (px, ring) => {
  let best = -Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j];
    if ((xi <= px && px <= xj) || (xj <= px && px <= xi)) {
      const z = xi === xj ? Math.max(zi, zj) : zi + ((px - xi) / (xj - xi)) * (zj - zi);
      if (z > best) best = z;
    }
  }
  return best === -Infinity ? null : best;
};
/** Sutherland–Hodgman: clip a polygon to the tabletop square [-GRID, GRID]². */
const clipToGrid = (poly) => {
  const edges = [
    [(p) => p[0] >= -GRID, (a, b) => { const t = (-GRID - a[0]) / (b[0] - a[0]); return [-GRID, a[1] + t * (b[1] - a[1])]; }],
    [(p) => p[0] <= GRID, (a, b) => { const t = (GRID - a[0]) / (b[0] - a[0]); return [GRID, a[1] + t * (b[1] - a[1])]; }],
    [(p) => p[1] >= -GRID, (a, b) => { const t = (-GRID - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), -GRID]; }],
    [(p) => p[1] <= GRID, (a, b) => { const t = (GRID - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), GRID]; }],
  ];
  let out = poly;
  for (const [inside, cut] of edges) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i], prev = input[(i + input.length - 1) % input.length];
      if (inside(cur)) { if (!inside(prev)) out.push(cut(prev, cur)); out.push(cur); }
      else if (inside(prev)) out.push(cut(prev, cur));
    }
    if (!out.length) break;
  }
  return out.map(([x, z]) => [r3(x), r3(z)]);
};
const fold = (s) => String(s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
const circle = ([cx, cz], r, n = 12) =>
  Array.from({ length: n }, (_, i) => [r3(cx + r * Math.cos((i / n) * 2 * Math.PI)), r3(cz - r * Math.sin((i / n) * 2 * Math.PI))]);

/** OSM {default, ro?, en?…} → full 5-language object (missing languages fall back to the local name). */
const fullName = (n) => {
  if (!n) return null;
  const base = n.ro || n.default || n.en || Object.values(n)[0];
  return Object.fromEntries(LANGS.map((l) => [l, n[l] || base]));
};
const parseYear = (v) => {
  const m = String(v || '').match(/\b(1[5-9]\d\d|20\d\d)\b/);
  return m ? Number(m[1]) : null;
};
const parseM = (v) => {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** OSM height includes the roof. Split it, using roof:height / roof:levels when tagged. */
function roofSplit(heightM, minHeightM, roofShape, areaM2, tags) {
  const span = Math.max(0, heightM - minHeightM);
  const shape = roofShape || 'flat';
  let roofM = parseM(tags['roof:height']);
  let source = 'tag';
  if (roofM == null && parseM(tags['roof:levels'])) roofM = parseM(tags['roof:levels']) * 3;
  if (roofM == null) {
    source = shape === 'flat' ? 'flat' : 'estimate';
    if (shape === 'flat') roofM = 0;
    else if (shape === 'pyramidal' && areaM2 < 150) roofM = span * 0.4; // tower spire
    else if (/^(onion|dome|round)$/.test(shape)) roofM = Math.min(span * 0.3, 10);
    else roofM = Math.min(span * 0.3, 6); // gabled / hipped / side_hipped / mansard …
  }
  roofM = Math.min(roofM, span * 0.8);
  return { wallHeightM: r1(span - roofM), roofHeightM: r1(roofM), roofHeightSource: source };
}

// ───────────────────────────── build one plaza ─────────────────────────────

function buildPlaza(schematic, map) {
  const k = GRID / map.extent; // 2.5 → 2
  const metersPerUnit = map.metersPerUnit / k;
  const vx = schematic.verticalExaggeration || 1.5;
  const S = ([x, z]) => [r3(x * k), r3(z * k)];
  const H = (m) => r3((m / metersPerUnit) * vx); // vertical units (exaggerated, as in monuments3d.js)
  const unitsFromM = (m) => m / metersPerUnit;
  const eraYear = schematic.year;
  const schematicById = Object.fromEntries([...schematic.buildings, ...schematic.landmarks].map((b) => [b.id, b]));

  // 1) buildings in grid units
  const buildings = map.buildings.map((b) => {
    const footprint = b.footprint.map(S);
    const hero = b.landmark && b.landmark.matchedBy === 'name' ? HEROES[b.landmark.key] : null;
    const sch = hero && hero.schematicId ? schematicById[hero.schematicId] : null;
    const builtYear = parseYear(b.tags.start_date);
    return {
      id: b.id,
      osmId: b.id,
      name: (sch && sch.name) || (hero && hero.name) || fullName(b.name),
      landmark: !!hero,
      landmarkKey: b.landmark ? b.landmark.key : null,
      landmarkLabel: b.landmark ? b.landmark.label : null,
      style: (hero && hero.style) || null,
      built: (hero && hero.built) || (sch && sch.built) || b.tags.start_date || null,
      builtYear,
      existsInEra: builtYear ? builtYear <= eraYear : null,
      isPart: b.isPart,
      parentId: null,
      hasParts: false,
      parts: [],
      footprint,
      holes: b.holes.map((h) => h.map(S)),
      centroid: S(b.centroid),
      areaM2: b.areaM2,
      heightM: b.heightM,
      heightSource: b.heightSource, // 'height' | 'levels' | 'default' (12 m guess) | 'estimate' | 'parts'
      minHeightM: b.minHeightM || 0,
      levels: b.levels,
      roof: b.roofShape || (b.heightSource === 'height' ? 'flat' : null),
      color: b.tags['building:colour'] || null,
      roofColor: b.tags['roof:colour'] || null,
      material: b.tags['building:material'] || null,
      approximate: b.heightSource === 'default',
      _hero: hero,
      _sch: sch,
    };
  });

  // 2) Simple 3D Buildings: link each part to the smallest outline that contains its centroid
  const outlines = buildings.filter((b) => !b.isPart).sort((a, b) => a.areaM2 - b.areaM2);
  for (const part of buildings.filter((b) => b.isPart)) {
    const parent = outlines.find((o) => pointInRing(part.centroid, o.footprint));
    if (!parent) continue;
    part.parentId = parent.id;
    parent.parts.push(part.id);
    parent.hasParts = true;
  }
  for (const o of outlines.filter((b) => b.hasParts)) {
    // the outline's height = tallest part (useful for labels/picking; the parts carry the real massing)
    const tallest = Math.max(...o.parts.map((id) => buildings.find((b) => b.id === id).heightM));
    if (o.heightSource === 'default' || tallest > o.heightM) {
      o.heightM = tallest;
      o.heightSource = 'parts';
      o.approximate = false;
    }
    // parts inherit the hero tag so the renderer can glow the whole ensemble
    for (const id of o.parts) {
      const p = buildings.find((b) => b.id === id);
      if (o.landmark && !p.landmarkKey) { p.landmarkKey = o.landmarkKey; p.landmark = true; }
    }
  }

  // 3) hero fixes where OSM has no height and no parts
  const synthetic = [];
  for (const b of buildings) {
    const hero = b._hero;
    if (!hero || b.isPart || b.hasParts) continue;
    if (b.landmarkKey === 'catedrala_mitropolitana' && b.heightM > 60) {
      // OSM's 90.5 m is the TOP of the central tower; a 90 m prism over the whole cross would be wrong.
      const topM = b.heightM;
      b.heightM = hero.bodyHeightM;
      b.heightSource = 'estimate';
      b.roof = b.roof || 'tiled_multicolour';
      b.approximate = true;
      b.hasParts = true; // body + synthetic tower are both parts…
      const c = centroidOf(b.footprint);
      const towerR = unitsFromM(9);
      synthetic.push({
        id: `${b.id}#central_tower`, osmId: null, synthetic: true, approximate: true,
        name: { ro: 'Turnul central', en: 'Central tower', hu: 'Központi torony', de: 'Zentralturm', sr: 'Centralna kula' },
        landmark: true, landmarkKey: b.landmarkKey, isPart: true, parentId: b.id, hasParts: false, parts: [],
        footprint: circle(c, towerR), holes: [], centroid: [r3(c[0]), r3(c[1])], areaM2: r1(Math.PI * 81),
        heightM: topM, heightSource: 'height', minHeightM: hero.bodyHeightM, roof: 'tiled_cupola', color: null, roofColor: null,
        existsInEra: b.existsInEra, builtYear: b.builtYear, built: b.built,
      });
      synthetic.push({ ...b, id: `${b.id}#body`, osmId: b.id, isPart: true, parentId: b.id, hasParts: false, parts: [], synthetic: true, _hero: null, _sch: null });
      b.parts = [`${b.id}#body`, `${b.id}#central_tower`];
      b.heightM = topM; // outline keeps the true top for labels
    } else if (b.heightSource === 'default' && hero.heightM) {
      b.heightM = hero.heightM;
      b.heightSource = 'estimate';
      b.approximate = true;
    }
  }
  const all = [...buildings, ...synthetic];

  // 4) finalize heights (+ roof split) in schematic units
  const outBuildings = all.map(({ _hero, _sch, ...b }) => {
    const split = roofSplit(b.heightM, b.minHeightM, b.roof, b.areaM2, (map.buildings.find((m) => m.id === b.osmId) || { tags: {} }).tags);
    return {
      ...b,
      ...split,
      height: H(b.heightM - b.minHeightM),
      baseY: H(b.minHeightM),
      wallHeight: H(split.wallHeightM),
      roofHeight: H(split.roofHeightM),
      render: b.hasParts ? 'parts' : 'solid', // 'parts' → draw this outline's parts instead (or as a ghost)
    };
  });

  // 5) point landmarks: OSM statues/columns/memorials + the Opera balcony + era sound sources
  const landmarks = map.monuments.map((m) => {
    const key = m.landmark ? m.landmark.key : null;
    const sch = key && POINT_HEROES[key] ? schematicById[POINT_HEROES[key]] : null;
    const builtYear = BUILT_AFTER[key] || parseYear(m.tags.start_date);
    const pos = S([m.position[0], m.position[2]]);
    return {
      id: m.id, osmId: m.id, type: m.kind || 'monument',
      name: (sch && sch.name) || fullName(m.name),
      landmark: !!key, landmarkKey: key,
      position: [pos[0], 0, pos[1]],
      heightM: sch ? sch.heightM : null, height: sch && sch.heightM ? H(sch.heightM) : null,
      built: (sch && sch.built) || m.tags.start_date || null,
      builtYear, existsInEra: builtYear ? builtYear <= eraYear : null,
      approximate: !sch ? false : true,
    };
  });

  const opera = outBuildings.find((b) => b.landmarkKey === 'opera' && !b.isPart);
  const schBalcony = schematicById.opera_balcony;
  if (opera && schBalcony) {
    // Facing the square (south). Use the outline's area centroid x, then the façade line at that x.
    const [cx] = centroidOf(opera.footprint);
    const z = southEdgeZ(cx, opera.footprint);
    if (z != null) {
      landmarks.push({
        ...schBalcony,
        osmId: null, parent: opera.id, approximate: true,
        position: [r3(cx), H(9), r3(z + unitsFromM(1.5))], // first-floor balcony ≈ 9 m up, just in front of the façade
        height: H(schBalcony.heightM), widthM: schBalcony.widthM, facing: 'south',
      });
    }
  }

  // 6) ground = the real square. Prefer an OSM place=square, then an area NAMED like the plaza; if the square
  //    itself isn't mapped as an area (Piața Unirii), use the extent of the pedestrian ways named after it.
  //    Never "largest pedestrian area" — that can be a side street.
  const plazaName = fold(map.name);
  const named = (n) => n && Object.values(n).some((v) => fold(v) === plazaName);
  const bySize = (a, b) => Math.abs(signedArea(b.polygon)) - Math.abs(signedArea(a.polygon));
  const sq = map.areas.filter((a) => a.kind === 'square').sort(bySize)[0] || map.areas.filter((a) => named(a.name)).sort(bySize)[0];
  let ground;
  if (sq) {
    ground = { id: sq.id, kind: sq.kind === 'square' ? 'paved_square' : 'pedestrian_square', name: fullName(sq.name), polygon: clipToGrid(sq.polygon.map(S)), approximate: false };
  } else {
    const pts = map.paths.filter((p) => named(p.name)).flatMap((p) => p.points.map(S));
    const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]);
    const [x0, x1, z0, z1] = pts.length > 3 ? [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)] : [-GRID, GRID, -GRID, GRID];
    ground = { id: 'square', kind: 'paved_square', name: fullName({ default: map.name }), polygon: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => [r3(x), r3(z)]), approximate: true, derivedFrom: 'extent of OSM pedestrian ways named after the square' };
  }
  const groundC = centroidOf(ground.polygon);
  for (const s of schematic.landmarks.filter((l) => l.atmosphere)) {
    landmarks.push({ ...s, position: [r3(groundC[0]), 0, r3(groundC[1])], approximate: true }); // sound source: centre of the real square
  }

  const areas = map.areas
    .map((a) => ({ id: a.id, kind: a.kind, name: fullName(a.name), polygon: clipToGrid(a.polygon.map(S)), approximate: false }))
    .filter((a) => a.polygon.length >= 3);
  for (const a of schematic.areas.filter((x) => x.kind === 'crowd')) {
    // the 1989 crowd stood on the real square
    areas.push({ ...a, polygon: ground.polygon, approximate: true });
  }

  const tracks = map.paths
    .filter((p) => p.kind === 'tram')
    .map((p) => ({ id: p.id, label: 'tram track (OSM, present day)', points: p.points.map(S), gauge: r3(unitsFromM(1.0)), approximate: false }));
  const paths = map.paths
    .filter((p) => p.kind !== 'tram')
    .map((p) => ({ id: p.id, kind: p.kind, name: fullName(p.name), points: p.points.map(S) }));

  const heroes = outBuildings.filter((b) => b.landmark && !b.isPart);
  return {
    id: schematic.id,
    eraId: schematic.eraId,
    year: eraYear,
    name: schematic.name,
    notes: schematic.notes,
    center: map.center,
    accuracy: 'surveyed',
    source: 'osm',
    osmMap: map.id,
    attribution: map.attribution,
    license: map.license,
    footprintsAsOf: map.osmTimestamp || map.fetchedAt,
    caveat: eraYear < 2000 ? CAVEAT : null,
    grid: { min: -GRID, max: GRID },
    metersPerUnit: r3(metersPerUnit),
    verticalExaggeration: vx,
    stats: {
      buildings: outBuildings.filter((b) => !b.isPart).length,
      parts: outBuildings.filter((b) => b.isPart).length,
      measuredHeight: outBuildings.filter((b) => ['height', 'levels', 'parts'].includes(b.heightSource)).length,
      estimatedHeight: outBuildings.filter((b) => ['default', 'estimate'].includes(b.heightSource)).length,
      heroLandmarks: heroes.map((h) => h.landmarkKey),
    },
    ground,
    buildings: outBuildings,
    landmarks,
    areas,
    tracks,
    paths,
    glb: schematic.glb,
  };
}

// ───────────────────────────── load once ─────────────────────────────

function loadMaps() {
  const maps = {};
  for (const id of new Set(Object.values(OSM_MAP_FOR_PLAZA))) {
    try {
      maps[id] = JSON.parse(fs.readFileSync(path.join(MAPS_DIR, `${id}.json`), 'utf8'));
    } catch (err) {
      console.warn(`[osm] ${id}.json not loaded (${err.code || err.message}) — that plaza falls back to the schematic layout`);
    }
  }
  return maps;
}

function build() {
  const maps = loadMaps();
  const plazas = MONUMENTS_3D.plazas.map((sch) => {
    const map = maps[OSM_MAP_FOR_PLAZA[sch.id]];
    if (!map) return sch; // schematic fallback keeps the API complete
    try {
      return buildPlaza(sch, map);
    } catch (err) {
      console.warn(`[osm] ${sch.id}: build failed (${err.message}) — using schematic`);
      return sch;
    }
  });
  const osmCount = plazas.filter((p) => p.source === 'osm').length;
  return Object.freeze({
    version: 2,
    accuracy: osmCount === plazas.length ? 'surveyed' : osmCount ? 'mixed' : 'schematic',
    source:
      'Building footprints, heights and 3D building parts from OpenStreetMap (surveyed by mappers; present-day city). ' +
      'Hero names/dates from the team’s checked schematic data; estimated values are flagged (heightSource / approximate / synthetic).',
    attribution: '© OpenStreetMap contributors, ODbL 1.0',
    coordinateSystem: {
      ...MONUMENTS_3D.coordinateSystem,
      footprint: '[x, z] pairs, open ring; holes = courtyards. Extrude from baseY to baseY + height (wall to wallHeight, then the roof).',
      parts: 'Simple 3D Buildings: if a building has `hasParts`, render its parts (isPart, parentId) and skip/ghost the outline.',
      heights: '`height`/`baseY`/`wallHeight`/`roofHeight` are in tabletop units WITH verticalExaggeration; `*M` fields are real metres.',
    },
    roofTypes: [...new Set([...MONUMENTS_3D.roofTypes, 'gabled', 'hipped', 'side_hipped', 'pyramidal', 'round', 'onion', 'dome'])],
    plazas,
  });
}

export const MONUMENTS_3D_OSM = build();
export const getOsmPlaza = (id) => MONUMENTS_3D_OSM.plazas.find((p) => p.id === id) || null;
