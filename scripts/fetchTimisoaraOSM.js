#!/usr/bin/env node
/**
 * fetchTimisoaraOSM.js — one-off BUILD script (not run at demo time).
 *
 * Downloads real building footprints, heights/levels, tram tracks and pedestrian paths for
 * three Timișoara plazas from the public OpenStreetMap Overpass API, converts them to
 * normalized tabletop coordinates, and writes static JSON to
 *   client/public/assets/ar/maps/<plazaId>.json
 * so the AR view loads them instantly with zero external calls during the demo.
 *
 * Usage:   node scripts/fetchTimisoaraOSM.js            (all plazas)
 *          node scripts/fetchTimisoaraOSM.js piata_unirii (one plaza)
 * Needs:   Node ≥ 18 (native fetch). No API key, no npm packages.
 *
 * Data © OpenStreetMap contributors, ODbL 1.0 — keep the `attribution` field visible in the UI.
 *
 * Coordinate system (same as server/monuments3d.js):
 *   x → east, z → south (north = -z), y → up, ground at y = 0.
 *   Equirectangular projection around the bbox centre, then uniformly scaled so every
 *   kept vertex fits inside [-EXTENT, EXTENT] on x and z. `height` uses the SAME scale
 *   (true proportions); apply your own vertical exaggeration in the renderer.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
const DELAY_MS = 2000;
const REQUEST_TIMEOUT_MS = 150000;
const FORCE = process.argv.includes('--force');
const EXTENT = 2.5; // tabletop half-size in units
const LEVEL_HEIGHT_M = 3.5;
const DEFAULT_HEIGHT_M = 12;
const EARTH_R = 6378137;
const OUT_DIR = path.resolve(__dirname, '..', 'client', 'public', 'assets', 'ar', 'maps');
const USER_AGENT = 'timisoara-time-capsule-build/1.0 (hackathon AR demo; static one-off export)';

// bbox = [south, west, north, east]
const PLAZAS = [
  { id: 'piata_libertatii', name: 'Piața Libertății', bbox: [45.7548, 21.226, 45.7565, 21.2288] },
  { id: 'piata_unirii', name: 'Piața Unirii', bbox: [45.757, 21.2275, 45.7592, 21.2305] },
  { id: 'piata_victoriei', name: 'Piața Victoriei', bbox: [45.7505, 21.224, 45.7545, 21.2275] },
];

/**
 * Landmark rules. Matched against a diacritic-free, lower-cased blob of the name tags.
 * `key` is stable so the renderer can swap in hero geometry.
 */
const LANDMARKS = [
  { key: 'opera', label: 'Opera / National Theatre (Palatul Culturii)', match: [/\bopera\b/, /teatrul national/, /palatul culturii/, /nemzeti szinhaz/] },
  { key: 'catedrala_mitropolitana', label: 'Orthodox Metropolitan Cathedral', match: [/catedrala mitropolitana/, /mitropolitan/, /metropolitan cathedral/] },
  { key: 'domul_catolic', label: 'Roman Catholic Cathedral (Dome of St. George)', match: [/\bdom(ul)?\b/, /sf(antul|\.)? gheorghe/, /szent gyorgy/, /st\.? george/, /romano-catolic/] },
  { key: 'catedrala_sarbeasca', label: 'Serbian Orthodox Cathedral', match: [/catedrala ortodoxa sarb/, /serbian orthodox cathedral/, /saborna crkva/, /szerb ortodox szekesegyhaz/] },
  { key: 'vicariatul_sarbesc', label: 'Serbian Vicarage (Episcopal Palace)', match: [/vicariat/, /episcopi(a|e) (ortodoxa )?sarb/] },
  { key: 'sinagoga_cetate', label: 'Cetate Synagogue', match: [/sinagog/, /synagog/, /zsinagog/] },
  { key: 'primaria_veche', label: 'Old Town Hall (Primăria Veche)', match: [/primaria veche/, /old town hall/, /regi varoshaza/, /altes rathaus/] },
  { key: 'palatul_baroc', label: 'Baroque Palace (National Museum of Art)', match: [/palatul baroc/, /baroque palace/, /muzeul (national )?de arta/, /museum of art/] },
  { key: 'palatul_lloyd', label: 'Lloyd Palace', match: [/lloyd/] },
  { key: 'palatul_loffler', label: 'Löffler Palace', match: [/loffler/] },
  { key: 'palatul_neuhausz', label: 'Neuhausz Palace', match: [/neuhaus/] },
  { key: 'palatul_dauerbach', label: 'Dauerbach Palace', match: [/dauerbach/] },
  { key: 'palatul_weiss', label: 'Weiss Palace', match: [/palatul weiss/, /weiss/] },
  { key: 'palatul_hilt_vogel', label: 'Hilt & Vogel Palace', match: [/hilt/] },
  { key: 'palatul_szechenyi', label: 'Széchenyi Palace', match: [/szechenyi/] },
  { key: 'palatul_brück', label: 'Brück House', match: [/bruck/] },
  { key: 'casa_comandamentului', label: 'Military Casino / Garrison Command', match: [/comandament/, /comenduir/, /garnizoan/, /cazinoul militar/, /military casino/] },
  { key: 'statuia_sf_maria', label: 'Statue of St. Mary and St. John of Nepomuk', match: [/nepomuk/] },
  { key: 'coloana_ciumei', label: 'Holy Trinity (plague) column', match: [/sfintei treimi/, /holy trinity/, /szentharomsag/, /ciumei/, /dreifaltigkeit/] },
  { key: 'monument_martirii_1989', label: 'Memorial to the martyrs of December 1989', match: [/martiri/, /eroilor revolutiei/, /revolutiei/, /1989/] },
  { key: 'lupoaica', label: 'Capitoline Wolf statue', match: [/lupoaic/, /capitoline/] },
];

