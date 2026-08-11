"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, SoftShadows, Stars } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  CRYSTALS,
  MAP_H,
  MAP_W,
  buildBlocked,
  isBlocked,
  worldTrees,
} from "@/game/world3d";

type Props = {
  collectedMask: number;
  onCollect: (id: number) => void;
};

const SPAWN = new THREE.Vector3(12.5, 0, 9.5);
const SPEED = 5.2;

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[MAP_W / 2, 0, MAP_H / 2]} receiveShadow>
      <planeGeometry args={[MAP_W, MAP_H]} />
      <meshStandardMaterial color="#0c2240" roughness={0.92} metalness={0.05} />
    </mesh>
  );
}

function GridFog() {
  // subtle tile lines
  return (
    <gridHelper
      args={[Math.max(MAP_W, MAP_H), Math.max(MAP_W, MAP_H), "#1a3a60", "#122a48"]}
      position={[MAP_W / 2, 0.02, MAP_H / 2]}
    />
  );
}

function Tree({ x, z, h, r }: { x: number; z: number; h: number; r: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h * 0.25, 0]} castShadow>
        <cylinderGeometry args={[r * 0.22, r * 0.28, h * 0.5, 6]} />
        <meshStandardMaterial color="#1a1520" roughness={0.9} />
      </mesh>
      <mesh position={[0, h * 0.55, 0]} castShadow>
        <coneGeometry args={[r * 1.1, h * 0.7, 7]} />
        <meshStandardMaterial color="#163a5c" roughness={0.85} />
      </mesh>
      <mesh position={[0, h * 0.85, 0]} castShadow>
        <coneGeometry args={[r * 0.75, h * 0.45, 7]} />
        <meshStandardMaterial color="#1f4d78" roughness={0.8} emissive="#0a2040" emissiveIntensity={0.15} />
      </mesh>
    </group>
  );
}

function Crystal({
  id,
  x,
  z,
  taken,
  onNear,
}: {
  id: number;
  x: number;
  z: number;
  taken: boolean;
  onNear: (id: number) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const playerRef = useRef<THREE.Vector3 | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { x: number; z: number };
      playerRef.current = new THREE.Vector3(detail.x, 0, detail.z);
    };
    window.addEventListener("grove-player", handler);
    return () => window.removeEventListener("grove-player", handler);
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current || taken) return;
    ref.current.position.y = 0.55 + Math.sin(clock.elapsedTime * 2 + id) * 0.12;
    ref.current.rotation.y = clock.elapsedTime * 0.9 + id;
    if (playerRef.current) {
      const d = playerRef.current.distanceTo(new THREE.Vector3(x + 0.5, 0, z + 0.5));
      if (d < 0.85) onNear(id);
    }
  });

  if (taken) return null;

  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.4}>
      <group ref={ref} position={[x + 0.5, 0.55, z + 0.5]}>
        <mesh castShadow>
          <octahedronGeometry args={[0.32, 0]} />
          <meshStandardMaterial
            color="#9ad8ff"
            emissive="#3db8ff"
            emissiveIntensity={1.4}
            roughness={0.15}
            metalness={0.35}
            transparent
            opacity={0.95}
          />
        </mesh>
        <mesh scale={1.35}>
          <octahedronGeometry args={[0.32, 0]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={0.12} />
        </mesh>
        <pointLight color="#7dd3fc" intensity={1.8} distance={4} decay={2} />
      </group>
    </Float>
  );
}

