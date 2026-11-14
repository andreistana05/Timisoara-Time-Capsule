/**
 * Era looks for the realistic plazas: light rig, colour grading, weathering, lit windows, signs of life.
 * Owner: Member 3. These are ATMOSPHERE, not claims about specific façades in that year.
 * Lights are applied inside realMaterial.js's shader (not as scene lights), so the rest of the AR scene
 * (orbs, pedestal) is unaffected.
 */
export const ERA_LOOKS = {
  // warm late afternoon, fresh plaster, slight sepia, a tram on the real tracks, gas lamps
  1910: {
    sky: '#f6e7cc', skyI: 0.62, ground: '#5a4936',
    sun: '#ffd8a0', sunI: 0.78, sunDir: [0.65, 0.5, 0.45],
    grade: [1.07, 1.0, 0.86], desat: 0.18, grime: 0.06,
    litFrac: 0.05, litColor: '#ffcf7a', litI: 0.6, flicker: 0.2,
    paving: '#b8a383', pavingOpacity: 0.85, pathColor: '#efe2c5', railColor: '#b9b1a4',
    lamps: { color: '#ffcf7a', spacingM: 28, max: 40, size: 0.06 },
    people: 110, tram: true, candles: false,
  },
  // overcast, desaturated, soot-greyed, sodium-vapour street lights
  1977: {
    sky: '#a9b1b8', skyI: 0.78, ground: '#3c3c3c',
    sun: '#dfe3e6', sunI: 0.22, sunDir: [0.15, 1.0, 0.25],
    grade: [0.94, 0.95, 0.98], desat: 0.52, grime: 0.55,
    litFrac: 0.12, litColor: '#ffb257', litI: 0.85, flicker: 0.35,
    paving: '#787772', pavingOpacity: 0.85, pathColor: '#a3a29c', railColor: '#8b8f93',
    lamps: { color: '#ff9a2e', spacingM: 24, max: 50, size: 0.07 },
    people: 70, tram: false, candles: false,
  },
  // 20 December 1989, winter evening: cold blue dusk, grimy façades, many windows lit, candles on the square
  1989: {
    sky: '#2c3d6e', skyI: 0.6, ground: '#141a2b',
    sun: '#8ea2d8', sunI: 0.26, sunDir: [-0.4, 0.35, 0.55],
    grade: [0.86, 0.9, 1.08], desat: 0.32, grime: 0.45,
    litFrac: 0.42, litColor: '#ffbe6b', litI: 1.3, flicker: 1.0,
    paving: '#4b5060', pavingOpacity: 0.9, pathColor: '#7c8296', railColor: '#7b8290',
    lamps: { color: '#ffad4d', spacingM: 26, max: 50, size: 0.075 },
    people: 0, crowd: 260, tram: false, candles: true,
  },
  // bright clean daylight, restored pastel façades (city centre restored for European Capital of Culture 2023)
  2026: {
    sky: '#e2f0fd', skyI: 0.66, ground: '#6c685e',
    sun: '#fff3df', sunI: 0.82, sunDir: [0.5, 0.8, 0.35],
    grade: [1.02, 1.02, 1.0], desat: -0.18, grime: 0.0,
    litFrac: 0.0, litColor: '#ffd28a', litI: 0.0, flicker: 0.0,
    paving: '#d2cbbd', pavingOpacity: 0.85, pathColor: '#f3eee4', railColor: '#c7ccd2',
    lamps: null,
    people: 150, tram: true, candles: false,
  },
};

export function eraLook(year) {
  if (ERA_LOOKS[year]) return ERA_LOOKS[year];
  const ys = Object.keys(ERA_LOOKS).map(Number);
  const nearest = ys.reduce((a, b) => (Math.abs(b - year) < Math.abs(a - year) ? b : a), ys[0]);
  return ERA_LOOKS[nearest];
}

/** Style palettes, used only when OSM has no building:colour / roof:colour. */
export const PALETTES = {
  secession: ['#e8d48a', '#cfe0c3', '#f1d7b5', '#d9c7e6', '#f3e2a0'],
  baroque: ['#efe0bd', '#e9cf9a', '#f2e8d5', '#d8c3a0'],
  church: ['#efe6d6', '#e2d6c0'],
  modern: ['#c9c9c4', '#b8b6ae'],
  generic: ['#e6dccb', '#d8cdb8', '#cfc6b4'],
  roof_tile: ['#b5562f', '#9a4a2c', '#5d636b'],
  roof_dome: ['#6f9c8a', '#7a8a96'],
  roof_flat: ['#6d6b67', '#5f5d59'],
};
