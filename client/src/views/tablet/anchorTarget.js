/**
 * The 6DoF spatial anchor printed in the non-rotating core of the Time Tuner. Owner: Member 2.
 *
 * What the phone camera sees (Seal viewBox units, origin = centre of the tablet dial):
 *
 *   ┌───────────── white quiet zone, ±104, corner radius 10 ─────────────┐
 *   │  ▛▀▀▀▀▀        TL: long arms, thick         ▀▀▀▀▀▜  TR: long × short │
 *   │  ▌            ┌──── ArUco, 7 × 7 cells ────┐      ▐                  │
 *   │               │ black border + 5 × 5 bits  │                         │
 *   │               │ ±56, cell 16               │                         │
 *   │               └────────────────────────────┘                         │
 *   │  ▌                                                                   │
 *   │  ▙▄▄▄       BL: short × long                ▄▄▄▟  BR: short arms     │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 * - The marker is a real ORIGINAL-ArUco code (the 1024-marker 5×5 dictionary used by js-aruco
 *   and OpenCV's DICT_ARUCO_ORIGINAL; bit 1 = white). Id 16 = 16 December 1989. Its three other
 *   rotations are ≥ 6 bit-flips away from any valid code, so the detected orientation is never
 *   ambiguous. Confirm with the detector the AR lens ends up using before relying on the id.
 * - The four L-markers are all different (arm lengths + the thick top-left one), so even a
 *   tracker that only finds the corner brackets knows which corner is which: up is never
 *   confused, however the outer tuning ring is turned.
 * - Everything here is pure #000 / #fff, static and never animated. The rings that move all
 *   sit outside the quiet zone.
 * - Scale: sizes below are in Seal viewBox units (VIEW = 640 across). A lens that knows the
 *   rendered Seal width W (or the tablet's physical screen size) gets the marker edge as
 *   W × ANCHOR.markerSize / ANCHOR.viewSize.
 */

export const ARUCO_ORIGINAL_WORDS = Object.freeze([0x10, 0x17, 0x09, 0x0e]);

/** 5 × 5 data bits (1 = white) of an original-ArUco marker id 0…1023. */
export function arucoOriginalBits(id) {
  return Array.from({ length: 5 }, (_, y) => {
    const word = ARUCO_ORIGINAL_WORDS[(id >> (2 * (4 - y))) & 3];
    return Array.from({ length: 5 }, (_, x) => (word >> (4 - x)) & 1);
  });
}

const CELL = 16;
const HALF = 3.5 * CELL; // 7 cells across: 1 black border + 5 bits + 1 black border
const L_OUTER = 88;
const QUIET = 104;

export const ANCHOR = Object.freeze({
  dictionary: 'ARUCO_ORIGINAL',
  id: 16,
  viewSize: 640, // Seal viewBox width (= 2 × DIAL.view)
  cell: CELL,
  markerSize: 7 * CELL, // black outer edge, incl. border
  lOuter: L_OUTER, // outer corner of each L bracket (±)
  quiet: QUIET, // half-size of the white quiet zone
  quietRadius: 10,
  reach: (QUIET - 10) * Math.SQRT2 + 10, // farthest point of the quiet zone from the centre
});

export const ANCHOR_BITS = Object.freeze(arucoOriginalBits(ANCHOR.id));

/** One path for the white data cells (seam-free under crispEdges). */
export const ANCHOR_WHITE_CELLS = ANCHOR_BITS.flatMap((row, y) =>
  row.map((bit, x) => (bit ? `M${-HALF + (x + 1) * CELL},${-HALF + (y + 1) * CELL}h${CELL}v${CELL}h${-CELL}Z` : '')),
).join('');

/**
 * L bracket at a corner. (sx, sy) = corner signs; ax / ay = arm lengths along x / y,
 * measured inwards from the outer corner; th = thickness.
 */
function lBracket(sx, sy, ax, ay, th) {
  const p = (u, v) => `${sx * (L_OUTER - u)},${sy * (L_OUTER - v)}`;
  return `M${p(0, 0)} L${p(ax, 0)} L${p(ax, th)} L${p(th, th)} L${p(th, ay)} L${p(0, ay)} Z`;
}

/** Four distinct corner markers: the inner edges stay ≥ 1 cell clear of the ArUco border. */
export const L_MARKERS = Object.freeze([
  { id: 'TL', d: lBracket(-1, -1, 52, 52, 16) },
  { id: 'TR', d: lBracket(1, -1, 52, 28, 12) },
  { id: 'BR', d: lBracket(1, 1, 28, 28, 12) },
  { id: 'BL', d: lBracket(-1, 1, 28, 52, 12) },
]);

export const ANCHOR_HALF = HALF;
