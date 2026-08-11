"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { DecryptReveal } from "@/components/DecryptReveal";
import { Hud } from "@/components/Hud";
import { MobileControls } from "@/components/MobileControls";
import {
  OnboardingOverlay,
  shouldShowOnboarding,
} from "@/components/OnboardingOverlay";
import { useGrove } from "@/hooks/useGrove";
import { CRYSTAL_COUNT, GROVE_ADDRESS } from "@/lib/config";

const GameCanvas = dynamic(() => import("@/components/GameCanvas"), {
  ssr: false,
});

type FloatKind = "loot" | "inco" | "reveal";

export default function GameApp() {
  const grove = useGrove();
  const [panel, setPanel] = useState<"none" | "inventory" | "character" | "quests">(
    "none"
  );
  const [floats, setFloats] = useState<
    { id: number; text: string; kind: FloatKind }[]
  >([]);
  const [showOnboard, setShowOnboard] = useState(false);
  const [decrypted, setDecrypted] = useState(false);
  const [decryptFlash, setDecryptFlash] = useState(false);
  const [revealActive, setRevealActive] = useState(false);
  const [numberHighlight, setNumberHighlight] = useState(false);
  const [privateCollects, setPrivateCollects] = useState(0);
  const [mobileVec, setMobileVec] = useState({ x: 0, z: 0 });
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  useEffect(() => {
    setShowOnboard(shouldShowOnboarding());
  }, []);

  const collectedCount = (() => {
    let n = 0;
    for (let i = 0; i < CRYSTAL_COUNT; i++) if (grove.mask & (1 << i)) n++;
    return n;
  })();

  const pushFloat = (text: string, kind: FloatKind = "loot", ms = 1400) => {
    const id = Date.now() + Math.random();
    setFloats((f) => [...f, { id, text, kind }]);
    window.setTimeout(() => {
      setFloats((f) => f.filter((x) => x.id !== id));
    }, ms);
  };

  const showBanner = (text: string, ms = 2200) => {
    setStatusBanner(text);
    window.setTimeout(() => setStatusBanner(null), ms);
  };

  const onCollect = useCallback(
    async (crystalId: number) => {
      // Immediate juice feedback
      pushFloat("+5 Dust · +10 XP", "loot", 1100);
      setPrivateCollects((c) => c + 1);
      grove.applyOptimisticCollect();

      if (!grove.ready) {
        grove.setError("Connect wallet once to seal loot with Inco (then no popups)");
        pushFloat("Collected · connect to encrypt on Inco", "inco", 1800);
        return;
      }
      try {
        await grove.collect(crystalId);
        // Hero microcopy for the privacy moment
        pushFloat("Encrypted on Inco", "inco", 1800);
        // keep stats sealed until user decrypts — only refresh if already open
        if (decrypted) await grove.decryptAll();
      } catch {
        /* hook sets error */
      }
    },
    [grove, decrypted]
  );

  const handleDecrypt = useCallback(async () => {
    if (!grove.ready) {
      grove.setError("Connect wallet first to decrypt your private state");
      return;
    }
    // Start elegant reveal; hold until decrypt + min ~1.3s
    setRevealActive(true);
    const t0 = Date.now();

    try {
      await grove.decryptAll();
      setDecrypted(true);
      const remaining = Math.max(0, 1350 - (Date.now() - t0));
      if (remaining > 0) {
        await new Promise((r) => window.setTimeout(r, remaining));
      }
      setRevealActive(false);
      setDecryptFlash(true);
      setNumberHighlight(true);
      pushFloat("Private stats revealed", "reveal", 2000);
      showBanner("Private stats revealed · only you can see this", 2600);
      window.setTimeout(() => setDecryptFlash(false), 1400);
      window.setTimeout(() => setNumberHighlight(false), 2800);
    } catch {
      setRevealActive(false);
    }
  }, [grove]);

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#050c18]">
      <header className="relative z-20 flex items-center justify-between border-b border-sky-500/15 bg-[#050c18]/90 px-4 py-3 backdrop-blur">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-sky-50">
            Inco Grove
          </h1>
          <p className="text-xs text-sky-300/60">
            Collect in public · keep the numbers private
          </p>
        </div>
        <div className="text-right text-[11px] text-sky-300/70">
          <a
            className="underline hover:text-cyan-300"
            href={`https://sepolia.basescan.org/address/${GROVE_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
          >
            Contract {GROVE_ADDRESS.slice(0, 6)}…{GROVE_ADDRESS.slice(-4)}
          </a>
          <div className="mt-0.5 text-sky-500/50">Inco Lightning · Base Sepolia</div>
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
        <GameCanvas
          onCollect={onCollect}
          collectedMask={grove.mask}
          mobileVector={mobileVec}
        />

        <Hud
          short={grove.short}
          ready={grove.ready}
          busy={grove.busy}
          stats={grove.stats}
          decrypted={decrypted && !!grove.stats}
          decryptFlash={decryptFlash}
          numberHighlight={numberHighlight}
          privateCollects={privateCollects}
          panel={panel}
          onPanel={setPanel}
          onConnect={grove.connect}
          onDecrypt={handleDecrypt}
          log={grove.log}
          collectedCount={collectedCount}
          crystalTotal={CRYSTAL_COUNT}
        />

        <MobileControls onVector={(x, z) => setMobileVec({ x, z })} />

        {/* Floating toasts */}
        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
          {floats.map((f) => (
            <div
              key={f.id}
              className={`absolute left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-sm shadow-lg animate-[floatUp_1.4s_ease_forwards] ${
                f.kind === "reveal"
                  ? "top-[24%] bg-amber-500/20 text-amber-50 ring-1 ring-amber-300/45"
                  : f.kind === "inco"
                    ? "top-[26%] bg-cyan-500/20 text-cyan-50 ring-1 ring-cyan-300/40"
                    : "top-[32%] bg-sky-500/15 text-sky-50 ring-1 ring-sky-400/20"
              }`}
            >
              {f.text}
            </div>
          ))}
        </div>

        {/* Temporary post-decrypt banner */}
        {statusBanner && (
          <div className="pointer-events-none absolute left-1/2 top-20 z-40 -translate-x-1/2 animate-[fadeIn_0.35s_ease]">
            <div className="rounded-full bg-amber-500/15 px-5 py-2 text-xs font-medium tracking-wide text-amber-50 ring-1 ring-amber-300/40 shadow-[0_0_28px_rgba(251,191,36,0.18)]">
              {statusBanner}
            </div>
          </div>
        )}

        <DecryptReveal active={revealActive} />

        {showOnboard && (
          <OnboardingOverlay onDismiss={() => setShowOnboard(false)} />
        )}
      </div>

      <footer className="z-20 border-t border-sky-500/15 px-4 py-2 text-center text-[11px] text-sky-300/45">
        WASD · click ground · mobile joystick · crystals auto-encrypt on Inco after connect
      </footer>
    </div>
  );
}
