/**
 * Miniature 3D plazas of Timișoara for the AR tabletop (Phase 2). Owner: Member 1.
 * Served by GET /api/monuments-3d (optionally ?plaza=<id>).
 *
 * HONESTY NOTE (read before demoing): these layouts are SCHEMATIC and hand-authored
 * from general knowledge of the squares, not surveyed GIS data. Landmark identities,
 * their side of the square and construction dates are well established; footprints,
 * exact positions and heights are approximate (`approximate: true`). Unnamed perimeter
 * buildings are deliberately generic ("perimeter block") rather than invented names.
 * Survey-accurate footprints now come from OpenStreetMap: see osmPlazas.js, which is the
 * DEFAULT for GET /api/monuments-3d and reuses this schema, these plaza ids, names, dates and
 * sound sources. This file stays as the fallback (?source=schematic, or if a map file is missing).
 *
 * Coordinate system (tabletop units, same for every plaza):
 *   x → east, z → south (north = -z), y → up. Ground at y = 0.
 *   Every plaza fits the normalized grid [-2, 2] on x and z.
 *   Authoring is in metres around the plaza centre, converted with `metersPerUnit`.
 *   Heights use `verticalExaggeration` so façades read at miniature scale;
 *   `heightM` keeps the approximate real value.
 */

const r2 = (n) => Math.round(n * 1000) / 1000;

function makePlaza({ id, metersPerUnit, verticalExaggeration = 1.6, ...rest }) {
  const u = (m) => r2(m / metersPerUnit);
  const h = (m) => r2((m / metersPerUnit) * verticalExaggeration);

  /** Rectangle footprint (metres): centre, width (x), depth (z), rotation° clockwise from north. */
  const rect = (cx, cz, w, d, rotDeg = 0) => {
    const a = (rotDeg * Math.PI) / 180;
    const c = Math.cos(a), s = Math.sin(a);
    return [
      [-w / 2, -d / 2],
      [w / 2, -d / 2],
      [w / 2, d / 2],
      [-w / 2, d / 2],
    ].map(([x, z]) => [u(cx + x * c - z * s), u(cz + x * s + z * c)]);
  };
  /** Latin-cross footprint (churches): nave along z, transept along x. */
  const cross = (cx, cz, len, wid, armLen, armWid) => {
    const L = len / 2, W = wid / 2, A = armLen / 2, B = armWid / 2;
    const off = -len * 0.12; // transept slightly toward the apse (north)
    return [
      [-W, -L], [W, -L], [W, off - B], [A, off - B], [A, off + B], [W, off + B],
      [W, L], [-W, L], [-W, off + B], [-A, off + B], [-A, off - B], [-W, off - B],
    ].map(([x, z]) => [u(cx + x), u(cz + z)]);
  };
  const building = ({ footprint, heightM, ...b }) => ({ approximate: true, heightM, height: h(heightM), baseY: 0, footprint, ...b });
  const landmark = ({ xM, zM, yM = 0, heightM, ...l }) => ({
    approximate: true,
    position: [u(xM), h(yM), u(zM)],
    heightM,
    height: heightM != null ? h(heightM) : null,
    ...l,
  });
  const track = ({ pointsM, ...t }) => ({ approximate: true, points: pointsM.map(([x, z]) => [u(x), u(z)]), gauge: u(1.0), ...t });
  const area = ({ polygon, ...a }) => ({ approximate: true, polygon, ...a });

  return { build: rest.build({ rect, cross, building, landmark, track, area, u }), meta: { id, metersPerUnit, verticalExaggeration, ...rest.meta } };
}

