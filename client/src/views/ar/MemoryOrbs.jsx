/**
 * Memory orbs: a symbol (candle / lotus / note) inside a fresnel glass bubble,
 * orbiting the diorama.
 *  - Tap: onSelect(memory, worldPosition). There is a large invisible hit sphere so small orbs are easy to tap.
 *  - Selected: grows, gets gyroscope rings, a light tether to the pedestal, and pulses with each spoken word.
 *  - New: spirals out of the pedestal centre with a light pillar, particle swirl, shockwave and rising sound.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SYMBOL_META } from '../../components/common.jsx';
import { SymbolMesh } from './symbols.jsx';
import { makeBeamMaterial, makeShellMaterial, useShader, getDotTexture } from './materials.js';
import { getAura, playRise, audioReady } from './spatialAudio.js';

const RISE_SECONDS = 3.2;
const FX_SECONDS = 4.5;

/** Set to 1 on every spoken word; decays every frame. */
export const speechPulse = { value: 0 };

const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

/** Path from the pedestal centre to the memory's orbit slot (ring-local coordinates). */
function risePath(slot, k, out) {
  const r = Math.hypot(slot.x, slot.z);
  const ang = Math.atan2(slot.z, slot.x) - (1 - easeInOut(k)) * Math.PI * 1.6;
  const rr = r * easeInOut(k);
  return out.set(Math.cos(ang) * rr, THREE.MathUtils.lerp(0.05, slot.y, easeOut(k)), Math.sin(ang) * rr);
}

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();

