"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Sparkles, Stars } from "@react-three/drei";
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
  mobileVector?: { x: number; z: number };
};

const SPAWN = new THREE.Vector3(12.5, 0, 9.5);
const SPEED = 5.2;

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[MAP_W / 2, 0, MAP_H / 2]} receiveShadow>
      <planeGeometry args={[MAP_W + 4, MAP_H + 4]} />
      <meshStandardMaterial color="#0a1c38" roughness={0.95} metalness={0.08} />
    </mesh>
  );
}

function Tree({ x, z, h, r }: { x: number; z: number; h: number; r: number }) {
  const g = useRef<THREE.Group>(null);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  useFrame(({ clock }) => {
    if (!g.current) return;
    // gentle wind sway
    g.current.rotation.z = Math.sin(clock.elapsedTime * 0.7 + phase) * 0.04;
    g.current.rotation.x = Math.cos(clock.elapsedTime * 0.5 + phase) * 0.02;
  });
  return (
    <group ref={g} position={[x, 0, z]}>
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
        <meshStandardMaterial
          color="#1f4d78"
          roughness={0.8}
          emissive="#0a2040"
          emissiveIntensity={0.2}
        />
      </mesh>
    </group>
  );
}

function CollectBurst({ x, z, onDone }: { x: number; z: number; onDone: () => void }) {
  const ref = useRef<THREE.Group>(null);
  const t0 = useRef(0);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    if (!t0.current) t0.current = clock.elapsedTime;
    const t = clock.elapsedTime - t0.current;
    ref.current.scale.setScalar(1 + t * 2.2);
    const mat = (ref.current.children[0] as THREE.Mesh)
      .material as THREE.MeshBasicMaterial;
    mat.opacity = Math.max(0, 1 - t * 1.6);
    if (t > 0.7) onDone();
  });
  return (
    <group ref={ref} position={[x, 0.6, z]}>
      <mesh>
        <sphereGeometry args={[0.35, 12, 12]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.7} />
      </mesh>
      <Sparkles count={28} scale={1.8} size={3} speed={1.2} color="#a5f3fc" />
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
  const mat = useRef<THREE.MeshStandardMaterial>(null);

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
    const s = 1 + Math.sin(clock.elapsedTime * 3 + id) * 0.06;
    ref.current.scale.setScalar(s);
    ref.current.position.y = 0.55 + Math.sin(clock.elapsedTime * 2 + id) * 0.12;
    ref.current.rotation.y = clock.elapsedTime * 0.9 + id;
    if (mat.current) {
      mat.current.emissiveIntensity = 1.2 + Math.sin(clock.elapsedTime * 4 + id) * 0.5;
    }
    if (playerRef.current) {
      const d = playerRef.current.distanceTo(new THREE.Vector3(x + 0.5, 0, z + 0.5));
      if (d < 0.9) onNear(id);
    }
  });

  if (taken) return null;

  return (
    <Float speed={2} rotationIntensity={0.25} floatIntensity={0.35}>
      <group ref={ref} position={[x + 0.5, 0.55, z + 0.5]}>
        <mesh castShadow>
          <octahedronGeometry args={[0.34, 0]} />
          <meshStandardMaterial
            ref={mat}
            color="#9ad8ff"
            emissive="#22d3ee"
            emissiveIntensity={1.5}
            roughness={0.12}
            metalness={0.4}
            transparent
            opacity={0.95}
          />
        </mesh>
        <mesh scale={1.55}>
          <octahedronGeometry args={[0.34, 0]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={0.1} depthWrite={false} />
        </mesh>
        <pointLight color="#7dd3fc" intensity={2.2} distance={5} decay={2} />
        <Sparkles count={12} scale={1.2} size={2} speed={0.4} color="#e0f2fe" />
      </group>
    </Float>
  );
}

