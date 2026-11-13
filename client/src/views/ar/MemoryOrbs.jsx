import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SYMBOL_META } from '../../components/common.jsx';

const RISE_SECONDS = 2.6;
const tmp = new THREE.Vector3();

function Orb({ memory, selected, isNew, onSelect }) {
  const group = useRef();
  const core = useRef();
  const halo = useRef();
  const pillar = useRef();
  const [hovered, setHovered] = useState(false);
  const born = useRef(isNew ? performance.now() : 0);
  const color = SYMBOL_META[memory.symbol]?.color || '#f59e0b';
  const { x, y, z } = memory.position || { x: 1.5, y: 0.5, z: 0 };
  const seed = useRef(Math.random() * 10).current;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const age = born.current ? (performance.now() - born.current) / 1000 : Infinity;
    const rise = Math.min(1, age / RISE_SECONDS);
    const ease = 1 - Math.pow(1 - rise, 3);
    const targetY = y + 0.35 + Math.sin(t * 1.2 + seed) * 0.08;

    if (group.current) {
      // new memories rise out of the tablet (y = 0) up to their orbit slot
      group.current.position.set(x * ease, THREE.MathUtils.lerp(-0.2, targetY, ease), z * ease);
    }
    const s = (selected ? 1.6 : hovered ? 1.25 : 1) * (0.3 + 0.7 * ease);
    core.current?.scale.lerp(tmp.setScalar(s), 0.15);
    if (halo.current) {
      const pulse = 1.6 + Math.sin(t * 3 + seed) * 0.15 + (selected ? 0.6 : 0);
      halo.current.scale.setScalar(pulse * s);
      halo.current.material.opacity = selected ? 0.35 : 0.18;
    }
    if (pillar.current) {
      pillar.current.visible = rise < 1;
      pillar.current.material.opacity = (1 - rise) * 0.6;
    }
  });

  return (
    <group ref={group}>
      <mesh
        ref={core}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(memory);
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
        <sphereGeometry args={[0.11, 32, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={selected ? 3 : 1.6} toneMapped={false} />
      </mesh>
      <mesh ref={halo} raycast={() => null}>
        <sphereGeometry args={[0.11, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {selected && (
        <mesh rotation-x={Math.PI / 2} raycast={() => null}>
          <torusGeometry args={[0.28, 0.008, 8, 64]} />
          <meshBasicMaterial color="#f5f0e6" />
        </mesh>
      )}
      {/* light pillar shown only while rising */}
      <mesh ref={pillar} position-y={-1} raycast={() => null}>
        <cylinderGeometry args={[0.02, 0.12, 2, 12, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

export default function MemoryOrbs({ memories, activeNodeId, newId, onSelect }) {
  const ring = useRef();
  useFrame((_, dt) => {
    if (ring.current) ring.current.rotation.y += dt * 0.08;
  });
  return (
    <group ref={ring}>
      {memories.map((m) => (
        <Orb key={m.id} memory={m} selected={m.id === activeNodeId} isNew={m.id === newId} onSelect={onSelect} />
      ))}
    </group>
  );
}
