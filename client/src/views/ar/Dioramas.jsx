/**
 * Chapter dioramas — 100% procedural (no model files → works offline).
 *  1989_piata_maria      Two Timișoara trams blocked on the rails, pantograph sparks,
 *                        the parish house and the candle-lit human chain, rising embers.
 *  1989_opera            The Opera façade with its balcony & the flag with the hole,
 *                        a candle-lit crowd and sweeping volumetric light pillars.
 *  multicultural_mosaic  A kinetic Secession pavilion: whiplash arches, a rippling
 *                        7-colour hex mosaic floor, counter-rotating rings, 21 orbiting lights.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles, Edges, RoundedBox, Line } from '@react-three/drei';
import * as THREE from 'three';
import { makeBeamMaterial, makeFlameMaterial, useShader, getDotTexture, getSealTexture } from './materials.js';

const rand = (a, b) => a + Math.random() * (b - a);

/* ═════════════════════════════ shared pieces ═════════════════════════════ */

/** Hologram pedestal: the tablet's Seal projected as light + a faint projection cone. */
export function HoloBase({ color, accent }) {
  const disc = useRef();
  const ring = useRef();
  const seal = useMemo(() => getSealTexture(color, accent), [color, accent]);
  const cone = useShader(makeBeamMaterial, color, 0.18);
  useFrame((_, dt) => {
    if (disc.current) disc.current.rotation.z += dt * 0.05;
    if (ring.current) ring.current.rotation.z -= dt * 0.2;
  });
  return (
    <group>
      <group rotation-x={-Math.PI / 2}>
        <mesh ref={disc} position-z={0.002}>
          <circleGeometry args={[2.05, 96]} />
          <meshBasicMaterial map={seal} transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh ref={ring}>
          <ringGeometry args={[2.12, 2.17, 128, 1, 0, Math.PI * 1.7]} />
          <meshBasicMaterial color={color} transparent opacity={0.9} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
        <mesh>
          <circleGeometry args={[2.2, 96]} />
          <meshBasicMaterial color={color} transparent opacity={0.06} depthWrite={false} />
        </mesh>
      </group>
      {/* projection cone rising from the tablet */}
      <mesh position-y={1.4} material={cone}>
        <cylinderGeometry args={[2.3, 1.9, 2.8, 64, 1, true]} />
      </mesh>
    </group>
  );
}