function PlayerController({
  blocked,
  mobileVector,
}: {
  blocked: boolean[][];
  mobileVector?: { x: number; z: number };
}) {
  const body = useRef<THREE.Group>(null);
  const trail = useRef<THREE.Points>(null);
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const target = useRef<THREE.Vector3 | null>(null);
  const pos = useRef(SPAWN.clone());
  const trailPos = useRef<Float32Array>(new Float32Array(48));
  const trailI = useRef(0);
  const sway = useRef(0);

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

  useFrame(({ clock }, dt) => {
    if (!body.current) return;
    const p = pos.current;
    let dx = 0;
    let dz = 0;
    if (keys.current.KeyW || keys.current.ArrowUp) dz -= 1;
    if (keys.current.KeyS || keys.current.ArrowDown) dz += 1;
    if (keys.current.KeyA || keys.current.ArrowLeft) dx -= 1;
    if (keys.current.KeyD || keys.current.ArrowRight) dx += 1;

    // mobile joystick (x = strafe, z = forward in screen space already mapped)
    if (mobileVector && (mobileVector.x !== 0 || mobileVector.z !== 0)) {
      target.current = null;
      dx = mobileVector.x;
      dz = mobileVector.z;
    }

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
      if (dist < 0.12) target.current = null;
      else {
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

    // idle bob
    const moving = Math.abs(dx) + Math.abs(dz) > 0.0001;
    const bob = moving ? Math.sin(clock.elapsedTime * 12) * 0.04 : Math.sin(clock.elapsedTime * 2) * 0.02;
    body.current.position.set(p.x, bob, p.z);
    if (moving) body.current.rotation.y = Math.atan2(dx, dz);

    // trail
    if (moving && trail.current) {
      const i = trailI.current % 16;
      trailPos.current[i * 3] = p.x;
      trailPos.current[i * 3 + 1] = 0.15;
      trailPos.current[i * 3 + 2] = p.z;
      trailI.current++;
      trail.current.geometry.attributes.position.needsUpdate = true;
    }

    // soft camera sway
    sway.current = Math.sin(clock.elapsedTime * 0.35) * 0.15;
    const camTarget = new THREE.Vector3(p.x, 0.7, p.z);
    const camPos = new THREE.Vector3(
      p.x - 0.15 + sway.current,
      7.0,
      p.z + 7.6
    );
    camera.position.lerp(camPos, 0.07);
    camera.lookAt(camTarget);

    window.dispatchEvent(
      new CustomEvent("grove-player", { detail: { x: p.x, z: p.z } })
    );
  });

  const { gl, camera: cam } = useThree();
  useEffect(() => {
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const hit = new THREE.Vector3();
    const onClick = (e: PointerEvent) => {
      // ignore UI / joystick region roughly bottom-left mobile
      const rect = gl.domElement.getBoundingClientRect();
      if (e.clientY > rect.bottom - 140 && e.clientX < rect.left + 140) return;
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, cam);
      if (raycaster.ray.intersectPlane(plane, hit)) target.current = hit.clone();
    };
    gl.domElement.addEventListener("pointerdown", onClick);
    return () => gl.domElement.removeEventListener("pointerdown", onClick);
  }, [gl, cam]);

  const trailGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(trailPos.current, 3));
    return g;
  }, []);

  return (
    <>
      <group ref={body} position={[SPAWN.x, 0, SPAWN.z]}>
        <mesh position={[0, 0.55, 0]} castShadow>
          <capsuleGeometry args={[0.22, 0.45, 6, 12]} />
          <meshStandardMaterial color="#e0f2fe" roughness={0.4} metalness={0.15} />
        </mesh>
        <mesh position={[0, 1.05, 0]} castShadow>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="#f0f9ff" roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.55, 0.14]}>
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshStandardMaterial
            color="#67e8f9"
            emissive="#22d3ee"
            emissiveIntensity={2.4}
          />
        </mesh>
        <pointLight color="#67e8f9" intensity={0.85} distance={3.5} position={[0, 0.8, 0]} />
        {/* soft ground ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <ringGeometry args={[0.25, 0.45, 24]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.25} />
        </mesh>
      </group>
      <points ref={trail} geometry={trailGeo}>
        <pointsMaterial
          color="#67e8f9"
          size={0.12}
          transparent
          opacity={0.45}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </>
  );
}

function SceneInner({
  collectedMask,
  onCollect,
  mobileVector,
}: Props) {
  const blocked = useMemo(() => buildBlocked(), []);
  const trees = useMemo(() => worldTrees(blocked), [blocked]);
  const [taken, setTaken] = useState<Set<number>>(() => new Set());
  const [bursts, setBursts] = useState<{ id: number; x: number; z: number }[]>([]);
  const collecting = useRef<Set<number>>(new Set());

  useEffect(() => {
    const s = new Set<number>();
    for (let i = 0; i < 12; i++) if (collectedMask & (1 << i)) s.add(i);
    setTaken(s);
  }, [collectedMask]);

  const handleNear = (id: number) => {
    if (taken.has(id) || collecting.current.has(id)) return;
    collecting.current.add(id);
    const c = CRYSTALS.find((x) => x.id === id);
    if (c) {
      setBursts((b) => [...b, { id: Date.now(), x: c.x + 0.5, z: c.z + 0.5 }]);
    }
    setTaken((prev) => new Set(prev).add(id));
    onCollect(id);
  };

  return (
    <>
      <color attach="background" args={["#050c18"]} />
      <fog attach="fog" args={["#050c18", 14, 34]} />
      <ambientLight intensity={0.32} color="#9ec5f0" />
      <directionalLight
        castShadow
        position={[8, 14, 6]}
        intensity={1.4}
        color="#dbeafe"
        shadow-mapSize={[1024, 1024]}
      />
      <hemisphereLight args={["#5b8fc4", "#0a1628", 0.5]} />
      <Stars radius={90} depth={50} count={1600} factor={3.2} fade speed={0.35} />
      <Sparkles
        count={80}
        scale={[MAP_W, 4, MAP_H]}
        position={[MAP_W / 2, 1.5, MAP_H / 2]}
        size={1.5}
        speed={0.25}
        opacity={0.35}
        color="#7dd3fc"
      />

      <Ground />
      <gridHelper
        args={[Math.max(MAP_W, MAP_H), Math.max(MAP_W, MAP_H), "#1a3a60", "#0f2848"]}
        position={[MAP_W / 2, 0.02, MAP_H / 2]}
      />

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

      {bursts.map((b) => (
        <CollectBurst
          key={b.id}
          x={b.x}
          z={b.z}
          onDone={() => setBursts((xs) => xs.filter((x) => x.id !== b.id))}
        />
      ))}

      <PlayerController blocked={blocked} mobileVector={mobileVector} />
    </>
  );
}

export default function GroveWorld({
  collectedMask,
  onCollect,
  mobileVector,
}: Props) {
  return (
    <div className="h-full w-full bg-[#050c18]">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [12, 8, 18], fov: 45, near: 0.1, far: 80 }}
        gl={{ antialias: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <SceneInner
          collectedMask={collectedMask}
          onCollect={onCollect}
          mobileVector={mobileVector}
        />
      </Canvas>
    </div>
  );
}
