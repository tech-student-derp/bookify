import { useRef, useState, useCallback, Suspense, type FC } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

// ── Color Palettes ────────────────────────────────────────────────────────────
const BOOK_PALETTES = [
  { cover: '#2e7770', spine: '#205c56', gold: '#d7b979' },
  { cover: '#397f91', spine: '#285e70', gold: '#ead7a7' },
  { cover: '#bd7556', spine: '#92533b', gold: '#ecd6a2' },
  { cover: '#6e8f68', spine: '#4f7150', gold: '#e5cf9b' },
  { cover: '#3b5f4b', spine: '#294635', gold: '#d9c28d' },
  { cover: '#789b92', spine: '#53776f', gold: '#ead6a2' },
  { cover: '#bd9b5b', spine: '#957442', gold: '#f0dfa9' },
  { cover: '#657aa0', spine: '#465a7d', gold: '#e1d09f' },
];

const WOOD_PLANK = '#fffdf7';
const WOOD_DETAIL = '#d8d0bf';
const PAGE_COLOR = '#fffdf5';

// ── Single Upright Voxel Book ─────────────────────────────────────────────────
interface UprightBookProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  thickness: number; // Width along X
  height: number;    // Height along Y
  depth: number;     // Depth into shelf along Z
  colorIndex: number;
  hasRibbon?: boolean;
}

const UprightBook: FC<UprightBookProps> = ({
  position,
  rotation = [0, 0, 0],
  thickness,
  height,
  depth,
  colorIndex,
  hasRibbon = false,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [active, setActive] = useState(false);
  const pullRef = useRef(0);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const palette = BOOK_PALETTES[colorIndex % BOOK_PALETTES.length];

  useFrame((state, delta) => {
    const target = active ? 0.36 : 0;
    if (reducedMotion) pullRef.current = target;
    else pullRef.current += (target - pullRef.current) * Math.min(1, delta * 10);

    if (groupRef.current) {
      groupRef.current.position.set(
        position[0],
        position[1],
        position[2] + pullRef.current,
      );
    }
    if (!reducedMotion && Math.abs(target - pullRef.current) > 0.001) state.invalidate();
  });

  const handlePointerEnter = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.pointerType === 'touch') return;
    setActive(true);
  }, []);

  const handlePointerLeave = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (e.pointerType === 'touch') return;
    setActive(false);
  }, []);

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setActive((prev) => !prev);
  }, []);

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
    >
      {/* ── Main Hardcover Body ── */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[thickness, height, depth]} />
        <meshStandardMaterial
          color={active ? palette.spine : palette.cover}
          roughness={0.4}
          metalness={0.08}
        />
      </mesh>

      {/* ── Paper Pages (Top Face Inset Strip - NO coplanar overlap) ── */}
      <mesh position={[0, height * 0.5 + 0.002, -0.015]} receiveShadow>
        <boxGeometry args={[thickness - 0.024, 0.004, depth - 0.035]} />
        <meshStandardMaterial color={PAGE_COLOR} roughness={0.9} />
      </mesh>

      {/* ── Spine Rib 1 (Top Gold Embossed Band - Placed Proud of Face) ── */}
      <mesh position={[0, height * 0.28, depth * 0.5 + 0.004]}>
        <boxGeometry args={[thickness * 0.88, 0.03, 0.006]} />
        <meshStandardMaterial
          color={palette.gold}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>

      {/* ── Spine Title Plaque (Center Badge - Placed Proud of Face) ── */}
      <mesh position={[0, 0, depth * 0.5 + 0.004]}>
        <boxGeometry args={[thickness * 0.74, height * 0.24, 0.006]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.3}
          metalness={0.1}
          opacity={0.88}
          transparent
        />
      </mesh>

      {/* ── Spine Rib 2 (Bottom Gold Embossed Band - Placed Proud of Face) ── */}
      <mesh position={[0, -height * 0.28, depth * 0.5 + 0.004]}>
        <boxGeometry args={[thickness * 0.88, 0.03, 0.006]} />
        <meshStandardMaterial
          color={palette.gold}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>

      {/* ── Bookmark Ribbon ── */}
      {hasRibbon && (
        <mesh position={[0, -height * 0.5 - 0.06, depth * 0.35]}>
          <boxGeometry args={[0.035, 0.14, 0.015]} />
          <meshStandardMaterial color="#ef4444" roughness={0.5} />
        </mesh>
      )}
    </group>
  );
};

// ── Horizontal Stacked Books ──────────────────────────────────────────────────
interface StackedBookProps {
  position: [number, number, number];
  width: number;
  thickness: number;
  depth: number;
  colorIndex: number;
}

