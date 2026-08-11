"use client";

import dynamic from "next/dynamic";

const GroveWorld = dynamic(() => import("@/components/world/GroveWorld"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#060e1c] text-sm text-sky-200/70">
      Loading 3D grove…
    </div>
  ),
});

type Props = {
  onCollect: (crystalId: number) => void;
  collectedMask: number;
};

/** 3D game surface — Inco collect logic stays in parent hook. */
export default function GameCanvas({ onCollect, collectedMask }: Props) {
  return (
    <GroveWorld
      collectedMask={collectedMask}
      onCollect={onCollect}
    />
  );
}
