/**
 * Procedural façade & roof textures, drawn once on <canvas> and cached for the whole tab. Owner: Member 3.
 *
 * Façade tiles = 1 floor (v 0→1) × 2 bays (u 0→1), mostly light grey so the per-building vertex tint
 * (OSM building:colour or the style palette) shows through. Window GLASS is drawn in a distinctly bluish
 * dark tone: realMaterial.js detects it (b > r) to darken it by day and light it at night, so no
 * separate mask texture is needed. Don't use blue tints anywhere else on façade tiles.
 * These are stylised reconstructions (window rhythm + style ornaments), not photographs.
 */
import * as THREE from 'three';

const S = 512;
const GLASS = '#1f3350';
const GLASS_HI = '#30486b';
const cache = new Map();

function canvas() {
  const c = document.createElement('canvas');
  c.width = c.height = S;
  return [c, c.getContext('2d')];
}

/** Deterministic noise so textures are identical every load. */
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function plaster(g, base, seed = 1, amount = 10) {
  g.fillStyle = base;
  g.fillRect(0, 0, S, S);
  const r = rng(seed);
  for (let i = 0; i < 2600; i++) {
    const v = Math.floor(r() * amount * 2 - amount);
    g.fillStyle = `rgba(${v > 0 ? '255,255,255' : '0,0,0'},${Math.abs(v) / 255})`;
    g.fillRect(r() * S, r() * S, 2 + r() * 5, 2 + r() * 5);
  }
}

function glassPane(g, x, y, w, h, arch = 0) {
  g.fillStyle = GLASS;
  g.beginPath();
  if (arch) {
    g.moveTo(x, y + h);
    g.lineTo(x, y + arch);
    g.arc(x + w / 2, y + arch, w / 2, Math.PI, 0);
    g.lineTo(x + w, y + h);
  } else g.rect(x, y, w, h);
  g.closePath();
  g.fill();
  // mullions + a soft reflection
  g.fillStyle = GLASS_HI;
  g.fillRect(x + w * 0.1, y + (arch ? arch * 0.6 : h * 0.06), w * 0.18, h * 0.5);
  g.strokeStyle = '#f2f2f2';
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(x + w / 2, y + (arch ? arch * 0.4 : 0));
  g.lineTo(x + w / 2, y + h);
  g.moveTo(x, y + h * 0.42);
  g.lineTo(x + w, y + h * 0.42);
  g.stroke();
}

function frame(g, x, y, w, h, pad = 10, col = '#fafafa') {
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.fillRect(x - pad + 4, y - pad + 6, w + pad * 2, h + pad * 2); // shadow
  g.fillStyle = col;
  g.fillRect(x - pad, y - pad, w + pad * 2, h + pad * 2);
}

function sill(g, x, y, w) {
  g.fillStyle = '#c9c9c9';
  g.fillRect(x - 18, y, w + 36, 12);
  g.fillStyle = 'rgba(0,0,0,0.22)';
  g.fillRect(x - 18, y + 12, w + 36, 6);
}