const PLAZA_DEFS = [
  // ─────────────────────────── 1900 / 1910 ───────────────────────────
  makePlaza({
    id: 'piata_libertatii_1900',
    metersPerUnit: 38, // ~150 m across the table
    verticalExaggeration: 1.4,
    meta: {
      eraId: '1910_secession',
      year: 1910,
      center: { lat: 45.7558, lng: 21.2276 },
      name: {
        ro: 'Piața Libertății (c. 1900–1910)',
        en: 'Piața Libertății (c. 1900–1910)',
        hu: 'Szabadság tér (kb. 1900–1910)',
        de: 'Freiheitsplatz (um 1900–1910)',
        sr: 'Trg slobode (oko 1900–1910)',
      },
      notes:
        'Square inside the old fortress (Cetate). The Baroque Old Town Hall (1731–1734) closes the south side; ' +
        'the Statue of St. Mary and St. John of Nepomuk (1756) stands in the square. Electric trams ran in Timișoara from 1899.',
    },
    build: ({ rect, building, landmark, track, area }) => ({
      ground: area({ id: 'square', kind: 'paved_square', polygon: rect(0, 0, 100, 80) }),
      buildings: [
        building({
          id: 'old_city_hall',
          name: { ro: 'Primăria Veche', en: 'Old Town Hall', hu: 'Régi Városháza', de: 'Altes Rathaus', sr: 'Stara gradska kuća' },
          footprint: rect(0, 52, 46, 18),
          heightM: 18,
          roof: 'hip',
          style: 'baroque',
          built: '1731–1734',
          landmark: true,
          color: '#e8dcc0',
        }),
        building({ id: 'block_north', name: null, label: 'perimeter block (schematic)', footprint: rect(0, -52, 90, 18), heightM: 17, roof: 'mansard', style: 'secession', color: '#d9cdb3' }),
        building({ id: 'block_west', name: null, label: 'perimeter block (schematic)', footprint: rect(-62, 0, 18, 80), heightM: 16, roof: 'hip', style: 'baroque', color: '#cfc2a6' }),
        building({ id: 'block_east', name: null, label: 'perimeter block (schematic)', footprint: rect(62, 0, 18, 80), heightM: 19, roof: 'mansard', style: 'secession', color: '#e2d3b5' }),
      ],
      landmarks: [
        landmark({
          id: 'st_mary_nepomuk_statue',
          type: 'statue',
          name: { ro: 'Statuia Sf. Maria și Sf. Nepomuk', en: 'Statue of St. Mary and St. John of Nepomuk', hu: 'Szűz Mária és Nepomuki Szent János szobra', de: 'Statue der hl. Maria und des hl. Johannes Nepomuk', sr: 'Statua Sv. Marije i Sv. Jovana Nepomuka' },
          xM: 0,
          zM: -8,
          heightM: 9,
          built: '1756',
        }),
        landmark({ id: 'brass_band', type: 'sound_source', name: { ro: 'Fanfară', en: 'Brass band', hu: 'Fúvószenekar', de: 'Blaskapelle', sr: 'Limena muzika' }, xM: 18, zM: 14, heightM: null, sound: 'brass_band', atmosphere: true }),
      ],
      tracks: [track({ id: 'tram_1900', label: 'tram line (schematic route)', pointsM: [[-70, 30], [-20, 30], [20, 30], [70, 30]] })],
    }),
  }),

  // ───────────────────────────── 1977 ────────────────────────────────
  makePlaza({
    id: 'piata_unirii_1977',
    metersPerUnit: 54, // ~215 m across the table
    verticalExaggeration: 1.5,
    meta: {
      eraId: '1977_phoenix',
      year: 1977,
      center: { lat: 45.7581, lng: 21.2289 },
      name: {
        ro: 'Piața Unirii (1977)',
        en: 'Piața Unirii (1977)',
        hu: 'Dóm tér / Piața Unirii (1977)',
        de: 'Domplatz / Piața Unirii (1977)',
        sr: 'Trg ujedinjenja (1977)',
      },
      notes:
        'Baroque square: Roman Catholic Cathedral (St. George, 1736–1774) on the east side, Serbian Orthodox Cathedral ' +
        '(1745–1748) on the west side, the Baroque Palace (today the National Museum of Art) on the south side, and the ' +
        'Holy Trinity (plague) column (1740) in the centre. The 1977 rock layer is atmosphere only — no club location is claimed.',
    },
    build: ({ rect, building, landmark, area }) => ({
      ground: area({ id: 'square', kind: 'paved_square', polygon: rect(0, 0, 150, 115) }),
      buildings: [
        building({
          id: 'roman_catholic_cathedral',
          name: { ro: 'Domul Romano-Catolic', en: 'Roman Catholic Cathedral (St. George)', hu: 'Szent György-székesegyház (Dóm)', de: 'Römisch-katholischer Dom (St. Georg)', sr: 'Rimokatolička katedrala (Sv. Đorđe)' },
          footprint: rect(88, 0, 30, 60),
          heightM: 22,
          roof: 'gable',
          style: 'baroque',
          built: '1736–1774',
          landmark: true,
          facade: 'west',
          color: '#efe6cf',
        }),
        building({
          id: 'serbian_orthodox_cathedral',
          name: { ro: 'Catedrala Ortodoxă Sârbă', en: 'Serbian Orthodox Cathedral', hu: 'Szerb ortodox székesegyház', de: 'Serbisch-orthodoxe Kathedrale', sr: 'Srpska pravoslavna saborna crkva' },
          footprint: rect(-88, 0, 26, 50),
          heightM: 20,
          roof: 'gable',
          style: 'baroque',
          built: '1745–1748',
          landmark: true,
          facade: 'east',
          color: '#f1e8d2',
        }),
        building({
          id: 'baroque_palace',
          name: { ro: 'Palatul Baroc', en: 'Baroque Palace', hu: 'Barokk palota', de: 'Barockpalais', sr: 'Barokna palata' },
          footprint: rect(0, 70, 80, 22),
          heightM: 18,
          roof: 'hip',
          style: 'baroque',
          landmark: true,
          color: '#e9d9b8',
        }),
        building({ id: 'block_north', name: null, label: 'perimeter block (schematic)', footprint: rect(0, -70, 120, 20), heightM: 16, roof: 'hip', style: 'baroque', color: '#d8cbb0' }),
      ],
      landmarks: [
        landmark({ id: 'rc_cathedral_tower_n', type: 'tower', parent: 'roman_catholic_cathedral', xM: 74, zM: -10, heightM: 35, roof: 'onion_spire' }),
        landmark({ id: 'rc_cathedral_tower_s', type: 'tower', parent: 'roman_catholic_cathedral', xM: 74, zM: 10, heightM: 35, roof: 'onion_spire' }),
        landmark({ id: 'serbian_cathedral_tower_n', type: 'tower', parent: 'serbian_orthodox_cathedral', xM: -76, zM: -8, heightM: 32, roof: 'onion_spire' }),
        landmark({ id: 'serbian_cathedral_tower_s', type: 'tower', parent: 'serbian_orthodox_cathedral', xM: -76, zM: 8, heightM: 32, roof: 'onion_spire' }),
        landmark({
          id: 'holy_trinity_column',
          type: 'column',
          name: { ro: 'Statuia Sfintei Treimi', en: 'Holy Trinity Column', hu: 'Szentháromság-szobor', de: 'Dreifaltigkeitssäule', sr: 'Stub Svete Trojice' },
          xM: 0,
          zM: 0,
          heightM: 15,
          built: '1740',
        }),
        landmark({ id: 'censored_rock', type: 'sound_source', name: { ro: 'Rock cenzurat', en: 'Censored rock', hu: 'Cenzúrázott rock', de: 'Zensierter Rock', sr: 'Cenzurisani rok' }, xM: -20, zM: 25, heightM: null, sound: 'censored_rock', atmosphere: true }),
      ],
      tracks: [],
    }),
  }),

  // ───────────────────────────── 1989 ────────────────────────────────
  makePlaza({
    id: 'piata_operei_1989',
    metersPerUnit: 160, // the long Opera → Cathedral axis (~600 m incl. both buildings) runs along z
    verticalExaggeration: 2.5,
    meta: {
      eraId: '1989_opera',
      year: 1989,
      center: { lat: 45.7536, lng: 21.2257 },
      name: {
        ro: 'Piața Operei / Piața Victoriei (decembrie 1989)',
        en: 'Opera Square / Piața Victoriei (December 1989)',
        hu: 'Opera tér / Győzelem tér (1989 december)',
        de: 'Opernplatz / Siegesplatz (Dezember 1989)',
        sr: 'Trg Opere / Trg pobede (decembar 1989)',
      },
      notes:
        'Long pedestrian square between the National Theatre & Opera (north) and the Romanian Orthodox Metropolitan ' +
        'Cathedral (south, 1936–1946). On 20 December 1989 the Romanian Democratic Front spoke from the Opera balcony to ' +
        'a crowd of more than 100,000.',
    },
    build: ({ rect, cross, building, landmark, track, area }) => ({
      ground: area({ id: 'square', kind: 'pedestrian_square', polygon: rect(0, 0, 90, 470) }),
      buildings: [
        building({
          id: 'opera_house',
          name: { ro: 'Teatrul Național și Opera', en: 'National Theatre & Opera', hu: 'Nemzeti Színház és Opera', de: 'Nationaltheater und Oper', sr: 'Narodno pozorište i Opera' },
          footprint: rect(0, -255, 80, 60),
          heightM: 28,
          roof: 'flat',
          style: 'neo_romanian_facade',
          landmark: true,
          facade: 'south',
          color: '#efe3c8',
        }),
        building({
          id: 'metropolitan_cathedral',
          name: { ro: 'Catedrala Mitropolitană', en: 'Metropolitan Cathedral', hu: 'Ortodox mitropolita-székesegyház', de: 'Orthodoxe Metropolitan-Kathedrale', sr: 'Mitropolitska katedrala' },
          footprint: cross(0, 270, 70, 30, 60, 28),
          heightM: 30,
          roof: 'tiled_multicolour',
          style: 'neo_moldavian',
          built: '1936–1946',
          landmark: true,
          facade: 'north',
          color: '#e7d6b3',
        }),
        building({ id: 'palace_row_west', name: null, label: 'Secession palace row, west side (schematic)', footprint: rect(-65, -40, 30, 360), heightM: 22, roof: 'mansard', style: 'secession', color: '#e4d2ae' }),
        building({ id: 'palace_row_east', name: null, label: 'Secession palace row, east side (schematic)', footprint: rect(65, -40, 30, 360), heightM: 22, roof: 'mansard', style: 'secession', color: '#dccaa6' }),
      ],
      landmarks: [
        landmark({
          id: 'opera_balcony',
          type: 'balcony',
          name: { ro: 'Balconul Operei', en: 'Opera balcony', hu: 'Az Opera erkélye', de: 'Opernbalkon', sr: 'Balkon Opere' },
          parent: 'opera_house',
          xM: 0,
          zM: -224,
          yM: 9,
          heightM: 1.2,
          widthM: 24,
          facing: 'south',
          event: '1989-12-20',
        }),
        landmark({ id: 'cathedral_central_tower', type: 'spire', parent: 'metropolitan_cathedral', xM: 0, zM: 262, heightM: 84, roof: 'tiled_cupola' }),
        landmark({ id: 'cathedral_tower_nw', type: 'spire', parent: 'metropolitan_cathedral', xM: -12, zM: 238, heightM: 40, roof: 'tiled_cupola' }),
        landmark({ id: 'cathedral_tower_ne', type: 'spire', parent: 'metropolitan_cathedral', xM: 12, zM: 238, heightM: 40, roof: 'tiled_cupola' }),
        landmark({
          id: 'capitoline_wolf',
          type: 'statue',
          name: { ro: 'Lupa Capitolina', en: 'Capitoline Wolf', hu: 'Capitoliumi farkas', de: 'Kapitolinische Wölfin', sr: 'Kapitolinska vučica' },
          xM: 0,
          zM: 60,
          heightM: 6,
          built: '1926',
        }),
        landmark({ id: 'crowd_libertate', type: 'sound_source', name: { ro: '„Libertate!”', en: '"Libertate!"', hu: '„Libertate!”', de: '„Libertate!“', sr: '„Libertate!”' }, xM: 0, zM: -120, heightM: null, sound: 'crowd_libertate', atmosphere: true }),
      ],
      areas: [area({ id: 'crowd_1989', kind: 'crowd', label: '>100,000 people (20 Dec 1989)', polygon: rect(0, -60, 85, 330) })],
      tracks: [track({ id: 'tram_cathedral', label: 'tram line south of the square (schematic route)', pointsM: [[-270, 225], [-60, 222], [60, 222], [270, 225]] })],
    }),
  }),

  // ───────────────────────────── 2026 ────────────────────────────────
  makePlaza({
    id: 'timisoara_2026',
    metersPerUnit: 160,
    verticalExaggeration: 2.5,
    meta: {
      eraId: '2026_modern',
      year: 2026,
      center: { lat: 45.7536, lng: 21.2257 },
      name: {
        ro: 'Timișoara azi — Piața Victoriei',
        en: 'Timișoara today — Piața Victoriei',
        hu: 'Temesvár ma — Győzelem tér',
        de: 'Temeswar heute — Siegesplatz',
        sr: 'Temišvar danas — Trg pobede',
      },
      notes:
        'Same axis as 1989, today a pedestrian promenade with flowerbeds and the fish fountain; trams pass south of the ' +
        'Cathedral. Timișoara was European Capital of Culture in 2023.',
    },
    build: ({ rect, cross, building, landmark, track, area }) => ({
      ground: area({ id: 'square', kind: 'pedestrian_square', polygon: rect(0, 0, 90, 470) }),
      buildings: [
        building({ id: 'opera_house', name: { ro: 'Teatrul Național și Opera', en: 'National Theatre & Opera', hu: 'Nemzeti Színház és Opera', de: 'Nationaltheater und Oper', sr: 'Narodno pozorište i Opera' }, footprint: rect(0, -255, 80, 60), heightM: 28, roof: 'flat', style: 'neo_romanian_facade', landmark: true, facade: 'south', color: '#f3e9d2' }),
        building({ id: 'metropolitan_cathedral', name: { ro: 'Catedrala Mitropolitană', en: 'Metropolitan Cathedral', hu: 'Ortodox mitropolita-székesegyház', de: 'Orthodoxe Metropolitan-Kathedrale', sr: 'Mitropolitska katedrala' }, footprint: cross(0, 270, 70, 30, 60, 28), heightM: 30, roof: 'tiled_multicolour', style: 'neo_moldavian', built: '1936–1946', landmark: true, facade: 'north', color: '#ecdcbb' }),
        building({ id: 'palace_row_west', name: null, label: 'Secession palace row, west side (schematic)', footprint: rect(-65, -40, 30, 360), heightM: 22, roof: 'mansard', style: 'secession', color: '#eadbbd' }),
        building({ id: 'palace_row_east', name: null, label: 'Secession palace row, east side (schematic)', footprint: rect(65, -40, 30, 360), heightM: 22, roof: 'mansard', style: 'secession', color: '#e3d3b2' }),
      ],
      landmarks: [
        landmark({ id: 'opera_balcony', type: 'balcony', name: { ro: 'Balconul Operei', en: 'Opera balcony', hu: 'Az Opera erkélye', de: 'Opernbalkon', sr: 'Balkon Opere' }, parent: 'opera_house', xM: 0, zM: -224, yM: 9, heightM: 1.2, widthM: 24, facing: 'south' }),
        landmark({ id: 'cathedral_central_tower', type: 'spire', parent: 'metropolitan_cathedral', xM: 0, zM: 262, heightM: 84, roof: 'tiled_cupola' }),
        landmark({ id: 'cathedral_tower_nw', type: 'spire', parent: 'metropolitan_cathedral', xM: -12, zM: 238, heightM: 40, roof: 'tiled_cupola' }),
        landmark({ id: 'cathedral_tower_ne', type: 'spire', parent: 'metropolitan_cathedral', xM: 12, zM: 238, heightM: 40, roof: 'tiled_cupola' }),
        landmark({ id: 'capitoline_wolf', type: 'statue', name: { ro: 'Lupa Capitolina', en: 'Capitoline Wolf', hu: 'Capitoliumi farkas', de: 'Kapitolinische Wölfin', sr: 'Kapitolinska vučica' }, xM: 0, zM: 60, heightM: 6, built: '1926' }),
        landmark({ id: 'fish_fountain', type: 'fountain', name: { ro: 'Fântâna cu pești', en: 'Fish fountain', hu: 'Halas kút', de: 'Fischbrunnen', sr: 'Fontana sa ribama' }, xM: 0, zM: -20, heightM: 3 }),
        landmark({ id: 'tram_symphony', type: 'sound_source', name: { ro: 'Simfonia tramvaielor', en: 'Tram symphony', hu: 'Villamosszimfónia', de: 'Straßenbahn-Sinfonie', sr: 'Simfonija tramvaja' }, xM: 0, zM: 222, heightM: null, sound: 'tram_symphony', atmosphere: true }),
      ],
      areas: [area({ id: 'flowerbeds', kind: 'flowerbeds', label: 'central flowerbeds (schematic)', polygon: rect(0, -60, 18, 300) })],
      tracks: [track({ id: 'tram_cathedral', label: 'tram line south of the square (schematic route)', pointsM: [[-270, 225], [-60, 222], [60, 222], [270, 225]] })],
    }),
  }),
];

