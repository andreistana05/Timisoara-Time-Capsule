/**
 * Chapter-specific holographic centrepieces. Pure procedural geometry —
 * no external models, so it works offline. Swap in GLB models later by
 * dropping them into /client/public/assets/ar/ and using drei's useGLTF.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles, Float, Edges } from '@react-three/drei';
import * as THREE from 'three';

/* ───────────── shared: hologram pedestal (mirrors the tablet Seal) ───────────── */
export function HoloBase({ color }) {
  const ref = useRef();
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z += dt * 0.15;
  });
  return (
    <group rotation-x={-Math.PI / 2}>
      <mesh ref={ref}>
        <ringGeometry args={[2.1, 2.16, 96]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <ringGeometry args={[1.2, 1.22, 4]} />
        <meshBasicMaterial color="#f5f0e6" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <circleGeometry args={[2.1, 96]} />
        <meshBasicMaterial color={color} transparent opacity={0.07} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ───────────── embers rising (Piața Maria) ───────────── */
const EMBER_COLORS = ['#ef4444', '#f59e0b', '#ff7a45'];

// soft round sprite so points render as glowing embers, not squares
let dotTexture;
function getDotTexture() {
  if (dotTexture) return dotTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  dotTexture = new THREE.CanvasTexture(c);
  return dotTexture;
}

function Embers({ count = 220, colors = EMBER_COLORS }) {
  const ref = useRef();
  const { positions, speeds, colorArr } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colorArr = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 3.2;
      positions[i * 3 + 1] = Math.random() * 2.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
      speeds[i] = 0.2 + Math.random() * 0.5;
      c.set(colors[i % colors.length]);
      colorArr.set([c.r, c.g, c.b], i * 3);
    }
    return { positions, speeds, colorArr };
  }, [count, colors]);

  useFrame((state, dt) => {
    const pos = ref.current?.geometry.attributes.position;
    if (!pos) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      let y = pos.array[i * 3 + 1] + speeds[i] * dt;
      if (y > 2.6) y = 0;
      pos.array[i * 3 + 1] = y;
      pos.array[i * 3] += Math.sin(t * 2 + i) * 0.002;
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colorArr, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.09} map={getDotTexture()} vertexColors transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

function Tram({ position, rotation = 0, color }) {
  return (
    <group position={position} rotation-y={rotation}>
      <mesh position-y={0.32}>
        <boxGeometry args={[1.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#1b1b26" emissive={color} emissiveIntensity={0.25} metalness={0.4} roughness={0.5} />
        <Edges color={color} />
      </mesh>
      {/* windows strip */}
      {[-0.5, -0.17, 0.17, 0.5].map((x) => (
        <mesh key={x} position={[x, 0.4, 0.252]}>
          <planeGeometry args={[0.25, 0.18]} />
          <meshBasicMaterial color="#fde68a" transparent opacity={0.85} />
        </mesh>
      ))}
      {/* pantograph */}
      <mesh position={[0, 0.7, 0]} rotation-z={0.5}>
        <boxGeometry args={[0.02, 0.4, 0.02]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

function PiataMaria({ theme }) {
  return (
    <group>
      {/* rails */}
      {[-0.35, 0.35].map((z) => (
        <mesh key={z} position={[0, 0.02, z]}>
          <boxGeometry args={[4, 0.02, 0.03]} />
          <meshBasicMaterial color="#f5f0e6" transparent opacity={0.5} />
        </mesh>
      ))}
      <Tram position={[-0.85, 0, -0.1]} rotation={0.12} color={theme.primary} />
      <Tram position={[0.9, 0, 0.25]} rotation={-0.18} color={theme.secondary} />
      {/* the human chain — a ring of tiny figures */}
      {Array.from({ length: 22 }, (_, i) => {
        const a = (i / 22) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 1.55, 0.15, Math.sin(a) * 1.0]}>
            <capsuleGeometry args={[0.04, 0.18, 4, 8]} />
            <meshStandardMaterial color="#f5f0e6" emissive={theme.secondary} emissiveIntensity={0.6} />
          </mesh>
        );
      })}
      <Embers />
      <pointLight position={[0, 1, 0]} color={theme.primary} intensity={6} distance={5} />
    </group>
  );
}

/* ───────────── Opera balcony monolith ───────────── */
function LightBeam({ x, z, color, phase }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) ref.current.material.opacity = 0.12 + Math.sin(clock.elapsedTime * 1.5 + phase) * 0.08;
  });
  return (
    <mesh ref={ref} position={[x, 2.2, z]}>
      <cylinderGeometry args={[0.04, 0.18, 4.4, 16, 1, true]} />
      <meshBasicMaterial color={color} transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Opera({ theme }) {
  const columns = [-0.75, -0.45, -0.15, 0.15, 0.45, 0.75];
  return (
    <group position-z={-0.3}>
      {/* main body */}
      <mesh position-y={0.7}>
        <boxGeometry args={[2, 1.4, 0.8]} />
        <meshStandardMaterial color="#1b1b26" emissive={theme.primary} emissiveIntensity={0.12} metalness={0.3} roughness={0.6} />
        <Edges color={theme.primary} />
      </mesh>
      {/* roof dome */}
      <mesh position-y={1.5}>
        <sphereGeometry args={[0.35, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={theme.primary} emissive={theme.primary} emissiveIntensity={0.5} wireframe />
      </mesh>
      {/* columns */}
      {columns.map((x) => (
        <mesh key={x} position={[x, 0.45, 0.45]}>
          <cylinderGeometry args={[0.045, 0.05, 0.9, 12]} />
          <meshStandardMaterial color="#f5f0e6" emissive="#fde68a" emissiveIntensity={0.3} />
        </mesh>
      ))}
      {/* the balcony */}
      <mesh position={[0, 0.95, 0.55]}>
        <boxGeometry args={[1.0, 0.05, 0.3]} />
        <meshStandardMaterial color={theme.primary} emissive={theme.primary} emissiveIntensity={1.2} />
      </mesh>
      {columns.map((x, i) => (
        <LightBeam key={x} x={x * 1.6} z={1.3} color={i % 2 ? theme.secondary : theme.primary} phase={i} />
      ))}
      {/* sea of candles in the square */}
      <Sparkles count={160} scale={[3.4, 0.25, 1.6]} position={[0, 0.12, 1.2]} size={2.5} speed={0.3} color={theme.primary} />
      <pointLight position={[0, 1.2, 1]} color={theme.primary} intensity={8} distance={5} />
    </group>
  );
}

/* ───────────── Multicultural kinetic sculpture ───────────── */
const RING_COLORS = ['#f59e0b', '#ef4444', '#38bdf8', '#a78bfa', '#34d399', '#f472b6'];

function Mosaic() {
  const rings = useRef([]);
  useFrame((_, dt) => {
    rings.current.forEach((r, i) => {
      if (!r) return;
      r.rotation.x += dt * (0.15 + i * 0.05) * (i % 2 ? 1 : -1);
      r.rotation.y += dt * (0.1 + i * 0.03);
    });
  });
  return (
    <group position-y={1.15}>
      <Float speed={2} floatIntensity={0.3}>
        <mesh>
          <icosahedronGeometry args={[0.32, 0]} />
          <meshStandardMaterial color="#f5f0e6" emissive="#fde68a" emissiveIntensity={0.8} flatShading />
        </mesh>
      </Float>
      {RING_COLORS.map((c, i) => (
        <mesh key={c} ref={(el) => (rings.current[i] = el)} rotation={[i * 0.5, i * 0.9, 0]}>
          <torusGeometry args={[0.5 + i * 0.13, 0.012 + (i % 3) * 0.006, 12, 120]} />
          <meshStandardMaterial color={c} emissive={c} emissiveIntensity={1.4} />
        </mesh>
      ))}
      <Sparkles count={80} scale={2.4} size={2} speed={0.4} color="#fde68a" />
      <pointLight color="#fde68a" intensity={6} distance={5} />
    </group>
  );
}

export function Diorama({ chapterId, theme }) {
  if (chapterId === '1989_opera') return <Opera theme={theme} />;
  if (chapterId === 'multicultural_mosaic') return <Mosaic />;
  return <PiataMaria theme={theme} />;
}