/** Holographic "3D print" reveal used whenever the chapter changes. */
export function Materialize({ color, children }) {
  const group = useRef();
  const scan = useRef();
  const t0 = useRef(null);
  useFrame(({ clock }) => {
    if (t0.current === null) t0.current = clock.elapsedTime;
    const k = Math.min(1, (clock.elapsedTime - t0.current) / 1.5);
    const e = 1 - Math.pow(1 - k, 3);
    group.current?.scale.set(0.85 + 0.15 * e, Math.max(0.001, e), 0.85 + 0.15 * e);
    if (scan.current) {
      scan.current.visible = k < 1;
      scan.current.position.y = e * 2.4;
      scan.current.material.opacity = (1 - k) * 0.9;
    }
  });
  return (
    <>
      <group ref={group}>{children}</group>
      <mesh ref={scan} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[1.6, 2.2, 96]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

/** Thin box between two points in the XY plane (pantographs, struts). */
function Strut({ from, to, thickness = 0.018, color = '#d6d3d1', emissive }) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy);
  return (
    <mesh position={[(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, from[2] ?? 0]} rotation-z={Math.atan2(dy, dx) - Math.PI / 2}>
      <boxGeometry args={[thickness, len, thickness]} />
      <meshStandardMaterial color={color} emissive={emissive || color} emissiveIntensity={emissive ? 1.2 : 0.2} />
    </mesh>
  );
}

/** Simple standing figure (capsule + head). */
function Figure({ position, color = '#f5f0e6', glow = '#f59e0b', scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh position-y={0.11}>
        <capsuleGeometry args={[0.035, 0.12, 4, 8]} />
        <meshStandardMaterial color={color} emissive={glow} emissiveIntensity={0.35} />
      </mesh>
      <mesh position-y={0.23}>
        <sphereGeometry args={[0.03, 12, 12]} />
        <meshStandardMaterial color={color} emissive={glow} emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

/** Instanced candle flames at given points. */
function FlameField({ points, color = '#ff9a3c', size = 0.025 }) {
  const ref = useRef();
  const mat = useShader(makeFlameMaterial, color);
  useEffect(() => {
    const m = new THREE.Matrix4();
    points.forEach((p, i) => {
      m.compose(new THREE.Vector3(...p), new THREE.Quaternion(), new THREE.Vector3(size, size * 1.9, size));
      ref.current.setMatrixAt(i, m);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  }, [points, size]);
  return (
    <instancedMesh ref={ref} args={[undefined, mat, points.length]} frustumCulled={false}>
      <sphereGeometry args={[1, 12, 10]} />
    </instancedMesh>
  );
}

/** Rising embers. */
const EMBER_COLORS = ['#ef4444', '#f59e0b', '#ff7a45', '#fde68a'];
function Embers({ count = 260, spread = [3.6, 2.2], height = 2.8 }) {
  const ref = useRef();
  const { positions, speeds, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      positions.set([rand(-0.5, 0.5) * spread[0], Math.random() * height, rand(-0.5, 0.5) * spread[1]], i * 3);
      speeds[i] = rand(0.15, 0.6);
      c.set(EMBER_COLORS[i % EMBER_COLORS.length]);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    return { positions, speeds, colors };
  }, [count, spread, height]);
  useFrame((state, dt) => {
    const pos = ref.current?.geometry.attributes.position;
    if (!pos) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      let y = pos.array[i * 3 + 1] + speeds[i] * dt;
      if (y > height) y = 0;
      pos.array[i * 3 + 1] = y;
      pos.array[i * 3] += Math.sin(t * 1.7 + i) * 0.0025;
    }
    pos.needsUpdate = true;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.08} map={getDotTexture()} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

/** Electric sparks bursting from a contact point with gravity. */
function SparkEmitter({ origin, count = 70 }) {
  const ref = useRef();
  const sim = useMemo(() => {
    const pos = new Float32Array(count * 3).fill(-99);
    return { pos, vel: new Float32Array(count * 3), life: new Float32Array(count), next: rand(0.3, 1.5) };
  }, [count]);
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    sim.next -= d;
    if (sim.next <= 0) {
      // burst
      sim.next = rand(0.6, 2.6);
      let spawned = 0;
      for (let i = 0; i < count && spawned < 28; i++) {
        if (sim.life[i] > 0) continue;
        sim.pos.set(origin, i * 3);
        sim.vel.set([rand(-1, 1) * 1.2, rand(0.2, 1.4), rand(-1, 1) * 0.6], i * 3);
        sim.life[i] = rand(0.35, 0.8);
        spawned++;
      }
    }
    for (let i = 0; i < count; i++) {
      if (sim.life[i] <= 0) continue;
      sim.life[i] -= d;
      sim.vel[i * 3 + 1] -= 4.5 * d;
      sim.pos[i * 3] += sim.vel[i * 3] * d;
      sim.pos[i * 3 + 1] += sim.vel[i * 3 + 1] * d;
      sim.pos[i * 3 + 2] += sim.vel[i * 3 + 2] * d;
      if (sim.life[i] <= 0) sim.pos[i * 3 + 1] = -99;
    }
    if (ref.current) ref.current.geometry.attributes.position.needsUpdate = true;
  });
  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[sim.pos, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.06} color="#fff3c4" map={getDotTexture()} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

/* ═════════════════════════════ 1 · Piața Maria ═════════════════════════════ */

const WIRE_Y = 1.25;

function Tram({ x, facing = 1, theme }) {
  const L = 1.45;
  const W = 0.44;
  return (
    <group position-x={x} scale-x={facing}>
      {/* bogies + wheels */}
      {[-0.42, 0.42].map((bx) => (
        <group key={bx} position={[bx, 0.06, 0]}>
          <mesh>
            <boxGeometry args={[0.36, 0.06, W * 0.8]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          {[-0.1, 0.1].map((wx) =>
            [-0.17, 0.17].map((wz) => (
              <mesh key={`${wx}${wz}`} position={[wx, -0.02, wz]} rotation-x={Math.PI / 2}>
                <cylinderGeometry args={[0.05, 0.05, 0.03, 16]} />
                <meshStandardMaterial color="#444" metalness={0.8} roughness={0.3} />
              </mesh>
            )),
          )}
        </group>
      ))}
      {/* two-tone body: red skirt, cream top */}
      <RoundedBox args={[L, 0.2, W]} radius={0.04} position-y={0.2}>
        <meshStandardMaterial color="#b91c1c" emissive={theme.primary} emissiveIntensity={0.25} roughness={0.5} />
      </RoundedBox>
      <RoundedBox args={[L, 0.24, W * 0.98]} radius={0.05} position-y={0.4}>
        <meshStandardMaterial color="#f5f0e6" emissive="#f5f0e6" emissiveIntensity={0.08} roughness={0.6} />
        <Edges color={theme.secondary} threshold={30} />
      </RoundedBox>
      {/* warm lit window band */}
      <mesh position-y={0.42}>
        <boxGeometry args={[L * 0.9, 0.13, W + 0.012]} />
        <meshStandardMaterial color="#1a1426" emissive="#fbbf24" emissiveIntensity={0.9} />
      </mesh>
      {/* window mullions */}
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} position={[-L * 0.42 + i * L * 0.14, 0.42, 0]}>
          <boxGeometry args={[0.015, 0.14, W + 0.02]} />
          <meshStandardMaterial color="#f5f0e6" />
        </mesh>
      ))}
      {/* roof */}
      <RoundedBox args={[L * 0.94, 0.05, W * 0.85]} radius={0.02} position-y={0.545}>
        <meshStandardMaterial color="#d6d3d1" />
      </RoundedBox>
      {/* headlights + destination sign */}
      {[-0.12, 0.12].map((z) => (
        <mesh key={z} position={[L / 2 + 0.005, 0.22, z]}>
          <sphereGeometry args={[0.025, 12, 12]} />
          <meshBasicMaterial color="#fffbe6" toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[L / 2 + 0.006, 0.5, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[0.22, 0.05]} />
        <meshBasicMaterial color="#f59e0b" toneMapped={false} />
      </mesh>
      {/* pantograph (diamond) reaching the overhead wire */}
      <group position-y={0.57}>
        <Strut from={[0, 0]} to={[0.14, 0.34]} />
        <Strut from={[0.14, 0.34]} to={[0, WIRE_Y - 0.57]} />
        <Strut from={[0, 0]} to={[-0.14, 0.34]} />
        <Strut from={[-0.14, 0.34]} to={[0, WIRE_Y - 0.57]} />
        <mesh position-y={WIRE_Y - 0.57}>
          <boxGeometry args={[0.03, 0.015, 0.3]} />
          <meshStandardMaterial color="#e5e7eb" emissive="#fde68a" emissiveIntensity={1.5} />
        </mesh>
      </group>
    </group>
  );
}

function ParishHouse({ theme }) {
  const roof = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.66, 0);
    s.lineTo(0.66, 0);
    s.lineTo(0, 0.32);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.52, bevelEnabled: false });
    g.translate(0, 0, -0.26);
    return g;
  }, []);
  return (
    <group position={[0, 0, -1.25]}>
      <mesh position-y={0.3}>
        <boxGeometry args={[1.25, 0.6, 0.5]} />
        <meshStandardMaterial color="#cbbfa8" emissive="#f5f0e6" emissiveIntensity={0.02} roughness={0.9} />
        <Edges color={theme.secondary} />
      </mesh>
      <mesh position-y={0.6} geometry={roof}>
        <meshStandardMaterial color="#7f1d1d" emissive={theme.primary} emissiveIntensity={0.2} />
      </mesh>
      {/* windows — the upstairs one keeps a candle burning */}
      {[-0.42, -0.14, 0.14, 0.42].map((x, i) =>
        [0.18, 0.43].map((y) => (
          <mesh key={`${x}${y}`} position={[x, y, 0.252]}>
            <planeGeometry args={[0.12, 0.16]} />
            <meshBasicMaterial color={i === 2 && y > 0.3 ? '#fde68a' : '#5b4636'} toneMapped={false} />
          </mesh>
        )),
      )}
      {/* small Reformed church spire behind */}
      <mesh position={[0.45, 1.05, -0.05]}>
        <coneGeometry args={[0.08, 0.5, 4]} />
        <meshStandardMaterial color="#e7dcc7" emissive={theme.secondary} emissiveIntensity={0.25} />
      </mesh>
      <pointLight position={[0.14, 0.43, 0.4]} color="#fbbf24" intensity={0.5} distance={1} />
    </group>
  );
}

