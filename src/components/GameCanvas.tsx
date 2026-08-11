"use client";

import dynamic from "next/dynamic";

const GroveWorld = dynamic(() => import("@/components/world/GroveWorld"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#050c18] text-sky-100/80">
      <div className="h-10 w-10 animate-pulse rounded-full bg-cyan-400/30 shadow-[0_0_40px_rgba(34,211,238,0.4)]" />
      <div className="text-sm">Loading Whispering Grove…</div>
      <div className="text-xs text-sky-400/50">Private crystals · Inco Lightning</div>
    </div>
  ),
});

type Props = {
  onCollect: (crystalId: number) => void;
  collectedMask: number;
  mobileVector?: { x: number; z: number };
};

export default function GameCanvas({
  onCollect,
  collectedMask,
  mobileVector,
}: Props) {
  return (
    <GroveWorld
      collectedMask={collectedMask}
      onCollect={onCollect}
      mobileVector={mobileVector}
    />
  );
}