const DRAW = {
  secession(g) {
    plaster(g, '#e9e9e7', 11);
    // floral relief band under the next floor's windows (top of tile) + whiplash curve
    g.strokeStyle = '#cfcfcb';
    g.lineWidth = 6;
    g.beginPath();
    for (let x = 0; x <= S; x += 4) g.lineTo(x, 46 + Math.sin((x / S) * Math.PI * 4) * 16);
    g.stroke();
    g.fillStyle = '#d6d6d2';
    for (let k = 0; k < 4; k++) {
      g.beginPath();
      g.arc(64 + k * 128, 46, 12, 0, Math.PI * 2);
      g.fill();
    }
    for (const cx of [128, 384]) {
      const w = 96, h = 280, x = cx - w / 2, y = 130;
      frame(g, x, y, w, h, 12);
      // curved lintel
      g.fillStyle = '#f7f7f5';
      g.beginPath();
      g.ellipse(cx, y - 8, w / 2 + 26, 34, 0, Math.PI, 0);
      g.fill();
      glassPane(g, x, y, w, h, w / 2);
      sill(g, x, y + h + 10, w);
    }
    g.fillStyle = 'rgba(0,0,0,0.10)';
    g.fillRect(0, S - 18, S, 18); // floor line
  },
  baroque(g) {
    plaster(g, '#ebebe8', 22);
    // pilasters at the bay edges (wraps seamlessly)
    for (const px of [0, 256, 512]) {
      g.fillStyle = '#f6f6f4';
      g.fillRect(px - 22, 0, 44, S);
      g.fillStyle = 'rgba(0,0,0,0.14)';
      g.fillRect(px + 22, 0, 8, S);
    }
    for (const cx of [128, 384]) {
      const w = 100, h = 230, x = cx - w / 2, y = 150;
      frame(g, x, y, w, h, 16, '#f8f8f6');
      // cornice / pediment above the window
      g.fillStyle = '#f8f8f6';
      g.beginPath();
      g.moveTo(x - 30, y - 22);
      g.lineTo(cx, y - 70);
      g.lineTo(x + w + 30, y - 22);
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(0,0,0,0.18)';
      g.fillRect(x - 30, y - 22, w + 60, 8);
      glassPane(g, x, y, w, h);
      sill(g, x, y + h + 16, w);
    }
    // thick floor band
    g.fillStyle = '#dededa';
    g.fillRect(0, S - 46, S, 46);
    g.fillStyle = 'rgba(0,0,0,0.16)';
    g.fillRect(0, S - 46, S, 6);
  },
  church(g) {
    plaster(g, '#e4e2dc', 33, 14);
    // ashlar stone courses
    g.strokeStyle = 'rgba(0,0,0,0.10)';
    g.lineWidth = 2;
    for (let y = 0; y < S; y += 48) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(S, y);
      g.stroke();
      for (let x = (y / 48) % 2 ? 0 : 64; x < S; x += 128) {
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x, y + 48);
        g.stroke();
      }
    }
    for (const cx of [128, 384]) {
      const w = 84, h = 360, x = cx - w / 2, y = 90;
      frame(g, x, y, w, h, 14, '#f1efe9');
      glassPane(g, x, y, w, h, w / 2);
    }
  },
  modern(g) {
    plaster(g, '#d8d8d6', 44, 8);
    // horizontal ribbon window with mullions (1970s blocks)
    g.fillStyle = 'rgba(0,0,0,0.2)';
    g.fillRect(0, 168, S, 8);
    g.fillStyle = GLASS;
    g.fillRect(0, 176, S, 210);
    g.fillStyle = GLASS_HI;
    for (let x = 10; x < S; x += 64) g.fillRect(x, 186, 14, 120);
    g.fillStyle = '#cfcfcd';
    for (let x = 0; x <= S; x += 64) g.fillRect(x - 4, 176, 8, 210);
    g.fillStyle = '#bdbdbb';
    g.fillRect(0, 386, S, 14);
  },
  generic(g) {
    plaster(g, '#e6e6e3', 55);
    for (const cx of [128, 384]) {
      const w = 92, h = 200, x = cx - w / 2, y = 170;
      frame(g, x, y, w, h, 10);
      glassPane(g, x, y, w, h);
      sill(g, x, y + h + 10, w);
    }
  },
  roof_tile(g) {
    // greyscale clay tiles; tinted by roofColor
    g.fillStyle = '#d9d9d9';
    g.fillRect(0, 0, S, S);
    const r = rng(7);
    for (let row = 0; row < 16; row++) {
      const y = row * 32;
      for (let col = 0; col < 17; col++) {
        const x = col * 32 - (row % 2 ? 16 : 0);
        const v = 200 + Math.floor(r() * 40);
        const grd = g.createLinearGradient(0, y, 0, y + 32);
        grd.addColorStop(0, `rgb(${v},${v},${v})`);
        grd.addColorStop(1, `rgb(${v - 70},${v - 70},${v - 70})`);
        g.fillStyle = grd;
        g.beginPath();
        g.moveTo(x + 1, y);
        g.lineTo(x + 31, y);
        g.lineTo(x + 31, y + 22);
        g.quadraticCurveTo(x + 16, y + 34, x + 1, y + 22);
        g.closePath();
        g.fill();
      }
    }
  },
  roof_dome(g) {
    // fish-scale glazed tiles, light grey (tinted by roofColor)
    g.fillStyle = '#cfcfcf';
    g.fillRect(0, 0, S, S);
    for (let row = 0; row < 22; row++) {
      for (let col = 0; col < 23; col++) {
        const x = col * 24 + (row % 2 ? 12 : 0);
        const y = row * 24;
        const grd = g.createRadialGradient(x, y + 4, 2, x, y + 8, 16);
        grd.addColorStop(0, '#f4f4f4');
        grd.addColorStop(1, '#9a9a9a');
        g.fillStyle = grd;
        g.beginPath();
        g.arc(x, y + 8, 12, 0, Math.PI);
        g.fill();
      }
    }
  },
  roof_poly(g) {
    // polychrome glazed diamond pattern (Metropolitan Cathedral style roofs); NOT tinted
    const cols = ['#3f7a52', '#d4a838', '#8c3a2a', '#2f3b2c', '#c76d2e'];
    const d = 32;
    for (let row = -1; row < S / d + 1; row++) {
      for (let col = -1; col < S / d + 1; col++) {
        const cx = col * d + (row % 2 ? d / 2 : 0);
        const cy = row * (d / 2);
        g.fillStyle = cols[(Math.abs(row * 3 + col * 2)) % cols.length];
        g.beginPath();
        g.moveTo(cx, cy - d / 2);
        g.lineTo(cx + d / 2, cy);
        g.lineTo(cx, cy + d / 2);
        g.lineTo(cx - d / 2, cy);
        g.closePath();
        g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.18)';
        g.lineWidth = 2;
        g.stroke();
      }
    }
  },
};

export const FACADE_STYLES = ['secession', 'baroque', 'church', 'modern', 'generic'];

/** Cached CanvasTexture for a style key (façade style or roof_tile / roof_dome / roof_poly). */
export function getFacadeTexture(key, size = S) {
  const id = `${key}@${size}`;
  if (cache.has(id)) return cache.get(id);
  const [c, g] = canvas();
  (DRAW[key] || DRAW.generic)(g);
  let src = c;
  if (size !== S) {
    // lower-resolution copy for the low-quality fallback
    const small = document.createElement('canvas');
    small.width = small.height = size;
    small.getContext('2d').drawImage(c, 0, 0, size, size);
    src = small;
  }
  const tex = new THREE.CanvasTexture(src);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  cache.set(id, tex);
  return tex;
}
