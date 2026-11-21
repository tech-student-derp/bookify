import { useRef, useState, useCallback, Suspense, type FC } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

// ── Color Palettes ────────────────────────────────────────────────────────────
const BOOK_PALETTES = [
  { cover: '#10b981', spine: '#059669', gold: '#fde047' }, // Bookify Emerald
  { cover: '#2563eb', spine: '#1d4ed8', gold: '#facc15' }, // Sapphire Blue
  { cover: '#f97316', spine: '#ea580c', gold: '#fef08a' }, // Warm Amber
  { cover: '#8b5cf6', spine: '#7c3aed', gold: '#fde047' }, // Amethyst Purple
  { cover: '#e11d48', spine: '#be123c', gold: '#fef08a' }, // Crimson Red
  { cover: '#06b6d4', spine: '#0891b2', gold: '#facc15' }, // Teal
  { cover: '#d97706', spine: '#b45309', gold: '#fef08a' }, // Honey Gold
  { cover: '#ec4899', spine: '#db2777', gold: '#fde047' }, // Rose Pink
];

const WOOD_FRAME = '#78461f';   // Oak outer pillars & beams
const WOOD_PLANK = '#8c5325';   // Shelf inner planks
const WOOD_DETAIL = '#5f3718';  // Shadowed accents & bookends
const PAGE_COLOR = '#faf7ed';   // Creamy paper

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

  const palette = BOOK_PALETTES[colorIndex % BOOK_PALETTES.length];

  useFrame((_state, delta) => {
    const target = active ? 0.36 : 0;
    pullRef.current += (target - pullRef.current) * Math.min(1, delta * 10);

    if (groupRef.current) {
      groupRef.current.position.set(
        position[0],
        position[1],
        position[2] + pullRef.current,
      );
    }
  });

  const handlePointerEnter = useCallback((e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setActive(true);
  }, []);

  const handlePointerLeave = useCallback(() => {
    setActive(false);
  }, []);

  const handlePointerDown = useCallback((e: { stopPropagation: () => void }) => {
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

  const palette = BOOK_PALETTES[colorIndex % BOOK_PALETTES.length];

  useFrame((_state, delta) => {
    const target = active ? 0.34 : 0;
    pullRef.current += (target - pullRef.current) * Math.min(1, delta * 10);
    if (groupRef.current) {
      groupRef.current.position.set(
        position[0],
        position[1],
        position[2] + pullRef.current,
      );
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerEnter={(e) => {
        e.stopPropagation();
        setActive(true);
      }}
      onPointerLeave={() => setActive(false)}
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

// ── Voxel Plant in Terracotta Pot (Decorative Minecraft Accent) ───────────────
const VoxelPlant: FC<{ position: [number, number, number] }> = ({ position }) => {
  return (
    <group position={position}>
      {/* Terracotta Pot */}
      <mesh position={[0, 0.11, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.32, 0.22, 0.32]} />
        <meshStandardMaterial color="#c25c34" roughness={0.85} />
      </mesh>
      {/* Pot Rim */}
      <mesh position={[0, 0.23, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.36, 0.04, 0.36]} />
        <meshStandardMaterial color="#ad4d28" roughness={0.8} />
      </mesh>
      {/* Soil */}
      <mesh position={[0, 0.24, 0]}>
        <boxGeometry args={[0.30, 0.015, 0.30]} />
        <meshStandardMaterial color="#3e2714" roughness={1.0} />
      </mesh>
      {/* Succulent Leaves */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[0.15, 0.20, 0.15]} />
        <meshStandardMaterial color="#22c55e" roughness={0.6} />
      </mesh>
      <mesh position={[0.07, 0.32, 0]} castShadow>
        <boxGeometry args={[0.11, 0.13, 0.11]} />
        <meshStandardMaterial color="#16a34a" roughness={0.6} />
      </mesh>
      <mesh position={[-0.07, 0.30, 0.04]} castShadow>
        <boxGeometry args={[0.11, 0.11, 0.11]} />
        <meshStandardMaterial color="#15803d" roughness={0.6} />
      </mesh>
      {/* Flower Bud */}
      <mesh position={[0, 0.47, 0]} castShadow>
        <boxGeometry args={[0.065, 0.065, 0.065]} />
        <meshStandardMaterial color="#f43f5e" roughness={0.5} />
      </mesh>
    </group>
  );
};

// ── Non-Overlapping Minecraft Bookshelf Frame ─────────────────────────────────
// Each beam fits cleanly against its neighbours without overlapping volumes
const BookshelfFrame: FC = () => {
  const outerW = 2.4;
  const outerH = 2.4;
  const depth = 1.0;
  const pillarW = 0.14; // Width of corner pillars
  const beamH = 0.14;   // Height of top and bottom beams

  // Inner span between outer pillars: 2.4 - 0.28 = 2.12
  const innerW = outerW - pillarW * 2;
  // Inner vertical opening between top & bottom beams: 2.4 - 0.28 = 2.12
  const innerH = outerH - beamH * 2;

  // Middle shelf divider
  const shelfThickness = 0.10;
  const shelfDepth = depth - 0.02; // Recessed by 0.01 front and back: NO coplanar face with frame!

  // Vertical dividers fit cleanly above and below middle shelf:
  // (2.12 - 0.10) / 2 = 1.01 height
  const dividerH = (innerH - shelfThickness) / 2;
  const dividerTopY = shelfThickness * 0.5 + dividerH * 0.5;
  const dividerBottomY = -shelfThickness * 0.5 - dividerH * 0.5;

  return (
    <group>
      {/* ── Solid Back Panel (Recessed safely inside back edge) ── */}
      <mesh position={[0, 0, -depth * 0.5 + 0.025]} receiveShadow>
        <boxGeometry args={[innerW - 0.01, innerH - 0.01, 0.03]} />
        <meshStandardMaterial color={WOOD_DETAIL} roughness={0.9} />
      </mesh>

      {/* ── Left Pillar ── */}
      <mesh position={[-outerW * 0.5 + pillarW * 0.5, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[pillarW, outerH, depth]} />
        <meshStandardMaterial color={WOOD_FRAME} roughness={0.7} />
      </mesh>

      {/* ── Right Pillar ── */}
      <mesh position={[outerW * 0.5 - pillarW * 0.5, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[pillarW, outerH, depth]} />
        <meshStandardMaterial color={WOOD_FRAME} roughness={0.7} />
      </mesh>

      {/* ── Top Header Beam (Fits cleanly BETWEEN pillars - NO corner fighting) ── */}
      <mesh position={[0, outerH * 0.5 - beamH * 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[innerW, beamH, depth]} />
        <meshStandardMaterial color={WOOD_FRAME} roughness={0.7} />
      </mesh>

      {/* ── Top Crown Ledge (Rests ON TOP of frame) ── */}
      <mesh position={[0, outerH * 0.5 + 0.03, 0]} castShadow receiveShadow>
        <boxGeometry args={[outerW + 0.10, 0.06, depth + 0.06]} />
        <meshStandardMaterial color={WOOD_PLANK} roughness={0.65} />
      </mesh>

      {/* ── Bottom Base Beam (Fits cleanly BETWEEN pillars - NO corner fighting) ── */}
      <mesh position={[0, -outerH * 0.5 + beamH * 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[innerW, beamH, depth]} />
        <meshStandardMaterial color={WOOD_FRAME} roughness={0.7} />
      </mesh>

      {/* ── Bottom Footer Base (Rests UNDER frame) ── */}
      <mesh position={[0, -outerH * 0.5 - 0.03, 0]} receiveShadow>
        <boxGeometry args={[outerW + 0.08, 0.06, depth + 0.06]} />
        <meshStandardMaterial color={WOOD_DETAIL} roughness={0.8} />
      </mesh>

      {/* ── Middle Horizontal Shelf (Recessed depth prevents front/back fighting) ── */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[innerW, shelfThickness, shelfDepth]} />
        <meshStandardMaterial color={WOOD_PLANK} roughness={0.75} />
      </mesh>

      {/* ── Top-Half Vertical Divider (Fits cleanly between top beam & middle shelf) ── */}
      <mesh position={[0, dividerTopY, 0]} castShadow receiveShadow>
        <boxGeometry args={[shelfThickness, dividerH, shelfDepth]} />
        <meshStandardMaterial color={WOOD_PLANK} roughness={0.75} />
      </mesh>

      {/* ── Bottom-Half Vertical Divider (Fits cleanly between middle shelf & bottom beam) ── */}
      <mesh position={[0, dividerBottomY, 0]} castShadow receiveShadow>
        <boxGeometry args={[shelfThickness, dividerH, shelfDepth]} />
        <meshStandardMaterial color={WOOD_PLANK} roughness={0.75} />
      </mesh>
    </group>
  );
};

// ── Complete Interactive Bookshelf Scene ──────────────────────────────────────
const BookshelfScene: FC = () => {
  return (
    <group rotation={[0, -0.42, 0]} position={[0, 0, 0]}>
      {/* Studio Lighting */}
      <ambientLight intensity={0.75} />
      <directionalLight
        position={[5, 7, 6]}
        intensity={1.7}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={1.0}
        shadow-camera-far={20}
        shadow-camera-left={-3.5}
        shadow-camera-right={3.5}
        shadow-camera-top={3.5}
        shadow-camera-bottom={-3.5}
        shadow-bias={-0.0002}
      />
      <pointLight position={[-3, 2, 4]} intensity={0.6} color="#fed7aa" />
      <directionalLight position={[-4, 3, -4]} intensity={0.4} color="#bfdbfe" />

      {/* Bookshelf Frame without any overlapping surfaces */}
      <BookshelfFrame />

      {/* ═══════════════════════════════════════════════════════════════════════
          CUBBY 1: Top-Left (Middle Shelf floor is at Y = +0.05)
          Every book base sits at Y = +0.05. Clean spacing between all books.
         ═══════════════════════════════════════════════════════════════════════ */}
      <UprightBook
        position={[-0.92, 0.48, 0.08]}
        thickness={0.20}
        height={0.86}
        depth={0.68}
        colorIndex={0}
        hasRibbon
      />
      <UprightBook
        position={[-0.72, 0.45, 0.06]}
        thickness={0.16}
        height={0.80}
        depth={0.65}
        colorIndex={1}
      />
      <UprightBook
        position={[-0.53, 0.49, 0.08]}
        thickness={0.18}
        height={0.88}
        depth={0.70}
        colorIndex={2}
      />
      <UprightBook
        position={[-0.35, 0.44, 0.06]}
        thickness={0.15}
        height={0.78}
        depth={0.64}
        colorIndex={3}
      />
      <UprightBook
        position={[-0.17, 0.44, 0.08]}
        rotation={[0, 0, -0.22]}
        thickness={0.15}
        height={0.80}
        depth={0.66}
        colorIndex={4}
      />

      {/* ═══════════════════════════════════════════════════════════════════════
          CUBBY 2: Top-Right (Middle Shelf floor is at Y = +0.05)
          Stacked books have small vertical separation (0.003) - zero face fighting.
         ═══════════════════════════════════════════════════════════════════════ */}
      {/* Bottom Stack Book */}
      <StackedBook
        position={[0.34, 0.12, 0.08]}
        width={0.58}
        thickness={0.14}
        depth={0.65}
        colorIndex={0}
      />
      {/* Middle Stack Book */}
      <StackedBook
        position={[0.34, 0.258, 0.08]}
        width={0.54}
        thickness={0.13}
        depth={0.62}
        colorIndex={2}
      />
      {/* Top Stack Book */}
      <StackedBook
        position={[0.35, 0.386, 0.08]}
        width={0.50}
        thickness={0.12}
        depth={0.58}
        colorIndex={1}
      />

      {/* Voxel Succulent Plant in Terracotta Pot */}
      <VoxelPlant position={[0.78, 0.05, 0.08]} />

      {/* ═══════════════════════════════════════════════════════════════════════
          CUBBY 3: Bottom-Left (Bottom Base floor is at Y = -1.06)
          Every book base sits at Y = -1.06. Strict non-overlapping X spans.
         ═══════════════════════════════════════════════════════════════════════ */}
      <UprightBook
        position={[-0.92, -0.62, 0.09]}
        thickness={0.20}
        height={0.88}
        depth={0.70}
        colorIndex={5}
      />
      <UprightBook
        position={[-0.73, -0.65, 0.07]}
        thickness={0.16}
        height={0.82}
        depth={0.66}
        colorIndex={6}
        hasRibbon
      />
      <UprightBook
        position={[-0.56, -0.68, 0.05]}
        thickness={0.15}
        height={0.76}
        depth={0.64}
        colorIndex={7}
      />
      <UprightBook
        position={[-0.38, -0.61, 0.09]}
        thickness={0.18}
        height={0.90}
        depth={0.72}
        colorIndex={0}
      />
      <UprightBook
        position={[-0.20, -0.64, 0.07]}
        thickness={0.15}
        height={0.84}
        depth={0.66}
        colorIndex={1}
      />

      {/* ═══════════════════════════════════════════════════════════════════════
          CUBBY 4: Bottom-Right (Bottom Base floor is at Y = -1.06)
          Bookend + leaning volume + tall tomes.
         ═══════════════════════════════════════════════════════════════════════ */}
      {/* Voxel Wooden Bookend */}
      <mesh position={[0.18, -0.87, 0.08]} castShadow>
        <boxGeometry args={[0.08, 0.38, 0.55]} />
        <meshStandardMaterial color={WOOD_DETAIL} roughness={0.7} />
      </mesh>
      {/* Leaning Book 1 */}
      <UprightBook
        position={[0.33, -0.66, 0.06]}
        rotation={[0, 0, 0.16]}
        thickness={0.15}
        height={0.80}
        depth={0.66}
        colorIndex={3}
      />
      {/* Upright Book 2 */}
      <UprightBook
        position={[0.52, -0.63, 0.08]}
        thickness={0.17}
        height={0.86}
        depth={0.70}
        colorIndex={4}
        hasRibbon
      />
      {/* Upright Book 3 */}
      <UprightBook
        position={[0.70, -0.66, 0.06]}
        thickness={0.16}
        height={0.80}
        depth={0.65}
        colorIndex={2}
      />
      {/* Upright Book 4 */}
      <UprightBook
        position={[0.89, -0.62, 0.09]}
        thickness={0.18}
        height={0.88}
        depth={0.72}
        colorIndex={5}
      />

      {/* ── Soft Ground Contact Shadow ── */}
      <ContactShadows
        position={[0, -1.26, 0]}
        opacity={0.45}
        scale={4.8}
        blur={2.4}
        far={3.0}
      />
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
      background: 'linear-gradient(135deg, var(--bg-secondary), var(--surface))',
      border: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      color: 'var(--text-muted)',
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
          // Tight near/far ratio and logarithmic depth buffer eliminate precision-based z-fighting
          camera={{ position: [3.8, 2.5, 4.4], fov: 36, near: 0.5, far: 25 }}
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
