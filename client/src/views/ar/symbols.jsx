/**
 * Distinct 3D geometry for each memory symbol. Each symbol is about 0.25 units tall,
 * centred on the origin, and animates itself.
 *   candle        wax pillar, wick and a shader flame that flickers
 *   flower        a two-tier lotus whose petals breathe open and closed
 *   musical_note  an eighth note (head, stem, curled flag) that sways
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { makeFlameMaterial, useShader } from './materials.js';

/* shared geometry, created once at module load */
const petalGeo = (() => {
  const g = new THREE.SphereGeometry(1, 16, 12);
  g.scale(0.032, 0.01, 0.08);
  g.translate(0, 0, 0.075); // extend outward from the centre
  return g;
})();
const flagGeo = new THREE.TubeGeometry(
  new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.035, -0.025, 0),
    new THREE.Vector3(0.065, -0.07, 0),
    new THREE.Vector3(0.05, -0.12, 0),
  ]),
  24,
  0.011,
  6,
);

function Candle({ color, selected }) {
  const flame = useShader(makeFlameMaterial, '#ff9a3c');
  const flameRef = useRef();
  useFrame(({ clock }) => {
    if (flameRef.current) flameRef.current.scale.setScalar(selected ? 1.25 + Math.sin(clock.elapsedTime * 10) * 0.05 : 1);
  });
  return (
    <group position-y={-0.06}>
      <mesh>
        <cylinderGeometry args={[0.035, 0.038, 0.13, 20]} />
        <meshStandardMaterial color="#fff7e6" emissive="#fde68a" emissiveIntensity={0.35} roughness={0.4} />
      </mesh>
      {/* melted rim */}
      <mesh position-y={0.065}>
        <torusGeometry args={[0.03, 0.007, 8, 24]} />
        <meshStandardMaterial color="#fffaf0" emissive="#fde68a" emissiveIntensity={0.6} />
      </mesh>
      <mesh position-y={0.075}>
        <cylinderGeometry args={[0.002, 0.002, 0.02, 4]} />
        <meshBasicMaterial color="#1c1917" />
      </mesh>
      <group ref={flameRef} position-y={0.11}>
        <mesh material={flame} scale={[0.022, 0.045, 0.022]}>
          <sphereGeometry args={[1, 16, 12]} />
        </mesh>
        <mesh scale={0.06}>
          <sphereGeometry args={[1, 12, 12]} />
          <meshBasicMaterial color={color} transparent opacity={0.18} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

function Lotus({ color, selected }) {
  const outer = useRef([]);
  const inner = useRef([]);
  const group = useRef();
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const open = selected ? 1 : 0.5 + Math.sin(t * 0.9) * 0.25;
    outer.current.forEach((p) => p && (p.rotation.x = -THREE.MathUtils.lerp(0.25, 0.75, open)));
    inner.current.forEach((p) => p && (p.rotation.x = -THREE.MathUtils.lerp(0.75, 1.15, open)));
    if (group.current) group.current.rotation.y += dt * 0.3;
  });
  return (
    <group ref={group} position-y={-0.02} scale={1.15}>
      {Array.from({ length: 8 }, (_, i) => (
        <group key={`o${i}`} rotation-y={(i / 8) * Math.PI * 2}>
          <mesh ref={(el) => (outer.current[i] = el)} geometry={petalGeo}>
            <meshStandardMaterial color="#fbcfe8" emissive={color} emissiveIntensity={0.9} roughness={0.35} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <group key={`i${i}`} rotation-y={((i + 0.5) / 6) * Math.PI * 2} scale={0.75}>
          <mesh ref={(el) => (inner.current[i] = el)} geometry={petalGeo}>
            <meshStandardMaterial color="#fff1f8" emissive="#f9a8d4" emissiveIntensity={1.1} toneMapped={false} />
          </mesh>
        </group>
      ))}
      <mesh position-y={0.012}>
        <sphereGeometry args={[0.022, 16, 12]} />
        <meshStandardMaterial color="#fde68a" emissive="#f59e0b" emissiveIntensity={1.5} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Note({ color, selected }) {
  const group = useRef();
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (!group.current) return;
    group.current.rotation.z = Math.sin(t * (selected ? 4 : 1.6)) * 0.18;
    group.current.rotation.y = Math.sin(t * 0.7) * 0.6;
  });
  const mat = <meshStandardMaterial color="#e0f2fe" emissive={color} emissiveIntensity={1.3} roughness={0.25} metalness={0.2} toneMapped={false} />;
  return (
    <group ref={group} position={[-0.02, -0.08, 0]}>
      <mesh rotation-z={0.45} scale={[1.3, 0.9, 0.85]}>
        <sphereGeometry args={[0.042, 20, 16]} />
        {mat}
      </mesh>
      <mesh position={[0.048, 0.1, 0]}>
        <cylinderGeometry args={[0.007, 0.007, 0.2, 8]} />
        {mat}
      </mesh>
      <mesh position={[0.048, 0.2, 0]} geometry={flagGeo}>
        {mat}
      </mesh>
    </group>
  );
}

export function SymbolMesh({ symbol, color, selected }) {
  if (symbol === 'flower') return <Lotus color={color} selected={selected} />;
  if (symbol === 'musical_note') return <Note color={color} selected={selected} />;
  return <Candle color={color} selected={selected} />;
}