function HumanChain({ theme }) {
  const { figures, hands, flames } = useMemo(() => {
    const figures = [];
    const n = 17;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (0.08 + (0.84 * i) / (n - 1));
      figures.push([Math.cos(a) * 1.05, 0, -1.25 + Math.sin(a) * 0.62]);
    }
    const hands = figures.map(([x, , z]) => [x, 0.15, z]);
    const flames = figures.filter((_, i) => i % 3 === 1).map(([x, , z]) => [x + 0.03, 0.27, z + 0.03]);
    return { figures, hands, flames };
  }, []);
  return (
    <group>
      {figures.map((p, i) => (
        <Figure key={i} position={p} glow={theme.secondary} />
      ))}
      <Line points={hands} color={theme.secondary} lineWidth={2} transparent opacity={0.9} />
      <FlameField points={flames} size={0.022} />
    </group>
  );
}

function PiataMaria({ theme }) {
  const sleepers = useMemo(() => Array.from({ length: 20 }, (_, i) => -1.9 + i * 0.2), []);
  return (
    <group>
      {/* track */}
      {[-0.17, 0.17].map((z) => (
        <mesh key={z} position={[0, 0.012, z]}>
          <boxGeometry args={[4, 0.02, 0.025]} />
          <meshStandardMaterial color="#e5e7eb" metalness={0.9} roughness={0.2} emissive="#9ca3af" emissiveIntensity={0.3} />
        </mesh>
      ))}
      {sleepers.map((x) => (
        <mesh key={x} position={[x, 0.004, 0]}>
          <boxGeometry args={[0.06, 0.008, 0.5]} />
          <meshStandardMaterial color="#3f3f46" />
        </mesh>
      ))}
      {/* overhead line */}
      <mesh position={[0, WIRE_Y, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.006, 0.006, 4, 6]} />
        <meshBasicMaterial color="#d6d3d1" />
      </mesh>
      {[-1.95, 1.95].map((x) => (
        <group key={x} position={[x, 0, -0.42]}>
          <mesh position-y={0.7}>
            <cylinderGeometry args={[0.02, 0.025, 1.4, 8]} />
            <meshStandardMaterial color="#52525b" />
          </mesh>
          <mesh position={[0, WIRE_Y + 0.05, 0.21]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.01, 0.01, 0.42, 6]} />
            <meshStandardMaterial color="#52525b" />
          </mesh>
        </group>
      ))}

      {/* the blockade: two trams stopped nose to nose */}
      <Tram x={-0.86} facing={1} theme={theme} />
      <Tram x={0.86} facing={-1} theme={theme} />
      <SparkEmitter origin={[-0.86, WIRE_Y, 0]} />
      <SparkEmitter origin={[0.86, WIRE_Y, 0]} />

      <ParishHouse theme={theme} />
      <HumanChain theme={theme} />
      <Embers />
      <pointLight position={[0, 0.7, 1.2]} color={theme.primary} intensity={4} distance={4} />
      <pointLight position={[0, WIRE_Y, 0]} color="#fde68a" intensity={1.2} distance={2} />
    </group>
  );
}

