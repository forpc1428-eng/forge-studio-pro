import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, MeshWobbleMaterial, OrbitControls, RoundedBox, Stars, Environment, Lightformer, ContactShadows, PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';


function Mat({ n, color }) {
  const c = color || n.color;
  const common = { color: c, wireframe: n.wireframe };
  switch (n.material) {
    case 'standard': return <meshStandardMaterial {...common} metalness={n.metalness} roughness={n.roughness} />;
    case 'glass': return <meshPhysicalMaterial {...common} transparent opacity={0.82} roughness={0.04} metalness={0.15} clearcoat={1} clearcoatRoughness={0.02} iridescence={1} iridescenceIOR={1.4} envMapIntensity={2.2} ior={1.5} specularIntensity={1} />;
    case 'chrome': return <meshStandardMaterial {...common} metalness={1} roughness={0.08} />;
    case 'matte': return <meshStandardMaterial {...common} metalness={0} roughness={0.9} />;
    case 'distort': return <MeshDistortMaterial {...common} distort={n.distort} speed={n.speed} metalness={n.metalness} roughness={n.roughness} />;
    case 'wobble': return <MeshWobbleMaterial {...common} factor={n.distort} speed={n.speed} metalness={n.metalness} roughness={n.roughness} />;
    case 'neon': return <meshStandardMaterial {...common} emissive={c} emissiveIntensity={2.4} toneMapped={false} />;
    case 'holo': return <meshNormalMaterial wireframe={n.wireframe} />;
    case 'toon': return <meshToonMaterial {...common} />;
    default: return <meshPhysicalMaterial {...common} metalness={n.metalness} roughness={n.roughness} clearcoat={1} clearcoatRoughness={0.1} transmission={n.transmission || 0} />;
  }
}

function Geo({ shape }) {
  switch (shape) {
    case 'sphere': return <sphereGeometry args={[1, 96, 96]} />;
    case 'box': return <boxGeometry args={[1.4, 1.4, 1.4, 24, 24, 24]} />;
    case 'icosahedron': return <icosahedronGeometry args={[1.1, 0]} />;
    case 'octahedron': return <octahedronGeometry args={[1.2, 0]} />;
    case 'dodecahedron': return <dodecahedronGeometry args={[1.1, 0]} />;
    case 'torus': return <torusGeometry args={[0.9, 0.32, 48, 160]} />;
    case 'capsule': return <capsuleGeometry args={[0.55, 1, 16, 48]} />;
    case 'cone': return <coneGeometry args={[0.9, 1.6, 64]} />;
    case 'cylinder': return <cylinderGeometry args={[0.8, 0.8, 1.4, 64]} />;
    case 'blob': return <icosahedronGeometry args={[1.1, 64]} />;
    case 'spiky': return <icosahedronGeometry args={[1, 1]} />;
    default: return <torusKnotGeometry args={[0.75, 0.28, 220, 32]} />;
  }
}

function Spinner({ n, children }) {
  const ref = useRef();
  useFrame((_, dt) => {
    if (ref.current && n.autoRotate) { ref.current.rotation.y += dt * 0.4 * n.speed; ref.current.rotation.x += dt * 0.15 * n.speed; }
  });
  return <group ref={ref} scale={n.scale}>{children}</group>;
}

function Particles({ n }) {
  const ref = useRef();
  const pos = useMemo(() => {
    const a = new Float32Array(3000 * 3);
    for (let i = 0; i < 3000; i++) {
      const r = 1.4 * Math.cbrt(Math.random());
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      a.set([r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph)], i * 3);
    }
    return a;
  }, []);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.1 * n.speed; });
  return (
    <points ref={ref}>
      <bufferGeometry><bufferAttribute attach="attributes-position" count={pos.length / 3} array={pos} itemSize={3} /></bufferGeometry>
      <pointsMaterial size={0.025} color={n.color} transparent opacity={0.9} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

function Cubes({ n }) {
  const items = useMemo(() => Array.from({ length: n.count || 12 }, (_, i) => ({
    p: [(Math.random() - 0.5) * 3, (Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 2], s: 0.2 + Math.random() * 0.35, r: [Math.random() * 3, Math.random() * 3, 0], c: i % 2 ? n.color2 : n.color,
  })), [n.count, n.color, n.color2]);
  return items.map((it, i) => (
    <Float key={i} speed={n.speed * (0.6 + (i % 3) * 0.3)} floatIntensity={1.4} rotationIntensity={1.2}>
      <RoundedBox args={[1, 1, 1]} radius={0.15} position={it.p} scale={it.s} rotation={it.r}><Mat n={n} color={it.c} /></RoundedBox>
    </Float>
  ));
}

function Helix({ n }) {
  const pts = useMemo(() => Array.from({ length: 40 }, (_, i) => i), []);
  return pts.map((i) => {
    const t = i / 40 * Math.PI * 4, y = (i / 40 - 0.5) * 3;
    return (
      <group key={i}>
        <mesh position={[Math.cos(t) * 0.7, y, Math.sin(t) * 0.7]} scale={0.11}><sphereGeometry args={[1, 16, 16]} /><Mat n={n} /></mesh>
        <mesh position={[Math.cos(t + Math.PI) * 0.7, y, Math.sin(t + Math.PI) * 0.7]} scale={0.11}><sphereGeometry args={[1, 16, 16]} /><Mat n={n} color={n.color2} /></mesh>
      </group>
    );
  });
}

function Wave({ n }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    const g = ref.current?.geometry;
    if (!g) return;
    const p = g.attributes.position;
    const t = clock.elapsedTime * n.speed * 0.6;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      p.setZ(i, Math.sin(x * 2 + t) * 0.2 + Math.cos(y * 2.4 + t) * 0.2);
    }
    p.needsUpdate = true;
  });
  return <mesh ref={ref} rotation={[-1.1, 0, 0]}><planeGeometry args={[4, 4, 48, 48]} /><Mat n={n} /></mesh>;
}