function Orb({ memory, selected, isNew, onSelect }) {
  const color = SYMBOL_META[memory.symbol]?.color || '#f59e0b';
  const slot = useMemo(() => {
    const p = memory.position || { x: 1.6, y: 0.6, z: 0 };
    return { x: p.x, y: p.y + 0.35, z: p.z };
  }, [memory.position]);
  const group = useRef();
  const body = useRef();
  const rings = useRef();
  const tether = useRef();
  const [hovered, setHovered] = useState(false);
  const born = useRef(isNew ? performance.now() : 0);
  const seed = useMemo(() => Math.random() * 10, []);
  const shell = useShader(makeShellMaterial, color, 1);
  const tetherMat = useShader(makeBeamMaterial, color, 0.9);

  useEffect(() => {
    if (isNew && audioReady()) playRise({ x: 0, y: 0, z: 0 }, memory.symbol);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const age = born.current ? (performance.now() - born.current) / 1000 : Infinity;
    const k = Math.min(1, age / RISE_SECONDS);
    if (!group.current) return;

    risePath(slot, k, group.current.position);
    group.current.position.y += Math.sin(t * 1.1 + seed) * 0.07 * k;

    const pulse = selected ? speechPulse.value * 0.25 : 0;
    const overshoot = k < 1 ? Math.sin(k * Math.PI) * 0.4 : 0;
    const s = (selected ? 1.45 : hovered ? 1.2 : 1) * (0.35 + 0.65 * easeOut(k)) + overshoot + pulse;
    body.current.scale.lerp(_v.setScalar(s), 0.18);
    shell.uniforms.uIntensity.value = (selected ? 1.6 : 1) + pulse * 3;

    if (rings.current) {
      rings.current.visible = selected;
      rings.current.rotation.x += 0.02;
      rings.current.rotation.y += 0.013;
    }
    if (tether.current) {
      const h = Math.max(0.01, group.current.position.y);
      tether.current.visible = selected;
      tether.current.scale.set(1, h, 1);
      tether.current.position.y = -h / 2;
    }
    // keep the spatial aura glued to this orb
    if (selected) {
      const aura = getAura();
      if (aura?.id === memory.id) aura.handle.setPosition(group.current.getWorldPosition(_w));
    }
  });

  return (
    <group ref={group}>
      <group ref={body}>
        <SymbolMesh symbol={memory.symbol} color={color} selected={selected} />
        <mesh material={shell}>
          <sphereGeometry args={[0.17, 32, 24]} />
        </mesh>
        <mesh scale={0.26}>
          <sphereGeometry args={[1, 16, 12]} />
          <meshBasicMaterial color={color} transparent opacity={selected ? 0.12 : 0.06} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        <group ref={rings} visible={false}>
          <mesh rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.24, 0.005, 8, 64]} />
            <meshBasicMaterial color="#f5f0e6" toneMapped={false} />
          </mesh>
          <mesh rotation-y={Math.PI / 2}>
            <torusGeometry args={[0.27, 0.004, 8, 64]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        </group>
      </group>
      {/* tether of light down to the pedestal (unit height, scaled each frame) */}
      <mesh ref={tether} material={tetherMat} visible={false} raycast={() => null}>
        <cylinderGeometry args={[0.012, 0.05, 1, 12, 1, true]} />
      </mesh>
      {/* generous invisible hit area for fingers */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect(memory, group.current.getWorldPosition(new THREE.Vector3()));
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = '';
        }}
      >
        <sphereGeometry args={[0.28, 12, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}

/** Light pillar, spiralling particles and a shockwave for a newly risen memory. */
function RiseFX({ memory }) {
  const color = SYMBOL_META[memory.symbol]?.color || '#f59e0b';
  const slot = useMemo(() => {
    const p = memory.position || { x: 1.6, y: 0.6, z: 0 };
    return { x: p.x, y: p.y + 0.35, z: p.z };
  }, [memory.position]);
  const born = useRef(performance.now());
  const [done, setDone] = useState(false);
  const pillarMat = useShader(makeBeamMaterial, color, 1.4);
  const pillar = useRef();
  const wave = useRef();
  const pts = useRef();
  const N = 180;
  const particles = useMemo(() => {
    const lag = new Float32Array(N);
    const orbit = new Float32Array(N);
    const rad = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      lag[i] = Math.random();
      orbit[i] = Math.random() * Math.PI * 2;
      rad[i] = 0.05 + Math.random() * 0.22;
    }
    const colors = new Float32Array(N * 3);
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      c.set(color).lerp(new THREE.Color('#ffffff'), Math.random() * 0.6);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    return { lag, orbit, rad, colors, pos: new Float32Array(N * 3) };
  }, [color]);

  useFrame(() => {
    if (done) return;
    const age = (performance.now() - born.current) / 1000;
    if (age > FX_SECONDS) return setDone(true);
    const k = Math.min(1, age / RISE_SECONDS);
    const fade = 1 - Math.max(0, (age - RISE_SECONDS * 0.6) / (FX_SECONDS - RISE_SECONDS * 0.6));

    pillarMat.uniforms.uIntensity.value = 1.6 * fade * (0.8 + Math.sin(age * 20) * 0.2);
    pillar.current.scale.set(1 + (1 - k) * 0.6, 1, 1 + (1 - k) * 0.6);

    const wk = Math.min(1, age / 1.4);
    wave.current.scale.setScalar(0.2 + easeOut(wk) * 2.2);
    wave.current.material.opacity = (1 - wk) * 0.9;

    for (let i = 0; i < N; i++) {
      const kk = Math.max(0, Math.min(1, k - particles.lag[i] * 0.45));
      risePath(slot, kk, _v);
      const a = particles.orbit[i] + age * (3 + particles.lag[i] * 4);
      const r = particles.rad[i] * (1 - kk * 0.5) + (1 - kk) * 0.15;
      particles.pos[i * 3] = _v.x + Math.cos(a) * r;
      particles.pos[i * 3 + 1] = _v.y + Math.sin(a * 1.3) * 0.05 + (1 - kk) * particles.lag[i] * 0.3;
      particles.pos[i * 3 + 2] = _v.z + Math.sin(a) * r;
    }
    pts.current.geometry.attributes.position.needsUpdate = true;
    pts.current.material.opacity = fade;
  });

  if (done) return null;
  return (
    <group>
      <mesh ref={pillar} position-y={1.4} material={pillarMat} raycast={() => null}>
        <cylinderGeometry args={[0.12, 0.3, 2.8, 24, 1, true]} />
      </mesh>
      <mesh ref={wave} rotation-x={-Math.PI / 2} position-y={0.02} raycast={() => null}>
        <ringGeometry args={[0.9, 1, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <points ref={pts} frustumCulled={false} raycast={() => null}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particles.pos, 3]} />
          <bufferAttribute attach="attributes-color" args={[particles.colors, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.07} map={getDotTexture()} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}

export default function MemoryOrbs({ memories, activeNodeId, newId, onSelect }) {
  const ring = useRef();
  useFrame((_, dt) => {
    // orbit slowly; pause while a story is being told so the orb stays put
    if (ring.current && !activeNodeId) ring.current.rotation.y += dt * 0.07;
    speechPulse.value *= Math.pow(0.02, dt); // decays to about 2% per second
  });
  const fresh = newId ? memories.find((m) => m.id === newId) : null;
  return (
    <group ref={ring}>
      {memories.map((m) => (
        <Orb key={m.id} memory={m} selected={m.id === activeNodeId} isNew={m.id === newId} onSelect={onSelect} />
      ))}
      {fresh && <RiseFX key={fresh.id} memory={fresh} />}
    </group>
  );
}