/* ═════════════════════════════ 2 · The Opera balcony ═════════════════════════════ */

/** The 1989 tricolour with the communist coat of arms cut out of the centre. */
function RevolutionFlag() {
  const ref = useRef();
  const yellow = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.045, -0.08);
    s.lineTo(0.045, -0.08);
    s.lineTo(0.045, 0.08);
    s.lineTo(-0.045, 0.08);
    s.closePath();
    const hole = new THREE.Path();
    hole.absarc(0, 0, 0.042, 0, Math.PI * 2, true);
    s.holes.push(hole);
    return new THREE.ShapeGeometry(s, 24);
  }, []);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = Math.sin(clock.elapsedTime * 2.2) * 0.35 - 0.3;
  });
  return (
    <group position={[0.42, 0.62, 0.62]}>
      <mesh position-y={0.2}>
        <cylinderGeometry args={[0.006, 0.006, 0.4, 6]} />
        <meshStandardMaterial color="#e5e7eb" />
      </mesh>
      <group ref={ref} position-y={0.32}>
        <mesh position-x={0.045}>
          <planeGeometry args={[0.09, 0.16]} />
          <meshBasicMaterial color="#1d4ed8" side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
        <mesh position-x={0.135} geometry={yellow}>
          <meshBasicMaterial color="#facc15" side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
        <mesh position-x={0.225}>
          <planeGeometry args={[0.09, 0.16]} />
          <meshBasicMaterial color="#dc2626" side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

function OperaHouse({ theme }) {
  const W = 2.3;
  const D = 0.65;
  const pediment = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.55, 0);
    s.lineTo(0.55, 0);
    s.lineTo(0, 0.24);
    s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false });
  }, []);
  const stone = { color: '#e7dcc7', emissive: theme.primary, emissiveIntensity: 0.07, roughness: 0.7 };
  const columnsX = [-0.92, -0.56, -0.2, 0.2, 0.56, 0.92];
  return (
    <group position-z={-0.75}>
      {/* rusticated ground floor with 5 arches */}
      <mesh position-y={0.25}>
        <boxGeometry args={[W, 0.5, D]} />
        <meshStandardMaterial {...stone} />
        <Edges color={theme.primary} />
      </mesh>
      {[-0.8, -0.4, 0, 0.4, 0.8].map((x) => (
        <group key={x} position={[x, 0, D / 2 + 0.004]}>
          <mesh position-y={0.17}>
            <planeGeometry args={[0.2, 0.26]} />
            <meshBasicMaterial color="#fbbf24" toneMapped={false} transparent opacity={0.85} />
          </mesh>
          <mesh position-y={0.3}>
            <circleGeometry args={[0.1, 20, 0, Math.PI]} />
            <meshBasicMaterial color="#fbbf24" toneMapped={false} transparent opacity={0.85} />
          </mesh>
        </group>
      ))}
      {/* piano nobile */}
      <mesh position={[0, 0.76, -0.04]}>
        <boxGeometry args={[W * 0.95, 0.52, D * 0.86]} />
        <meshStandardMaterial {...stone} />
        <Edges color={theme.primary} />
      </mesh>
      {columnsX.map((x) => (
        <group key={x} position={[x, 0.76, D / 2 - 0.02]}>
          {[-0.035, 0.035].map((dx) => (
            <mesh key={dx} position-x={dx}>
              <cylinderGeometry args={[0.022, 0.026, 0.5, 12]} />
              <meshStandardMaterial color="#fffaf0" emissive="#fde68a" emissiveIntensity={0.3} />
            </mesh>
          ))}
        </group>
      ))}
      {[-0.74, -0.38, 0, 0.38, 0.74].map((x) => (
        <mesh key={x} position={[x, 0.78, D / 2 - 0.035]}>
          <planeGeometry args={[0.14, 0.3]} />
          <meshBasicMaterial color={Math.abs(x) < 0.1 ? '#fff7d6' : '#f59e0b'} toneMapped={false} transparent opacity={0.9} />
        </mesh>
      ))}
      {/* THE balcony */}
      <group position={[0, 0.52, D / 2 + 0.13]}>
        <mesh>
          <boxGeometry args={[1.1, 0.04, 0.28]} />
          <meshStandardMaterial color="#fffaf0" emissive={theme.primary} emissiveIntensity={0.8} />
        </mesh>
        {Array.from({ length: 15 }, (_, i) => (
          <mesh key={i} position={[-0.52 + i * 0.074, 0.065, 0.13]}>
            <cylinderGeometry args={[0.008, 0.012, 0.09, 6]} />
            <meshStandardMaterial color="#fffaf0" />
          </mesh>
        ))}
        <mesh position={[0, 0.115, 0.13]}>
          <boxGeometry args={[1.1, 0.015, 0.025]} />
          <meshStandardMaterial color="#fffaf0" emissive="#fde68a" emissiveIntensity={0.6} />
        </mesh>
        {[-0.3, -0.15, 0, 0.15].map((x) => (
          <Figure key={x} position={[x, 0.02, 0.02]} scale={0.75} glow={theme.primary} />
        ))}
      </group>
      <RevolutionFlag />
      {/* attic, pediment, corner pavilions, dome */}
      <mesh position={[0, 1.1, -0.06]}>
        <boxGeometry args={[W * 0.9, 0.16, D * 0.8]} />
        <meshStandardMaterial {...stone} />
        <Edges color={theme.primary} />
      </mesh>
      <mesh position={[0, 1.18, D / 2 - 0.2]} geometry={pediment}>
        <meshStandardMaterial {...stone} emissiveIntensity={0.2} />
      </mesh>
      {[-1.12, 1.12].map((x) => (
        <mesh key={x} position={[x, 0.68, 0]}>
          <boxGeometry args={[0.3, 1.36, D + 0.06]} />
          <meshStandardMaterial {...stone} />
          <Edges color={theme.primary} />
        </mesh>
      ))}
      <mesh position={[0, 1.3, -0.15]} scale={[1, 0.6, 1]}>
        <sphereGeometry args={[0.3, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={theme.primary} emissive={theme.primary} emissiveIntensity={0.6} wireframe />
      </mesh>
    </group>
  );
}

function LightPillar({ position, color, tilt, phase, height = 4.6, radius = 0.38 }) {
  const ref = useRef();
  const mat = useShader(makeBeamMaterial, color, 0.75);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (!ref.current) return;
    ref.current.rotation.z = tilt[0] + Math.sin(t * 0.35 + phase) * 0.16;
    ref.current.rotation.x = tilt[1] + Math.cos(t * 0.27 + phase) * 0.1;
    mat.uniforms.uIntensity.value = 0.55 + Math.sin(t * 1.3 + phase) * 0.2;
  });
  return (
    <group ref={ref} position={position}>
      <mesh position-y={height / 2} material={mat}>
        <cylinderGeometry args={[radius, 0.03, height, 32, 1, true]} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshBasicMaterial color="#fffbe6" toneMapped={false} />
      </mesh>
    </group>
  );
}

