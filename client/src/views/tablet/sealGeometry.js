/**
 * Seal geometry shared by the Seal and the chapter card glyphs.
 * Every motif uses the same command structure (M + 4xC + Z) so paths can morph.
 */
export const N = 21; // 21 ethnic communities
export const STEP = 360 / N;
export const f = (n) => n.toFixed(2);

/** Build "M p0 C c1 c2 p1 C … Z" — always exactly 4 cubic segments. */
const motifPath = (p0, segs) =>
  `M${f(p0[0])},${f(p0[1])} ` + segs.map(([a, b, c]) => `C${f(a[0])},${f(a[1])} ${f(b[0])},${f(b[1])} ${f(c[0])},${f(c[1])}`).join(' ') + ' Z';

/** Ellipse centred on (0, cy) as 4 cubic segments, starting at its inner point. */
const ellipse = (cy, rx, ry) => {
  const k = 0.5523;
  return motifPath(
    [0, cy + ry],
    [
      [[k * rx, cy + ry], [rx, cy + k * ry], [rx, cy]],
      [[rx, cy - k * ry], [k * rx, cy - ry], [0, cy - ry]],
      [[-k * rx, cy - ry], [-rx, cy - k * ry], [-rx, cy]],
      [[-rx, cy + k * ry], [-k * rx, cy + ry], [0, cy + ry]],
    ],
  );
};

export const MOTIFS = {
  // Human chain: alternating flat / edge-on links, overlapping like a real chain.
  '1989_piata_maria': (i) => ellipse(-160, 27, i % 2 ? 4 : 11),
  // Opera: narrow at the balcony, flaring into a beam of light.
  '1989_opera': () =>
    motifPath(
      [0, -130],
      [
        [[1.5, -140], [6, -170], [10, -188]],
        [[6, -190], [3, -190], [0, -190]],
        [[-3, -190], [-6, -190], [-10, -188]],
        [[-6, -170], [-1.5, -140], [0, -130]],
      ],
    ),
  // Mosaic: asymmetric Secession whiplash petal with a curling tip.
  multicultural_mosaic: () =>
    motifPath(
      [0, -130],
      [
        [[18, -138], [22, -160], [10, -172]],
        [[4, -178], [2, -184], [-2, -192]],
        [[-4, -180], [-16, -168], [-14, -156]],
        [[-12, -144], [-10, -134], [0, -130]],
      ],
    ),
};