// Fallback by OSM type when the name doesn't match a rule (still worth highlighting).
const TYPE_LANDMARKS = [
  { key: 'synagogue', label: 'Synagogue', test: (t) => t.building === 'synagogue' || t.religion === 'jewish' },
  { key: 'church', label: 'Church', test: (t) => /^(cathedral|church|chapel|basilica)$/.test(t.building || '') || t.amenity === 'place_of_worship' },
  { key: 'theatre', label: 'Theatre', test: (t) => t.amenity === 'theatre' },
  { key: 'museum', label: 'Museum', test: (t) => t.tourism === 'museum' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const round = (n, d = 3) => Math.round(n * 10 ** d) / 10 ** d;
const fold = (s) => String(s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// ───────────────────────────── Overpass ─────────────────────────────

function buildQuery([s, w, n, e]) {
  const b = `${s},${w},${n},${e}`;
  return `[out:json][timeout:120];
(
  way["building"](${b});
  relation["building"](${b});
  relation["type"="multipolygon"]["building"](${b});
  way["building:part"](${b});
  way["railway"="tram"](${b});
  way["highway"~"^(pedestrian|footway|living_street|steps)$"](${b});
  way["place"="square"](${b});
  relation["place"="square"](${b});
  way["area:highway"="pedestrian"](${b});
  node["historic"~"^(monument|memorial|statue|column|wayside_cross|wayside_shrine)$"](${b});
  way["historic"~"^(monument|memorial|statue|column)$"](${b});
  node["tourism"="artwork"](${b});
);
out body geom;`;
}

async function overpass(query) {
  let lastErr;
  for (let attempt = 0; attempt < 9; attempt++) {
    const url = ENDPOINTS[attempt % ENDPOINTS.length];
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT },
        body: 'data=' + encodeURIComponent(query),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), // a stuck mirror must not hang the build
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const json = await res.json();
      if (!Array.isArray(json.elements)) throw new Error('unexpected response (no elements)');
      // An overloaded server answers 200 with a PARTIAL result + `remark` ("runtime error: Query timed out…").
      if (json.remark && /error|timed out|out of memory/i.test(json.remark)) throw new Error(`truncated result: ${json.remark.slice(0, 120)}`);
      return { json, endpoint: url };
    } catch (err) {
      lastErr = err;
      console.warn(`  ! ${url} failed (${err.message}); retrying in ${DELAY_MS * 2 ** Math.min(attempt, 4)} ms`);
      await sleep(DELAY_MS * 2 ** Math.min(attempt, 4)); // 2, 4, 8, 16, 32 s …
    }
  }
  throw lastErr;
}

// ───────────────────────────── Geometry ─────────────────────────────