/** Assemble one plaza (rect()/cross() already produce tabletop units). */
function finalize({ build, meta }) {
  const out = {
    ...meta,
    accuracy: 'schematic',
    grid: { min: -2, max: 2 },
    ground: build.ground,
    buildings: build.buildings,
    landmarks: build.landmarks,
    areas: build.areas || [],
    tracks: build.tracks || [],
    // Optional hand-made model; /ar falls back to procedural extrusion while `available` is false.
    glb: { url: `/assets/ar/plazas/${meta.id}.glb`, available: false },
  };
  return out;
}

export const MONUMENTS_3D = Object.freeze({
  version: 1,
  accuracy: 'schematic',
  source:
    'Hand-authored schematic layouts based on public knowledge of the squares (landmark identities, sides and dates). ' +
    'Footprints, positions and heights are approximate — not surveyed GIS data.',
  coordinateSystem: {
    units: 'tabletop',
    grid: { min: -2, max: 2 },
    axes: { x: 'east', y: 'up', z: 'south' },
    north: '-z',
    footprint: '[x, z] pairs, closed implicitly; extrude from baseY to baseY + height',
  },
  roofTypes: ['flat', 'hip', 'gable', 'mansard', 'onion_spire', 'tiled_cupola', 'tiled_multicolour'],
  plazas: PLAZA_DEFS.map(finalize),
});

export const PLAZA_IDS = Object.freeze(MONUMENTS_3D.plazas.map((p) => p.id));
export const getPlaza = (id) => MONUMENTS_3D.plazas.find((p) => p.id === id) || null;
