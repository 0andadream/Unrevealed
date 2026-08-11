"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { Hud } from "@/components/Hud";
import { useGrove } from "@/hooks/useGrove";
import { CRYSTAL_COUNT, GROVE_ADDRESS } from "@/lib/config";

const GameCanvas = dynamic(() => import("@/components/GameCanvas"), {
  ssr: false,
});

export default function GameApp() {
  const grove = useGrove();
  const [panel, setPanel] = useState<"none" | "inventory" | "character" | "quests">(
    "none"
  );
  const [floats, setFloats] = useState<
    { id: number; text: string }[]
  >([]);

  const collectedCount = (() => {
    let n = 0;
    for (let i = 0; i < CRYSTAL_COUNT; i++) if (grove.mask & (1 << i)) n++;
    return n;
  })();

  const onCollect = useCallback(
    async (crystalId: number) => {
      const id = Date.now();
      setFloats((f) => [...f, { id, text: "+5 DUST  +10 XP" }]);
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
        if (grove.stats) await grove.decryptAll();
      } catch {
        /* error in hook */
      }
    },
    [grove]
  );

  return (
    <div className="stage-root relative flex h-[100dvh] flex-col overflow-hidden bg-g-bg">
      {/* Title strip — hard pixel */}
      <header className="relative z-20 flex items-center justify-between border-b-2 border-g-bright bg-g-bg px-3 py-2">
        <div>
          <h1 className="text-[11px] tracking-[3px] text-g-cream text-shadow-pixel sm:text-[14px]">
            INCO GROVE
          </h1>
          <p className="mt-1 text-[7px] tracking-wider text-g-bright sm:text-[8px]">
            PRIVATE RPG · INCO LIGHTNING · BASE SEPOLIA
          </p>
        </div>
        <a
          className="text-[7px] text-g-bright underline hover:text-g-cream sm:text-[8px]"
          href={`https://sepolia.basescan.org/address/${GROVE_ADDRESS}`}
          target="_blank"
          rel="noreferrer"
        >
          {GROVE_ADDRESS.slice(0, 6)}…{GROVE_ADDRESS.slice(-4)}
        </a>
      </header>

      {!grove.configured && (
        <div className="z-20 bg-g-mid px-3 py-1 text-center text-[8px] text-g-cream">
          Set NEXT_PUBLIC_INCO_GROVE after deploy.
        </div>
      )}

      {grove.error && (
        <div className="z-20 border-b-2 border-red-900 bg-[#200810] px-3 py-1 text-center text-[8px] text-red-200">
          {grove.error}{" "}
          <button type="button" className="underline" onClick={() => grove.setError(null)}>
            dismiss
          </button>
        </div>
      )}

      <div className="relative min-h-0 flex-1 bg-g-bg">
        <GameCanvas
          onCollect={(id) => onCollect(id)}
          collectedMask={grove.mask}
        />

        {/* Galleria-style scanlines + vignette */}
        <div className="stage-fx" aria-hidden />

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
          collectedCount={collectedCount}
          crystalTotal={CRYSTAL_COUNT}
        />

        <div className="pointer-events-none absolute inset-0 z-15 overflow-hidden">
          {floats.map((f) => (
            <div
              key={f.id}
              className="absolute left-1/2 top-[36%] -translate-x-1/2 text-[10px] tracking-wide text-g-crystal text-shadow-pixel"
            >
              {f.text}
            </div>
          ))}
        </div>
      </div>

      <footer className="relative z-20 border-t-2 border-g-bright bg-g-bg px-3 py-1 text-center text-[7px] tracking-wider text-g-bright">
        WASD / CLICK TO MOVE · WALK INTO CRYSTALS · SESSION KEY = NO POPUPS
      </footer>
    </div>
  );
}
