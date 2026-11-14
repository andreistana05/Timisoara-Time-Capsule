/**
 * One lit, textured material for every realistic façade / roof bucket. Owner: Member 3.
 *
 * Why a ShaderMaterial and not MeshLambert/Standard: the era light rig lives in uniforms, so the plaza can be
 * dusk-blue in 1989 without relighting the orbs/pedestal, and it is cheaper on phones (hemisphere + 1 sun,
 * no shadow maps). Features: map × per-building tint (aTint), desaturation/grading, grime toward the ground,
 * fake AO at the wall base, glass detection (bluish texels) → dark glass by day / randomly lit windows at night
 * (per window cell + per-building aSeed, subtle flicker), and the build-up reveal / crossfade (uReveal, uBand, uFade)
 * shared with the hologram mode.
 */
import * as THREE from 'three';
import { sharedTime } from '../materials.js';

const vert = /* glsl */ `
  attribute vec3 aTint;
  attribute float aSeed;
  varying vec2 vUv;
  varying vec3 vNw;
  varying vec3 vTint;
  varying float vSeed;
  varying float vY;
  void main() {
    vUv = uv;
    vTint = aTint;
    vSeed = aSeed;
    vY = position.y;
    vNw = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const frag = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uHasMap;
  uniform float uIsWall;
  uniform vec3 uSky;
  uniform vec3 uGround;
  uniform float uSkyI;
  uniform vec3 uSunColor;
  uniform float uSunI;
  uniform vec3 uSunDir;
  uniform vec3 uGrade;
  uniform float uDesat;
  uniform float uGrime;
  uniform float uLitFrac;
  uniform vec3 uLitColor;
  uniform float uLitI;
  uniform float uFlicker;
  uniform float uTime;
  uniform float uReveal;
  uniform float uBand;
  uniform float uFade;
  varying vec2 vUv;
  varying vec3 vNw;
  varying vec3 vTint;
  varying float vSeed;
  varying float vY;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  void main() {
    if (vY > uReveal) discard;
    vec3 tex = uHasMap > 0.5 ? texture2D(uMap, vUv).rgb : vec3(0.82);
    float glass = uIsWall * smoothstep(0.015, 0.045, tex.b - tex.r);
    vec3 albedo = tex * vTint;
    float l = dot(albedo, vec3(0.299, 0.587, 0.114));
    albedo = max(mix(albedo, vec3(l), uDesat), 0.0);

    // weathering (walls): soot toward the ground + vertical streaks per facade column, fake AO at the base
    float floorsUp = vUv.y;
    float streak = hash(vec2(floor(vUv.x * 5.0), floor(vSeed * 97.0)));
    float grime = uGrime * uIsWall * (0.38 * (1.0 - smoothstep(0.0, 2.2, floorsUp)) + 0.16 * streak * (1.0 - fract(floorsUp)));
    float ao = mix(1.0, mix(0.5, 1.0, smoothstep(0.0, 0.6, floorsUp)), uIsWall);
    albedo *= ao * (1.0 - grime);

    // light: hemisphere sky/ground + one sun
    vec3 n = normalize(vNw);
    float hemi = n.y * 0.5 + 0.5;
    vec3 light = mix(uGround, uSky, hemi) * uSkyI + uSunColor * uSunI * max(dot(n, normalize(uSunDir)), 0.0);
    vec3 col = albedo * light;

    // glass: darker, slight sky reflection
    col = mix(col, col * 0.45 + uSky * uSkyI * 0.12, glass);

    // lit windows (one random decision per window cell = 2 per tile horizontally, 1 per floor)
    vec2 cell = floor(vec2(vUv.x * 2.0, vUv.y));
    float h = hash(cell + vSeed * 17.0);
    float lit = step(h, uLitFrac) * glass;
    float flick = 1.0 + uFlicker * 0.08 * sin(uTime * (1.3 + h * 2.7) + h * 40.0);
    col += lit * uLitColor * uLitI * flick * (0.75 + 0.25 * h);

    col *= uGrade;

    // build-up scan front
    float front = smoothstep(0.07, 0.0, uReveal - vY) * uBand;
    col = mix(col, vec3(1.0), front * 0.7);

    gl_FragColor = vec4(col, uFade);
    #include <colorspace_fragment>
  }
`;

const lin = (hex) => new THREE.Color(hex); // THREE.Color converts sRGB hex → linear (ColorManagement)

/** Era uniforms shared by every material of one plaza (update once, all buckets follow). */
export function makeEraUniforms(look) {
  return {
    uSky: { value: lin(look.sky) },
    uGround: { value: lin(look.ground) },
    uSkyI: { value: look.skyI },
    uSunColor: { value: lin(look.sun) },
    uSunI: { value: look.sunI },
    uSunDir: { value: new THREE.Vector3(...look.sunDir).normalize() },
    uGrade: { value: new THREE.Vector3(...look.grade) },
    uDesat: { value: look.desat },
    uGrime: { value: look.grime },
    uLitFrac: { value: look.litFrac },
    uLitColor: { value: lin(look.litColor) },
    uLitI: { value: look.litI },
    uFlicker: { value: look.flicker },
  };
}

/**
 * @param shared  { uReveal, uBand, uFade } uniform objects (shared with the plaza's reveal animation)
 * @param era     result of makeEraUniforms (shared)
 * @param map     THREE.Texture | null
 * @param isWall  façade bucket (windows, weathering, AO) vs roof bucket
 */
export function makeRealMaterial(shared, era, map, isWall) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...era,
      uMap: { value: map },
      uHasMap: { value: map ? 1 : 0 },
      uIsWall: { value: isWall ? 1 : 0 },
      uTime: sharedTime,
      uReveal: shared.uReveal,
      uBand: shared.uBand,
      uFade: shared.uFade,
    },
    vertexShader: vert,
    fragmentShader: frag,
    transparent: true, // for the crossfade; depth still written so façades occlude correctly
    depthWrite: true,
    side: isWall ? THREE.FrontSide : THREE.DoubleSide, // roofs: double-sided safety net (normals are oriented up anyway)
    toneMapped: false,
  });
}
