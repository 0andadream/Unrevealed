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
  const [floats, setFloats] = useState<{ id: number; text: string }[]>([]);

  const collectedCount = (() => {
    let n = 0;
    for (let i = 0; i < CRYSTAL_COUNT; i++) if (grove.mask & (1 << i)) n++;
    return n;
  })();

  const onCollect = useCallback(
    async (crystalId: number) => {
      const id = Date.now();
      setFloats((f) => [...f, { id, text: "+5 Dust · +10 XP · private update" }]);
      window.setTimeout(() => {
        setFloats((f) => f.filter((x) => x.id !== id));
      }, 1200);

      grove.applyOptimisticCollect();

      if (!grove.ready) {
        grove.setError("Connect wallet once to seal loot with Inco (session key after that)");
        return;
      }
      try {
        await grove.collect(crystalId);
        if (grove.stats) await grove.decryptAll();
      } catch {
        /* hook sets error */
      }
    },
    [grove]
  );

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#060e1c]">
      <header className="relative z-20 flex items-center justify-between border-b border-sky-500/15 bg-[#060e1c]/90 px-4 py-3 backdrop-blur">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-sky-50">
            Inco Grove
          </h1>
          <p className="text-xs text-sky-300/60">
            3D collect-a-thon · encrypted inventory & stats on Inco Lightning
          </p>
        </div>
        <div className="text-right text-[11px] text-sky-300/70">
          <a
            className="underline hover:text-cyan-300"
            href={`https://sepolia.basescan.org/address/${GROVE_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
          >
            IncoGrove {GROVE_ADDRESS.slice(0, 6)}…{GROVE_ADDRESS.slice(-4)}
          </a>
          <div className="mt-0.5 text-sky-500/50">Base Sepolia</div>
        </div>
      </header>

      {grove.error && (
        <div className="z-20 border-b border-red-500/30 bg-red-950/50 px-4 py-2 text-center text-xs text-red-100">
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
          collectedCount={collectedCount}
          crystalTotal={CRYSTAL_COUNT}
        />

        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
          {floats.map((f) => (
            <div
              key={f.id}
              className="absolute left-1/2 top-[30%] -translate-x-1/2 rounded-full bg-cyan-500/15 px-4 py-1.5 text-sm text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.25)]"
            >
              {f.text}
            </div>
          ))}
        </div>
      </div>

      <footer className="z-20 border-t border-sky-500/15 px-4 py-2 text-center text-[11px] text-sky-300/50">
        WASD / arrows · click ground to move · walk into crystals ·{" "}
        <span className="text-cyan-300/70">Inco euint stats</span> · session key collects
      </footer>
    </div>
  );
}
