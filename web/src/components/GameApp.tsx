"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { Hud } from "@/components/Hud";
import { useGrove } from "@/hooks/useGrove";
import { GROVE_ADDRESS } from "@/lib/config";

const GameCanvas = dynamic(() => import("@/components/GameCanvas"), {
  ssr: false,
});

export default function GameApp() {
  const grove = useGrove();
  const [panel, setPanel] = useState<"none" | "inventory" | "character" | "quests">(
    "none"
  );
  const [floats, setFloats] = useState<
    { id: number; x: number; y: number; text: string }[]
  >([]);

  const onCollect = useCallback(
    async (crystalId: number, worldX: number, worldY: number) => {
      // Visual first
      const id = Date.now();
      setFloats((f) => [
        ...f,
        { id, x: worldX, y: worldY, text: "+5 Dust  +10 XP" },
      ]);
      window.setTimeout(() => {
        setFloats((f) => f.filter((x) => x.id !== id));
      }, 1000);

      grove.applyOptimisticCollect();

      if (!grove.ready) {
        grove.setError("Connect wallet + grant session to save privately on-chain");
        return;
      }
      try {
        await grove.collect(crystalId);
        // refresh decrypt if already open
        if (grove.stats) await grove.decryptAll();
      } catch {
        /* error set in hook */
      }
    },
    [grove]
  );

  return (
    <div className="relative flex h-[100dvh] flex-col bg-grove-bg">
      {/* Title strip */}
      <header className="flex items-center justify-between border-b border-grove-border px-4 py-2">
        <div>
          <h1 className="font-pixel text-lg tracking-widest text-grove-glow">
            INCO GROVE
          </h1>
          <p className="text-[10px] uppercase tracking-[0.18em] text-grove-mist">
            Private progression · Inco Lightning · Base Sepolia
          </p>
        </div>
        <a
          className="text-[10px] text-grove-mist underline hover:text-grove-crystal"
          href={`https://sepolia.basescan.org/address/${GROVE_ADDRESS}`}
          target="_blank"
          rel="noreferrer"
        >
          Contract {GROVE_ADDRESS.slice(0, 8)}…
        </a>
      </header>

      {!grove.configured && (
        <div className="bg-amber-950/50 px-4 py-2 text-center text-xs text-amber-200">
          Contract not configured — set NEXT_PUBLIC_INCO_GROVE after deploy.
        </div>
      )}

      {grove.error && (
        <div className="bg-red-950/40 px-4 py-2 text-center text-xs text-red-200">
          {grove.error}{" "}
          <button type="button" className="underline" onClick={() => grove.setError(null)}>
            dismiss
          </button>
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        <GameCanvas onCollect={onCollect} collectedMask={grove.mask} />
        <Hud
          short={grove.short}
          ready={grove.ready}
          busy={grove.busy}
          stats={grove.stats}
          panel={panel}
          onPanel={setPanel}
          onConnect={grove.connect}
          onDecrypt={grove.decryptAll}
          log={grove.log}
        />

        {/* DOM float texts approx center — phaser also shows floats */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {floats.map((f) => (
            <div
              key={f.id}
              className="absolute left-1/2 top-1/3 -translate-x-1/2 animate-bounce text-sm text-grove-crystal drop-shadow"
            >
              {f.text}
            </div>
          ))}
        </div>
      </div>

      <footer className="border-t border-grove-border px-4 py-1.5 text-center text-[10px] text-grove-mist">
        WASD / arrows move · click to walk · walk into crystals · session key collects
        without wallet popups
      </footer>
    </div>
  );
}