const StackedBook: FC<StackedBookProps> = ({
  position,
  width,
  thickness,
  depth,
  colorIndex,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [active, setActive] = useState(false);
  const pullRef = useRef(0);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const palette = BOOK_PALETTES[colorIndex % BOOK_PALETTES.length];

  useFrame((state, delta) => {
    const target = active ? 0.34 : 0;
    if (reducedMotion) pullRef.current = target;
    else pullRef.current += (target - pullRef.current) * Math.min(1, delta * 10);
    if (groupRef.current) {
      groupRef.current.position.set(
        position[0],
        position[1],
        position[2] + pullRef.current,
      );
    }
    if (!reducedMotion && Math.abs(target - pullRef.current) > 0.001) state.invalidate();
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerEnter={(e) => {
        e.stopPropagation();
        if (e.pointerType === 'touch') return;
        setActive(true);
      }}
      onPointerLeave={(e) => { if (e.pointerType !== 'touch') setActive(false); }}
      onPointerDown={(e) => {
        e.stopPropagation();
        setActive((prev) => !prev);
      }}
    >
      {/* Cover */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, thickness, depth]} />
        <meshStandardMaterial
          color={active ? palette.spine : palette.cover}
          roughness={0.45}
        />
      </mesh>

      {/* Pages exposed at front (Recessed by 0.01 inside cover lip - NO Z-fighting) */}
      <mesh position={[0, 0, depth * 0.5 - 0.018]}>
        <boxGeometry args={[width - 0.04, thickness - 0.026, 0.022]} />
        <meshStandardMaterial color={PAGE_COLOR} roughness={0.9} />
      </mesh>

      {/* Gold corner bookmark band (Proud of front surface) */}
      <mesh position={[width * 0.36, 0, depth * 0.5 + 0.003]}>
        <boxGeometry args={[0.045, thickness * 0.88, 0.006]} />
        <meshStandardMaterial color={palette.gold} metalness={0.5} roughness={0.3} />
      </mesh>
    </group>
  );
};

// Floating shelves and curated book groups inspired by the reference model.
const FloatingShelf: FC<{ level: number }> = ({ level }) => (
  <group>
    <mesh position={[0, level - 0.06, 0]} castShadow receiveShadow>
      <boxGeometry args={[4.5, 0.12, 0.82]} />
      <meshStandardMaterial color={WOOD_PLANK} roughness={0.62} />
    </mesh>
    <mesh position={[-1.93, level - 0.18, -0.12]} rotation={[0, 0, 0.48]} castShadow>
      <boxGeometry args={[0.055, 0.28, 0.08]} />
      <meshStandardMaterial color={WOOD_DETAIL} roughness={0.75} />
    </mesh>
    <mesh position={[1.93, level - 0.18, -0.12]} rotation={[0, 0, -0.48]} castShadow>
      <boxGeometry args={[0.055, 0.28, 0.08]} />
      <meshStandardMaterial color={WOOD_DETAIL} roughness={0.75} />
    </mesh>
  </group>
);

const BookshelfScene: FC = () => {
  const top = 1.05;
  const middle = -0.05;
  const bottom = -1.15;
  const upright = (shelf: number, x: number, index: number, height = 0.84, angle = 0) => (
    <UprightBook
      key={`${shelf}-${x}-${index}`}
      position={[x, shelf + height / 2 + 0.01, 0.02]}
      rotation={[0, 0, angle]}
      thickness={0.17 + (index % 3) * 0.025}
      height={height}
      depth={0.58 + (index % 2) * 0.06}
      colorIndex={index}
      hasRibbon={index % 5 === 0}
    />
  );

  return (
    <group rotation={[0, -0.28, 0]}>
      <ambientLight intensity={0.95} />
      <directionalLight position={[4, 7, 5]} intensity={1.7} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-near={1} shadow-camera-far={18} shadow-camera-left={-4} shadow-camera-right={4} shadow-camera-top={4} shadow-camera-bottom={-4} />
      <pointLight position={[-3, 2, 3]} intensity={0.42} color="#e0d8b7" />
      <directionalLight position={[-4, 3, -3]} intensity={0.34} color="#b7d4ce" />

      <FloatingShelf level={top} />
      <FloatingShelf level={middle} />
      <FloatingShelf level={bottom} />

      {upright(top, -1.66, 0, 0.84, -0.05)}
      {upright(top, -1.45, 1, 0.76)}
      {upright(top, -1.25, 2, 0.92)}
      {upright(top, -1.02, 3, 0.81)}
      {upright(top, -0.81, 4, 0.88, 0.08)}
      <StackedBook position={[0.72, top + 0.08, 0.04]} width={0.9} thickness={0.14} depth={0.58} colorIndex={5} />
      <StackedBook position={[0.72, top + 0.225, 0.04]} width={0.84} thickness={0.13} depth={0.55} colorIndex={3} />
      <StackedBook position={[0.72, top + 0.36, 0.04]} width={0.78} thickness={0.12} depth={0.52} colorIndex={1} />
      {upright(top, 1.45, 6, 0.83)}
      {upright(top, 1.67, 7, 0.9)}

      {upright(middle, -1.72, 2, 0.91)}
      {upright(middle, -1.5, 5, 0.78, -0.08)}
      {upright(middle, -1.29, 0, 0.88)}
      {upright(middle, -0.58, 3, 0.9)}
      {upright(middle, -0.36, 4, 0.78)}
      <StackedBook position={[0.48, middle + 0.08, 0.04]} width={0.94} thickness={0.15} depth={0.58} colorIndex={0} />
      <StackedBook position={[0.48, middle + 0.235, 0.04]} width={0.86} thickness={0.14} depth={0.56} colorIndex={6} />
      <mesh position={[1.5, middle + 0.2, 0.04]} castShadow>
        <dodecahedronGeometry args={[0.2, 0]} />
        <meshStandardMaterial color="#bf704f" roughness={0.54} />
      </mesh>
      <mesh position={[1.88, middle + 0.17, 0.04]} castShadow>
        <icosahedronGeometry args={[0.17, 0]} />
        <meshStandardMaterial color="#d19b6a" roughness={0.58} />
      </mesh>

      {upright(bottom, -1.7, 7, 0.9)}
      {upright(bottom, -1.48, 6, 0.8)}
      {upright(bottom, -1.26, 1, 0.86, -0.08)}
      {upright(bottom, -0.52, 2, 0.92)}
      {upright(bottom, -0.3, 3, 0.82)}
      {upright(bottom, -0.08, 4, 0.9)}
      <StackedBook position={[0.86, bottom + 0.08, 0.04]} width={0.94} thickness={0.15} depth={0.62} colorIndex={1} />
      <StackedBook position={[0.86, bottom + 0.235, 0.04]} width={0.9} thickness={0.14} depth={0.58} colorIndex={5} />
      <StackedBook position={[0.86, bottom + 0.38, 0.04]} width={0.84} thickness={0.13} depth={0.55} colorIndex={0} />

      <ContactShadows position={[0, -1.34, 0]} opacity={0.28} scale={5.4} blur={2.8} far={3.5} />
    </group>
  );
};
// ── WebGL Fallback Presentation ───────────────────────────────────────────────
const BookshelfFallback: FC = () => (
  <div
    style={{
      width: '100%',
      aspectRatio: '1 / 1.05',
      maxWidth: '480px',
      borderRadius: '16px',
      background: '#183d2b',
      border: '1px solid #72996b',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      color: '#f7f4e8',
      fontSize: '0.85rem',
      textAlign: 'center',
      padding: '24px',
    }}
  >
    <p style={{ margin: 0, fontWeight: 500 }}>
      Interactive 3D Bookshelf
      <br />
      <span style={{ fontSize: '0.78rem', opacity: 0.85 }}>
        WebGL hardware acceleration recommended
      </span>
    </p>
  </div>
);

// ── Main Isometric Bookshelf Component ────────────────────────────────────────
const IsometricBookshelf: FC = () => {
  const [webglFailed, setWebglFailed] = useState(false);

  if (webglFailed) return <BookshelfFallback />;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '520px',
        aspectRatio: '1 / 1.05',
        borderRadius: '20px',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at 50% 50%, color-mix(in oklch, var(--accent) 6%, transparent) 0%, transparent 70%)',
        touchAction: 'none',
        position: 'relative',
        cursor: 'grab',
      }}
    >
      <Suspense fallback={<BookshelfFallback />}>
        <Canvas
          shadows
          frameloop="demand"
          // Tight near/far ratio and logarithmic depth buffer eliminate precision-based z-fighting
          camera={{ position: [4.9, 3.1, 6.1], fov: 38, near: 0.5, far: 25 }}
          gl={{
            antialias: true,
            alpha: true,
            logarithmicDepthBuffer: true,
          }}
          style={{ background: 'transparent' }}
          onCreated={({ gl }) => {
            if (!gl.capabilities.isWebGL2) {
              setWebglFailed(true);
            }
          }}
        >
          <BookshelfScene />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            minPolarAngle={Math.PI / 4.5}
            maxPolarAngle={Math.PI / 2.1}
            minAzimuthAngle={-Math.PI / 3.5}
            maxAzimuthAngle={Math.PI / 3.5}
            dampingFactor={0.06}
            makeDefault
          />
        </Canvas>
      </Suspense>
    </div>
  );
};

export default IsometricBookshelf;