/** Join way segments (arrays of {lat,lon}) into closed rings — for multipolygon members. */
function assembleRings(segments) {
  const key = (p) => `${p.lat},${p.lon}`;
  const pool = segments.filter((s) => s && s.length > 1).map((s) => s.slice());
  const rings = [];
  while (pool.length) {
    let ring = pool.shift();
    let guard = 0;
    while (key(ring[0]) !== key(ring[ring.length - 1]) && guard++ < 1000) {
      const tail = key(ring[ring.length - 1]);
      const i = pool.findIndex((s) => key(s[0]) === tail || key(s[s.length - 1]) === tail);
      if (i < 0) break; // open ring — drop below
      const seg = pool.splice(i, 1)[0];
      ring = ring.concat(key(seg[0]) === tail ? seg.slice(1) : seg.reverse().slice(1));
    }
    if (key(ring[0]) === key(ring[ring.length - 1]) && ring.length >= 4) rings.push(ring);
  }
  return rings;
}

function makeProjector([s, w, n, e]) {
  const lat0 = (s + n) / 2;
  const lon0 = (w + e) / 2;
  const cos0 = Math.cos((lat0 * Math.PI) / 180);
  const toRad = Math.PI / 180;
  // metres: x east, z south
  const project = ({ lat, lon }) => [(lon - lon0) * toRad * EARTH_R * cos0, -(lat - lat0) * toRad * EARTH_R];
  const bboxHalfM = {
    x: ((e - w) / 2) * toRad * EARTH_R * cos0,
    z: ((n - s) / 2) * toRad * EARTH_R,
  };
  return { project, center: { lat: lat0, lng: lon0 }, bboxHalfM };
}

function signedArea(ring) {
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, z1] = ring[i];
    const [x2, z2] = ring[(i + 1) % ring.length];
    a += x1 * z2 - x2 * z1;
  }
  return a / 2;
}

function centroid(ring) {
  let x = 0, z = 0;
  for (const p of ring) { x += p[0]; z += p[1]; }
  return [x / ring.length, z / ring.length];
}

/** Open ring (no duplicate closing vertex), consecutive duplicates removed, fixed winding. */
function cleanRing(ringM, wantPositive) {
  const out = [];
  for (const p of ringM) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) > 0.05) out.push(p);
  }
  if (out.length > 1 && Math.hypot(out[0][0] - out.at(-1)[0], out[0][1] - out.at(-1)[1]) < 0.05) out.pop();
  if (out.length < 3) return null;
  if ((signedArea(out) > 0) !== wantPositive) out.reverse();
  return out;
}

/** Liang–Barsky: clip a polyline to the square [-h, h]², returning one or more pieces. */
function clipPolyline(pts, h) {
  const pieces = [];
  let cur = [];
  const inside = ([x, z]) => Math.abs(x) <= h && Math.abs(z) <= h;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
    const dx = x1 - x0, dz = z1 - z0;
    let t0 = 0, t1 = 1, ok = true;
    for (const [p, q] of [[-dx, x0 + h], [dx, h - x0], [-dz, z0 + h], [dz, h - z0]]) {
      if (p === 0) { if (q < 0) { ok = false; break; } continue; }
      const r = q / p;
      if (p < 0) { if (r > t1) { ok = false; break; } if (r > t0) t0 = r; }
      else { if (r < t0) { ok = false; break; } if (r < t1) t1 = r; }
    }
    if (!ok) { if (cur.length > 1) pieces.push(cur); cur = []; continue; }
    const a = [x0 + t0 * dx, z0 + t0 * dz];
    const b = [x0 + t1 * dx, z0 + t1 * dz];
    if (!cur.length) cur.push(a);
    cur.push(b);
    if (t1 < 1 || !inside(pts[i + 1])) { if (cur.length > 1) pieces.push(cur); cur = []; }
  }
  if (cur.length > 1) pieces.push(cur);
  return pieces;
}

// ───────────────────────────── Tags ─────────────────────────────