function CandleCrowd({ theme, count = 170 }) {
  const ref = useRef();
  const people = useMemo(() => {
    const out = [];
    while (out.length < count) {
      const x = rand(-1.85, 1.85);
      const z = rand(0.05, 1.9);
      if (Math.hypot(x, z) < 1.98 && !(Math.abs(x) < 0.55 && z < 0.4)) out.push([x, 0, z]);
    }
    return out;
  }, [count]);
  const flames = useMemo(() => people.map(([x, , z]) => [x + 0.025, 0.2, z + 0.02]), [people]);
  useEffect(() => {
    const m = new THREE.Matrix4();
    const s = new THREE.Vector3();
    people.forEach((p, i) => {
      s.setScalar(rand(0.85, 1.1));
      m.compose(new THREE.Vector3(p[0], 0.09 * s.y, p[2]), new THREE.Quaternion(), s);
      ref.current.setMatrixAt(i, m);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  }, [people]);
  return (
    <group>
      <instancedMesh ref={ref} args={[undefined, undefined, people.length]}>
        <capsuleGeometry args={[0.03, 0.11, 3, 6]} />
        <meshStandardMaterial color="#1b1b26" emissive={theme.primary} emissiveIntensity={0.18} />
      </instancedMesh>
      <FlameField points={flames} size={0.018} />
    </group>
  );
}

function Opera({ theme }) {
  const pillars = useMemo(
    () => [
      { position: [-1.6, 0, 0.9], color: theme.primary, tilt: [0.35, -0.1] },
      { position: [-0.9, 0, 1.5], color: '#f5f0e6', tilt: [0.15, -0.25] },
      { position: [0.9, 0, 1.5], color: '#f5f0e6', tilt: [-0.15, -0.25] },
      { position: [1.6, 0, 0.9], color: theme.primary, tilt: [-0.35, -0.1] },
      { position: [-0.7, 0, -1.3], color: theme.secondary, tilt: [0.2, 0.15], height: 5.5, radius: 0.55 },
      { position: [0.7, 0, -1.3], color: theme.secondary, tilt: [-0.2, 0.15], height: 5.5, radius: 0.55 },
    ],
    [theme],
  );
  return (
    <group>
      <OperaHouse theme={theme} />
      <CandleCrowd theme={theme} />
      {pillars.map((p, i) => (
        <LightPillar key={i} {...p} phase={i * 1.7} />
      ))}
      <Sparkles count={120} scale={[3.6, 2.4, 3]} position={[0, 1.2, 0.4]} size={2.2} speed={0.25} color="#fde68a" />
      <pointLight position={[0, 1.1, 0.4]} color={theme.primary} intensity={7} distance={5} />
    </group>
  );
}

/* ═════════════════════════════ 3 · Mosaic pavilion ═════════════════════════════ */

const MOSAIC_PALETTE = ['#f59e0b', '#ef4444', '#38bdf8', '#a78bfa', '#34d399', '#f472b6', '#fde68a'];

function HexFloor() {
  const ref = useRef();
  const tiles = useMemo(() => {
    const s = 0.13;
    const out = [];
    for (let q = -9; q <= 9; q++) {
      for (let r = -9; r <= 9; r++) {
        const x = s * 1.5 * q;
        const z = s * Math.sqrt(3) * (r + q / 2);
        const d = Math.hypot(x, z);
        if (d > 1.85) continue;
        const sector = Math.floor(((Math.atan2(z, x) + Math.PI) / (Math.PI * 2)) * 7);
        out.push({ x, z, d, color: MOSAIC_PALETTE[(sector + Math.floor(d / 0.35)) % MOSAIC_PALETTE.length] });
      }
    }
    return out;
  }, []);
  useEffect(() => {
    const c = new THREE.Color();
    tiles.forEach((t, i) => ref.current.setColorAt(i, c.set(t.color)));
    ref.current.instanceColor.needsUpdate = true;
  }, [tiles]);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const sc = useMemo(() => new THREE.Vector3(1, 1, 1), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    tiles.forEach((tile, i) => {
      const wave = Math.sin(tile.d * 4.5 - t * 1.8) * 0.5 + 0.5;
      v.set(tile.x, 0.02 + wave * 0.07, tile.z);
      sc.set(1, 0.5 + wave * 1.6, 1);
      m.compose(v, q, sc);
      ref.current.setMatrixAt(i, m);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, tiles.length]}>
      <cylinderGeometry args={[0.118, 0.118, 0.04, 6]} />
      <meshBasicMaterial transparent opacity={0.6} toneMapped={false} />
    </instancedMesh>
  );
}

function Pavilion() {
  const N = 8;
  const R = 0.95;
  const H = 1.2;
  const arches = useMemo(() => {
    const geos = [];
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2;
      const a1 = ((i + 1) / N) * Math.PI * 2;
      const pt = (a, r, y) => new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
      // Secession "whiplash": an S-curve that bulges outward and up
      const curve = new THREE.CatmullRomCurve3([
        pt(a0, R, H),
        pt(a0 + (a1 - a0) * 0.3, R * 1.08, H + 0.22),
        pt(a0 + (a1 - a0) * 0.6, R * 0.98, H + 0.1),
        pt(a1, R, H),
      ]);
      geos.push(new THREE.TubeGeometry(curve, 40, 0.013, 6));
      // inner tendril curling toward the dome
      const tendril = new THREE.CatmullRomCurve3([pt(a0, R, H), pt(a0, R * 0.7, H + 0.3), pt(a0 + 0.2, R * 0.45, H + 0.42), pt(a0 + 0.35, R * 0.2, H + 0.5)]);
      geos.push(new THREE.TubeGeometry(tendril, 30, 0.008, 5));
    }
    return geos;
  }, []);
  useEffect(() => () => arches.forEach((g) => g.dispose()), [arches]);
  return (
    <group>
      {Array.from({ length: N }, (_, i) => {
        const a = (i / N) * Math.PI * 2;
        return (
          <group key={i} position={[Math.cos(a) * R, 0, Math.sin(a) * R]}>
            <mesh position-y={H / 2}>
              <cylinderGeometry args={[0.018, 0.026, H, 10]} />
              <meshStandardMaterial color="#fde68a" emissive="#f59e0b" emissiveIntensity={0.7} metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh position-y={H} rotation-x={Math.PI / 2}>
              <torusGeometry args={[0.04, 0.01, 8, 20]} />
              <meshStandardMaterial color="#fde68a" emissive="#f59e0b" emissiveIntensity={1.2} />
            </mesh>
          </group>
        );
      })}
      {arches.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color="#fde68a" emissive={i % 2 ? '#38bdf8' : '#f59e0b'} emissiveIntensity={1.4} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function KineticRings() {
  const rings = useRef([]);
  const heart = useRef();
  useFrame(({ clock }, dt) => {
    rings.current.forEach((r, i) => {
      if (!r) return;
      r.rotation.x += dt * (0.25 + i * 0.07) * (i % 2 ? 1 : -1);
      r.rotation.y += dt * (0.18 + i * 0.04);
    });
    if (heart.current) {
      heart.current.rotation.y += dt * 0.6;
      heart.current.position.y = 0.95 + Math.sin(clock.elapsedTime * 1.5) * 0.06;
    }
  });
  return (
    <group>
      <mesh ref={heart}>
        <icosahedronGeometry args={[0.16, 0]} />
        <meshStandardMaterial color="#fffaf0" emissive="#fde68a" emissiveIntensity={1.2} flatShading toneMapped={false} />
      </mesh>
      <group position-y={1.75}>
        {MOSAIC_PALETTE.slice(0, 6).map((c, i) => (
          <mesh key={c} ref={(el) => (rings.current[i] = el)} rotation={[i * 0.5, i * 0.9, 0]}>
            <torusGeometry args={[0.18 + i * 0.07, 0.008 + (i % 3) * 0.004, 10, 96]} />
            <meshStandardMaterial color={c} emissive={c} emissiveIntensity={1.6} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** 21 lights for Timișoara's 21 communities, orbiting the pavilion. */
function CommunityLights() {
  const refs = useRef([]);
  const lights = useMemo(
    () =>
      Array.from({ length: 21 }, (_, i) => ({
        r: rand(1.25, 1.75),
        y: rand(0.35, 1.5),
        speed: rand(0.12, 0.3) * (i % 2 ? 1 : -1),
        phase: (i / 21) * Math.PI * 2,
        color: MOSAIC_PALETTE[i % MOSAIC_PALETTE.length],
      })),
    [],
  );
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    lights.forEach((l, i) => {
      const o = refs.current[i];
      if (!o) return;
      const a = l.phase + t * l.speed;
      o.position.set(Math.cos(a) * l.r, l.y + Math.sin(t + i) * 0.05, Math.sin(a) * l.r);
      o.rotation.y = t + i;
    });
  });
  return lights.map((l, i) => (
    <mesh key={i} ref={(el) => (refs.current[i] = el)}>
      <octahedronGeometry args={[0.035, 0]} />
      <meshBasicMaterial color={l.color} toneMapped={false} />
    </mesh>
  ));
}

function Mosaic() {
  return (
    <group>
      <HexFloor />
      <Pavilion />
      <KineticRings />
      <CommunityLights />
      <Sparkles count={70} scale={[3, 2.2, 3]} position-y={1.1} size={2} speed={0.35} color="#fde68a" />
      <pointLight position={[0, 1.2, 0]} color="#fde68a" intensity={6} distance={4.5} />
    </group>
  );
}

/* ═════════════════════════════ switch ═════════════════════════════ */

export function Diorama({ chapterId, theme }) {
  let scene;
  if (chapterId === '1989_opera') scene = <Opera theme={theme} />;
  else if (chapterId === 'multicultural_mosaic') scene = <Mosaic />;
  else scene = <PiataMaria theme={theme} />;
  return <Materialize color={theme.primary}>{scene}</Materialize>;
}
