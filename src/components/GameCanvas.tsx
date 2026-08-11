"use client";

import { useEffect, useRef } from "react";
import type { GroveEvents } from "@/game/GroveScene";

type Props = {
  onCollect: GroveEvents["onCollect"];
  collectedMask: number;
  onSceneReady?: (api: { setCollectedMask: (m: number) => void }) => void;
};

export default function GameCanvas({
  onCollect,
  collectedMask,
  onSceneReady,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneApi = useRef<{ setCollectedMask: (m: number) => void } | null>(
    null
  );
  const collectRef = useRef(onCollect);
  collectRef.current = onCollect;

  useEffect(() => {
    if (!ref.current || gameRef.current) return;
    let destroyed = false;

    (async () => {
      const Phaser = (await import("phaser")).default;
      const { GroveScene } = await import("@/game/GroveScene");
      if (destroyed || !ref.current) return;

      const scene = new GroveScene({
        onCollect: (id, x, y) => collectRef.current(id, x, y),
        onReady: () => {
          scene.setCollectedMask(collectedMask);
        },
      });

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: ref.current,
        width: ref.current.clientWidth || 900,
        height: ref.current.clientHeight || 560,
        backgroundColor: "#0a1018",
        physics: { default: "arcade", arcade: { debug: false } },
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [scene],
        render: { pixelArt: true, antialias: false },
      });
      gameRef.current = game;
      sceneApi.current = {
        setCollectedMask: (m) => scene.setCollectedMask(m),
      };
      onSceneReady?.(sceneApi.current);
    })();

    return () => {
      destroyed = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    sceneApi.current?.setCollectedMask(collectedMask);
  }, [collectedMask]);

  return <div ref={ref} className="h-full w-full min-h-[420px] rounded-xl overflow-hidden border border-grove-border" />;
}
