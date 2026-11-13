/**
 * Custom holographic shaders for the AR lens. All materials share one time
 * uniform (`sharedTime`), advanced once per frame by <ShaderClock/>.
 */
import { useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const sharedTime = { value: 0 };

export function ShaderClock() {
  useFrame(({ clock }) => {
    sharedTime.value = clock.elapsedTime;
  });
  return null;
}

const viewVaryings = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;
`;

/* ───────────── Volumetric light beam (open cone, origin at the bottom) ───────────── */
const beamVert = /* glsl */ `
  ${viewVaryings}
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const beamFrag = /* glsl */ `
  ${viewVaryings}
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uIntensity;
  void main() {
    float facing = abs(dot(normalize(vN), normalize(vV)));
    float core = pow(facing, 2.2);                                   // bright centre, soft edges
    float fadeY = pow(1.0 - vUv.y, 1.35) * smoothstep(0.0, 0.05, vUv.y);
    float dust = 0.7 + 0.3 * sin(vUv.y * 42.0 - uTime * 2.2 + vUv.x * 18.85);
    float a = core * fadeY * dust * uIntensity;
    gl_FragColor = vec4(uColor * (0.8 + core), a);
  }
`;

export function makeBeamMaterial(color, intensity = 0.6) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uTime: sharedTime, uIntensity: { value: intensity } },
    vertexShader: beamVert,
    fragmentShader: beamFrag,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

/* ───────────── Flickering candle flame (works on Mesh and InstancedMesh) ───────────── */
const flameVert = /* glsl */ `
  ${viewVaryings}
  varying float vT;
  uniform float uTime;
  void main() {
    vUv = uv;
    vec3 p = position;
    float phase = 0.0;
    #ifdef USE_INSTANCING
      phase = instanceMatrix[3].x * 13.0 + instanceMatrix[3].z * 7.0;
    #endif
    float t = clamp((p.y + 1.0) * 0.5, 0.0, 1.0);                  // 0 base → 1 tip
    p.xz *= mix(1.0, 0.25, t * t);                                   // teardrop taper
    p.x += sin(uTime * 9.0 + phase + p.y * 3.0) * 0.18 * t * t;
    p.z += cos(uTime * 7.0 + phase * 1.3) * 0.12 * t * t;
    p.y *= 1.0 + 0.15 * sin(uTime * 13.0 + phase) * t;
    vT = t;
    vec4 local = vec4(p, 1.0);
    #ifdef USE_INSTANCING
      local = instanceMatrix * local;
    #endif
    vec4 mv = modelViewMatrix * local;
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const flameFrag = /* glsl */ `
  ${viewVaryings}
  varying float vT;
  uniform vec3 uColor;
  void main() {
    float f = abs(dot(normalize(vN), normalize(vV)));
    vec3 core = vec3(1.0, 0.97, 0.85);
    vec3 col = mix(uColor, core, pow(f, 1.8) * (1.0 - vT * 0.8));
    float a = pow(f, 1.3) * (1.0 - vT * 0.55);
    gl_FragColor = vec4(col * 1.6, a);
  }
`;

export function makeFlameMaterial(color = '#ff9a3c') {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uTime: sharedTime },
    vertexShader: flameVert,
    fragmentShader: flameFrag,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/* ───────────── Fresnel hologram shell (glass bubble around memory orbs) ───────────── */
const shellFrag = /* glsl */ `
  ${viewVaryings}
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uIntensity;
  void main() {
    float rim = 1.0 - abs(dot(normalize(vN), normalize(vV)));
    float scan = 0.82 + 0.18 * sin(gl_FragCoord.y * 1.4 - uTime * 6.0);
    float a = (pow(rim, 2.4) * 0.95 + 0.04) * scan * uIntensity;
    gl_FragColor = vec4(mix(uColor, vec3(1.0), pow(rim, 6.0) * 0.6), a);
  }
`;

export function makeShellMaterial(color, intensity = 1) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uTime: sharedTime, uIntensity: { value: intensity } },
    vertexShader: beamVert,
    fragmentShader: shellFrag,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/** Create a material once per (factory,args) and dispose it on unmount. */
export function useShader(factory, ...args) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mat = useMemo(() => factory(...args), args);
  useEffect(() => () => mat.dispose(), [mat]);
  return mat;
}

/* ───────────── soft round sprite for particles ───────────── */
let dotTexture;
export function getDotTexture() {
  if (dotTexture) return dotTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  dotTexture = new THREE.CanvasTexture(c);
  return dotTexture;
}

/* ───────────── The Seal, redrawn as a texture for the hologram pedestal ───────────── */
const sealCache = new Map();
export function getSealTexture(color, accent) {
  const key = color + accent;
  if (sealCache.has(key)) return sealCache.get(key);
  const S = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.translate(S / 2, S / 2);
  const k = S / 400; // the tablet SVG uses a 400-unit viewBox
  g.scale(k, k);
  g.lineCap = 'round';
  // tick ring
  g.strokeStyle = color;
  for (let a = 0; a < 360; a += 5) {
    g.save();
    g.rotate((a * Math.PI) / 180);
    g.lineWidth = a % 30 === 0 ? 2.5 : 1;
    g.beginPath();
    g.moveTo(0, -192);
    g.lineTo(0, a % 30 === 0 ? -172 : -183);
    g.stroke();
    g.restore();
  }
  g.globalAlpha = 0.5;
  g.beginPath();
  g.arc(0, 0, 192, 0, Math.PI * 2);
  g.stroke();
  g.globalAlpha = 1;
  // Secession petals
  g.strokeStyle = accent;
  g.lineWidth = 1.6;
  for (let a = 0; a < 360; a += 30) {
    g.save();
    g.rotate((a * Math.PI) / 180);
    g.beginPath();
    g.moveTo(0, -160);
    g.bezierCurveTo(30, -130, 30, -100, 0, -80);
    g.bezierCurveTo(-30, -100, -30, -130, 0, -160);
    g.stroke();
    g.restore();
  }
  // core
  g.strokeStyle = '#f5f0e6';
  g.lineWidth = 5;
  g.beginPath();
  g.arc(0, 0, 118, 0, Math.PI * 2);
  g.stroke();
  g.save();
  g.rotate(Math.PI / 4);
  g.strokeRect(-70, -70, 140, 140);
  g.restore();
  g.strokeStyle = color;
  g.lineWidth = 4;
  g.strokeRect(-58, -58, 116, 116);
  g.fillStyle = 'rgba(245,240,230,0.85)';
  g.beginPath();
  g.arc(0, 0, 46, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = color;
  g.beginPath();
  g.arc(0, 0, 8, 0, Math.PI * 2);
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  sealCache.set(key, tex);
  return tex;
}