function PlayerController({
  blocked,
}: {
  blocked: boolean[][];
}) {
  const body = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const target = useRef<THREE.Vector3 | null>(null);
  const pos = useRef(SPAWN.clone());

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useFrame((_, dt) => {
    if (!body.current) return;
    const p = pos.current;
    let dx = 0;
    let dz = 0;
    if (keys.current.KeyW || keys.current.ArrowUp) dz -= 1;
    if (keys.current.KeyS || keys.current.ArrowDown) dz += 1;
    if (keys.current.KeyA || keys.current.ArrowLeft) dx -= 1;
    if (keys.current.KeyD || keys.current.ArrowRight) dx += 1;

    if (dx !== 0 || dz !== 0) {
      target.current = null;
      const len = Math.hypot(dx, dz) || 1;
      dx = (dx / len) * SPEED * dt;
      dz = (dz / len) * SPEED * dt;
    } else if (target.current) {
      const t = target.current;
      const vx = t.x - p.x;
      const vz = t.z - p.z;
      const dist = Math.hypot(vx, vz);
      if (dist < 0.12) {
        target.current = null;
      } else {
        dx = (vx / dist) * SPEED * dt;
        dz = (vz / dist) * SPEED * dt;
      }
    }

    const nx = p.x + dx;
    const nz = p.z + dz;
    if (!isBlocked(blocked, nx, p.z)) p.x = nx;
    if (!isBlocked(blocked, p.x, nz)) p.z = nz;

    p.x = THREE.MathUtils.clamp(p.x, 0.4, MAP_W - 0.4);
    p.z = THREE.MathUtils.clamp(p.z, 0.4, MAP_H - 0.4);

    body.current.position.set(p.x, 0, p.z);
    if (dx !== 0 || dz !== 0) {
      body.current.rotation.y = Math.atan2(dx, dz);
    }

    // chase camera
    const camTarget = new THREE.Vector3(p.x, 0.6, p.z);
    const camPos = new THREE.Vector3(p.x - 0.2, 7.2, p.z + 7.5);
    camera.position.lerp(camPos, 0.08);
    camera.lookAt(camTarget);

    window.dispatchEvent(
      new CustomEvent("grove-player", { detail: { x: p.x, z: p.z } })
    );
  });

  // click-to-move via raycast on ground
  const { gl, camera: cam } = useThree();
  useEffect(() => {
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const hit = new THREE.Vector3();

    const onClick = (e: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, cam);
      if (raycaster.ray.intersectPlane(plane, hit)) {
        target.current = hit.clone();
      }
    };
    gl.domElement.addEventListener("pointerdown", onClick);
    return () => gl.domElement.removeEventListener("pointerdown", onClick);
  }, [gl, cam]);

  return (
    <group ref={body} position={[SPAWN.x, 0, SPAWN.z]}>
      {/* body */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <capsuleGeometry args={[0.22, 0.45, 6, 12]} />
        <meshStandardMaterial color="#dbeafe" roughness={0.45} metalness={0.1} />
      </mesh>
      {/* head */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#eff6ff" roughness={0.4} />
      </mesh>
      {/* accent core — “private glow” */}
      <mesh position={[0, 0.55, 0.12]}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial
          color="#67e8f9"
          emissive="#22d3ee"
          emissiveIntensity={2}
        />
      </mesh>
      <pointLight color="#67e8f9" intensity={0.6} distance={3} position={[0, 0.8, 0]} />
    </group>
  );
}

function SceneInner({ collectedMask, onCollect }: Props) {
  const blocked = useMemo(() => buildBlocked(), []);
  const trees = useMemo(() => worldTrees(blocked), [blocked]);
  const [taken, setTaken] = useState<Set<number>>(() => new Set());
  const collecting = useRef<Set<number>>(new Set());

  useEffect(() => {
    const s = new Set<number>();
    for (let i = 0; i < 12; i++) if (collectedMask & (1 << i)) s.add(i);
    setTaken(s);
  }, [collectedMask]);

  const handleNear = (id: number) => {
    if (taken.has(id) || collecting.current.has(id)) return;
    collecting.current.add(id);
    setTaken((prev) => new Set(prev).add(id));
    onCollect(id);
  };

  return (
    <>
      <color attach="background" args={["#060e1c"]} />
      <fog attach="fog" args={["#060e1c", 12, 32]} />
      <ambientLight intensity={0.35} color="#8fb4e8" />
      <directionalLight
        castShadow
        position={[8, 14, 6]}
        intensity={1.35}
        color="#c7e0ff"
        shadow-mapSize={[1024, 1024]}
      />
      <hemisphereLight args={["#4a7ab0", "#0a1628", 0.55]} />
      <Stars radius={80} depth={40} count={1200} factor={3} fade speed={0.4} />

      <Ground />
      <GridFog />

      {trees.map((t, i) => (
        <Tree key={i} {...t} />
      ))}

      {CRYSTALS.map((c) => (
        <Crystal
          key={c.id}
          id={c.id}
          x={c.x}
          z={c.z}
          taken={taken.has(c.id)}
          onNear={handleNear}
        />
      ))}

      <PlayerController blocked={blocked} />
      <SoftShadows size={12} samples={8} focus={0.4} />
    </>
  );
}

export default function GroveWorld({ collectedMask, onCollect }: Props) {
  return (
    <div className="h-full w-full bg-[#060e1c]">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [12, 8, 18], fov: 45, near: 0.1, far: 80 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <SceneInner collectedMask={collectedMask} onCollect={onCollect} />
      </Canvas>
    </div>
  );
}