function parseMeters(v) {
  if (v == null) return null;
  const s = String(v).trim().replace(',', '.');
  const m = s.match(/^(-?\d+(?:\.\d+)?)\s*(m|ft|')?/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return m[2] && /ft|'/i.test(m[2]) ? n * 0.3048 : n;
}

function estimateHeight(t) {
  const h = parseMeters(t.height) ?? parseMeters(t['building:height']);
  if (h) return { heightM: h, heightSource: 'height' };
  const levels = parseFloat(t['building:levels']);
  if (Number.isFinite(levels) && levels > 0) {
    const roof = parseFloat(t['roof:levels']);
    const total = levels + (Number.isFinite(roof) && roof > 0 ? roof * 0.5 : 0);
    return { heightM: total * LEVEL_HEIGHT_M, heightSource: 'levels' };
  }
  return { heightM: DEFAULT_HEIGHT_M, heightSource: 'default' };
}

function nameBlob(t) {
  return fold(['name', 'name:ro', 'name:en', 'name:hu', 'name:de', 'name:sr', 'name:sr-Latn', 'alt_name', 'old_name', 'official_name', 'description', 'wikipedia', 'subject:wikipedia', 'memorial', 'inscription']
    .map((k) => t[k]).filter(Boolean).join(' | '));
}

function classifyLandmark(t) {
  const blob = nameBlob(t);
  if (blob) {
    for (const rule of LANDMARKS) if (rule.match.some((re) => re.test(blob))) return { key: rule.key, label: rule.label, matchedBy: 'name' };
  }
  for (const rule of TYPE_LANDMARKS) if (rule.test(t)) return { key: rule.key, label: rule.label, matchedBy: 'type' };
  return null;
}

const pickName = (t) => {
  const n = {};
  for (const [k, lang] of [['name', 'default'], ['name:ro', 'ro'], ['name:en', 'en'], ['name:hu', 'hu'], ['name:de', 'de'], ['name:sr', 'sr']]) if (t[k]) n[lang] = t[k];
  return Object.keys(n).length ? n : null;
};

const KEEP_TAGS = ['building', 'building:part', 'building:levels', 'building:min_level', 'height', 'min_height', 'roof:shape', 'roof:height', 'roof:levels', 'roof:direction', 'roof:orientation', 'roof:angle', 'roof:colour', 'building:colour', 'building:material', 'amenity', 'tourism', 'historic', 'religion', 'start_date', 'architect', 'wikidata', 'wikipedia', 'addr:street', 'addr:housenumber'];
const pickTags = (t) => Object.fromEntries(KEEP_TAGS.filter((k) => t[k] != null).map((k) => [k, t[k]]));

// ───────────────────────────── Plaza build ─────────────────────────────

function processPlaza(plaza, elements) {
  const { project, center, bboxHalfM } = makeProjector(plaza.bbox);
  const inBboxM = ([x, z]) => Math.abs(x) <= bboxHalfM.x && Math.abs(z) <= bboxHalfM.z;

  // 1) Buildings (ways + multipolygon relations) in metres.
  const rawBuildings = [];
  const relationMemberWays = new Set();
  for (const el of elements) {
    if (el.type !== 'relation' || !el.tags || !(el.tags.building || el.tags['building:part'])) continue;
    const outers = assembleRings((el.members || []).filter((m) => m.type === 'way' && m.role !== 'inner' && m.geometry).map((m) => m.geometry));
    const inners = assembleRings((el.members || []).filter((m) => m.type === 'way' && m.role === 'inner' && m.geometry).map((m) => m.geometry));
    (el.members || []).forEach((m) => m.type === 'way' && relationMemberWays.add(m.ref));
    outers.forEach((outer, i) =>
      rawBuildings.push({ osm: `relation/${el.id}${outers.length > 1 ? `#${i}` : ''}`, tags: el.tags, outer: outer.map(project), inners: inners.map((r) => r.map(project)) }),
    );
  }
  for (const el of elements) {
    if (el.type !== 'way' || !el.tags || !el.geometry) continue;
    if (!(el.tags.building || el.tags['building:part'])) continue;
    if (relationMemberWays.has(el.id) && !el.tags.building) continue; // pure member way
    const g = el.geometry;
    if (g.length < 4 || g[0].lat !== g.at(-1).lat || g[0].lon !== g.at(-1).lon) continue;
    rawBuildings.push({ osm: `way/${el.id}`, tags: el.tags, outer: g.map(project), inners: [] });
  }

  // Keep buildings whose centroid lies inside the bbox (edge buildings are kept whole).
  const kept = [];
  for (const b of rawBuildings) {
    const outer = cleanRing(b.outer, true);
    if (!outer || !inBboxM(centroid(outer))) continue;
    if (Math.abs(signedArea(outer)) < 4) continue; // < 4 m² — noise
    kept.push({ ...b, outer, inners: b.inners.map((r) => cleanRing(r, false)).filter(Boolean) });
  }

  // 2) Uniform scale so every kept vertex AND the bbox fit inside [-EXTENT, EXTENT].
  let maxAbs = Math.max(bboxHalfM.x, bboxHalfM.z);
  for (const b of kept) for (const [x, z] of b.outer) maxAbs = Math.max(maxAbs, Math.abs(x), Math.abs(z));
  const metersPerUnit = maxAbs / EXTENT;
  const U = (m) => round(m / metersPerUnit);
  const P = ([x, z]) => [U(x), U(z)];

  const buildings = kept
    .map((b) => {
      const t = b.tags;
      const { heightM, heightSource } = estimateHeight(t);
      const minHeightM = parseMeters(t.min_height) ?? (parseFloat(t['building:min_level']) > 0 ? parseFloat(t['building:min_level']) * LEVEL_HEIGHT_M : 0);
      const levels = parseFloat(t['building:levels']);
      const c = centroid(b.outer);
      return {
        id: b.osm,
        name: pickName(t),
        landmark: classifyLandmark(t),
        isPart: !t.building && !!t['building:part'],
        footprint: b.outer.map(P),
        holes: b.inners.map((r) => r.map(P)),
        centroid: P(c),
        areaM2: round(Math.abs(signedArea(b.outer)), 1),
        heightM: round(heightM, 1),
        heightSource,
        height: U(heightM),
        minHeightM: round(minHeightM, 1),
        baseY: U(minHeightM),
        levels: Number.isFinite(levels) ? levels : null,
        roofShape: t['roof:shape'] || null,
        tags: pickTags(t),
      };
    })
    .sort((a, b) => b.areaM2 - a.areaM2);

  // 3) Paths: tram tracks + pedestrian ways, clipped to the tabletop square.
  const paths = [];
  const areas = [];
  for (const el of elements) {
    if (el.type !== 'way' || !el.tags || !el.geometry) continue;
    const t = el.tags;
    let kind = null;
    if (t.railway === 'tram') kind = 'tram';
    else if (/^(pedestrian|footway|living_street|steps)$/.test(t.highway || '')) kind = t.highway;
    const ptsU = el.geometry.map(project).map(P);
    const closed = el.geometry.length > 3 && el.geometry[0].lat === el.geometry.at(-1).lat && el.geometry[0].lon === el.geometry.at(-1).lon;
    if ((t.place === 'square' || t['area:highway'] === 'pedestrian' || (kind === 'pedestrian' && t.area === 'yes')) && closed) {
      const ring = cleanRing(el.geometry.map(project), true);
      if (ring) areas.push({ id: `way/${el.id}`, kind: t.place === 'square' ? 'square' : 'pedestrian_area', name: pickName(t), polygon: ring.map(P) });
      continue;
    }
    if (!kind) continue;
    clipPolyline(ptsU, EXTENT).forEach((pts, i) =>
      paths.push({ id: `way/${el.id}${i ? `#${i}` : ''}`, kind, name: pickName(t), points: pts.map(([x, z]) => [round(x), round(z)]), tags: pickTags(t) }),
    );
  }
  for (const el of elements) {
    if (el.type !== 'relation' || !el.tags || el.tags.place !== 'square') continue;
    for (const ring of assembleRings((el.members || []).filter((m) => m.type === 'way' && m.role !== 'inner' && m.geometry).map((m) => m.geometry))) {
      const r = cleanRing(ring.map(project), true);
      if (r) areas.push({ id: `relation/${el.id}`, kind: 'square', name: pickName(el.tags), polygon: r.map(P) });
    }
  }

  // 4) Point landmarks (statues, memorials, artworks) inside the bbox.
  const isMonumentTag = (t) => /^(monument|memorial|statue|column|wayside_cross|wayside_shrine)$/.test(t.historic || '') || t.tourism === 'artwork';
  const monuments = elements
    .filter((el) => el.tags && (el.type === 'node' || (el.type === 'way' && el.geometry && !el.tags.building)) && isMonumentTag(el.tags))
    .map((el) => ({ el, m: el.type === 'node' ? project(el) : centroid(el.geometry.map(project)) }))
    .filter(({ m }) => inBboxM(m))
    .map(({ el, m }) => ({
      id: `node/${el.id}`,
      name: pickName(el.tags),
      landmark: classifyLandmark(el.tags),
      kind: el.tags.historic || el.tags.artwork_type || el.tags.tourism,
      position: [U(m[0]), 0, U(m[1])],
      tags: pickTags(el.tags),
    }));

  const heroes = [...buildings, ...monuments].filter((b) => b.landmark && b.landmark.matchedBy === 'name');

  return {
    id: plaza.id,
    name: plaza.name,
    source: 'OpenStreetMap (Overpass API)',
    attribution: '© OpenStreetMap contributors, ODbL 1.0',
    license: 'ODbL-1.0',
    fetchedAt: new Date().toISOString(),
    bbox: { south: plaza.bbox[0], west: plaza.bbox[1], north: plaza.bbox[2], east: plaza.bbox[3] },
    center,
    coordinateSystem: 'x east, z south (north = -z), y up; units = tabletop units; equirectangular projection about bbox centre',
    extent: EXTENT,
    metersPerUnit: round(metersPerUnit, 3),
    unitsPerMeter: round(1 / metersPerUnit, 6),
    stats: {
      buildings: buildings.length,
      withRealHeight: buildings.filter((b) => b.heightSource === 'height').length,
      withLevels: buildings.filter((b) => b.heightSource === 'levels').length,
      defaultHeight: buildings.filter((b) => b.heightSource === 'default').length,
      paths: paths.length,
      tramSegments: paths.filter((p) => p.kind === 'tram').length,
      areas: areas.length,
      monuments: monuments.length,
    },
    heroLandmarks: heroes.map((h) => ({ id: h.id, key: h.landmark.key, label: h.landmark.label, name: h.name })),
    buildings,
    paths,
    areas,
    monuments,
  };
}

// ───────────────────────────── Main ─────────────────────────────

async function main() {
  const only = process.argv.slice(2).find((a) => !a.startsWith('--'));
  const todo = only ? PLAZAS.filter((p) => p.id === only) : PLAZAS;
  if (!todo.length) throw new Error(`unknown plaza "${only}" — use one of: ${PLAZAS.map((p) => p.id).join(', ')}`);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (let i = 0; i < todo.length; i++) {
    const plaza = todo[i];
    if (i > 0) await sleep(DELAY_MS);
    console.log(`→ ${plaza.id}  bbox ${plaza.bbox.join(', ')}`);
    const { json, endpoint } = await overpass(buildQuery(plaza.bbox));
    const out = processPlaza(plaza, json.elements);
    out.endpoint = endpoint;
    out.osmTimestamp = json.osm3s && json.osm3s.timestamp_osm_base;
    if (!out.buildings.length) throw new Error(`${plaza.id}: Overpass returned no buildings — refusing to write an empty map`);
    const file = path.join(OUT_DIR, `${plaza.id}.json`);
    // Shrink guard: a sudden drop in buildings means a partial download — keep the old file.
    let prev = null;
    try { prev = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* first run */ }
    if (prev && !FORCE && out.buildings.length < prev.buildings.length * 0.9) {
      console.warn(`  ! ${plaza.id}: got ${out.buildings.length} buildings, existing file has ${prev.buildings.length} — looks truncated, keeping the old file (use --force to overwrite)`);
      continue;
    }
    fs.writeFileSync(file, JSON.stringify(out) + '\n');
    const s = out.stats;
    console.log(
      `  ✓ ${path.relative(process.cwd(), file)}  ${(fs.statSync(file).size / 1024).toFixed(1)} KB · ${s.buildings} buildings ` +
        `(${s.withRealHeight} height / ${s.withLevels} levels / ${s.defaultHeight} default) · ${s.paths} paths (${s.tramSegments} tram) · ` +
        `${s.monuments} monuments · ${out.metersPerUnit} m/unit`,
    );
    if (out.heroLandmarks.length) console.log(`    landmarks: ${out.heroLandmarks.map((h) => `${h.key} (${h.name?.default || h.name?.ro || '?'})`).join(', ')}`);
  }
}

main().catch((err) => {
  console.error('✗', err.message);
  process.exit(1);
});