function Subject({ n }) {
  switch (n.shape) {
    case 'particles': return <Particles n={n} />;
    case 'stars': return <Stars radius={3} depth={20} count={2500} factor={2} saturation={0} fade speed={n.speed} />;
    case 'cubes': return <Cubes n={n} />;
    case 'helix': return <Spinner n={n}><Helix n={n} /></Spinner>;
    case 'wave': return <Wave n={n} />;
    case 'planet':
      return (
        <Spinner n={n}>
          <mesh><sphereGeometry args={[0.8, 64, 64]} /><Mat n={n} /></mesh>
          <mesh rotation={[1.2, 0.2, 0]}><torusGeometry args={[1.3, 0.06, 8, 128]} /><Mat n={n} color={n.color2} /></mesh>
        </Spinner>
      );
    case 'roundedBox':
      return <Spinner n={n}><RoundedBox args={[1.4, 1.4, 1.4]} radius={0.25} smoothness={6}><Mat n={n} /></RoundedBox></Spinner>;
    default:
      return <Spinner n={n}><mesh castShadow><Geo shape={n.shape} /><Mat n={n} /></mesh></Spinner>;
  }
}

function Env({ n }) {
  if (n.env === 'none') return null;
  const tint = { studio: '#ffffff', sunset: '#ffb37a', night: '#6d7cff', neon: n.color2 || '#ff00e5' }[n.env] || '#ffffff';
  return (
    <Environment resolution={256} frames={1}>
      <Lightformer intensity={2} position={[0, 4, -6]} scale={[10, 4, 1]} color={tint} />
      <Lightformer intensity={1.2} position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} color={tint} />
      <Lightformer intensity={1.2} position={[5, 1, -1]} rotation-y={-Math.PI / 2} scale={[20, 1, 1]} color={n.color} />
      <Lightformer form="ring" intensity={3} position={[0, 0, 6]} scale={3} color={n.color2 || '#ffffff'} />
    </Environment>
  );
}

// Render only while on screen and the tab is visible — off-screen scenes cost zero CPU/GPU.
function useVisible(ref) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let onScreen = true;
    const update = () => setVisible(onScreen && !document.hidden);
    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; update(); }, { rootMargin: '150px' });
    io.observe(el);
    document.addEventListener('visibilitychange', update);
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', update); };
  }, [ref]);
  return visible;
}

const MAX_DPR = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;

export default function ThreeScene({ n, interactive }) {
  const wrap = useRef(null);
  const visible = useVisible(wrap);
  const [dpr, setDpr] = useState(MAX_DPR);
  const inner = <Subject n={n} />;
  return (
    <div ref={wrap} style={{ width: '100%', height: '100%' }}>
    <Canvas resize={{ offsetSize: true }} dpr={dpr} frameloop={visible ? 'always' : 'never'}
      gl={{ alpha: true, antialias: dpr < 2, powerPreference: 'high-performance', stencil: false }} camera={{ position: [0, 0, 4.2], fov: 45 }}
      style={{ width: '100%', height: '100%', pointerEvents: interactive ? 'auto' : 'none', background: n.bg || 'transparent' }}>
      {/* drops resolution on slow devices, raises it again when frames are smooth */}
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(MAX_DPR)} flipflops={3} onFallback={() => setDpr(1)} />
      <ambientLight intensity={0.35 * n.light} />
      <directionalLight position={[3, 4, 5]} intensity={1.6 * n.light} />
      <pointLight position={[-4, -2, -3]} intensity={30 * n.light} color={n.color2} />
      <Env n={n} />
      {n.float && !['stars', 'cubes', 'wave'].includes(n.shape) ? <Float speed={n.speed} floatIntensity={1.2} rotationIntensity={0.6}>{inner}</Float> : inner}
      {n.shadow && <ContactShadows position={[0, -1.6, 0]} opacity={0.5} blur={2.5} far={4} />}
      {interactive && <OrbitControls enableZoom={false} enablePan={false} />}
    </Canvas>
    </div>
  );
}
