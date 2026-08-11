"use client";

import { useEffect, useState } from "react";

type Phase = "lock" | "unlock" | "reveal";

type Props = {
  active: boolean;
};

/**
 * Elegant decrypt reveal overlay (~1.2–1.5s visual language).
 * Parent keeps `active` true until decrypt + min duration complete.
 *
 * Visual beats:
 *  0–280ms   lock — cold cyan radial, sealed glyph
 *  280–720ms unlock — expanding ring, soft cyan bloom
 *  720ms+    reveal — warm amber shift, "Private stats revealed"
 */
export function DecryptReveal({ active }: Props) {
  const [phase, setPhase] = useState<Phase>("lock");

  useEffect(() => {
    if (!active) {
      setPhase("lock");
      return;
    }

    setPhase("lock");

    // Soft double haptic on mobile
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([18, 40, 28]);
      }
    } catch {
      /* ignore */
    }

    const t1 = window.setTimeout(() => setPhase("unlock"), 280);
    const t2 = window.setTimeout(() => setPhase("reveal"), 720);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [active]);

  if (!active) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center"
      aria-hidden
    >
      {/* Soft radial veil — cold blue → warm amber */}
      <div
        className="absolute inset-0 transition-all duration-500"
        style={{
          background:
            phase === "reveal"
              ? "radial-gradient(ellipse 55% 45% at 50% 48%, rgba(251, 191, 36, 0.22) 0%, rgba(5, 12, 24, 0.38) 55%, rgba(5, 12, 24, 0.62) 100%)"
              : "radial-gradient(ellipse 55% 45% at 50% 48%, rgba(34, 211, 238, 0.18) 0%, rgba(5, 12, 24, 0.52) 55%, rgba(5, 12, 24, 0.72) 100%)",
        }}
      />

      {/* Expanding ring */}
      <div
        className={`absolute h-40 w-40 rounded-full border transition-all duration-700 ease-out ${
          phase === "lock"
            ? "scale-75 border-cyan-300/40 opacity-70"
            : phase === "unlock"
              ? "scale-125 border-cyan-200/30 opacity-50"
              : "scale-[2.1] border-amber-300/25 opacity-0"
        }`}
        style={{
          boxShadow:
            phase === "unlock"
              ? "0 0 60px 12px rgba(34, 211, 238, 0.25)"
              : phase === "reveal"
                ? "0 0 80px 20px rgba(251, 191, 36, 0.2)"
                : "0 0 30px 4px rgba(34, 211, 238, 0.15)",
        }}
      />

      {/* Core glyph */}
      <div className="relative flex flex-col items-center gap-3">
        <div
          className={`relative flex h-16 w-16 items-center justify-center rounded-full transition-all duration-500 ${
            phase === "lock"
              ? "scale-100 bg-cyan-500/15 ring-1 ring-cyan-300/50"
              : phase === "unlock"
                ? "scale-110 bg-cyan-400/25 ring-1 ring-cyan-200/60"
                : "scale-95 bg-amber-400/20 ring-1 ring-amber-300/50"
          }`}
        >
          <span
            className={`absolute text-3xl transition-all duration-400 ${
              phase === "reveal" ? "scale-150 opacity-0 blur-sm" : "scale-100 opacity-100"
            }`}
          >
            {phase === "unlock" ? "🔓" : "🔒"}
          </span>
          <span
            className={`absolute text-3xl transition-all duration-500 ${
              phase === "reveal" ? "scale-100 opacity-100" : "scale-50 opacity-0"
            }`}
          >
            ✦
          </span>
        </div>

        <div className="text-center">
          <p
            className={`text-sm font-medium tracking-wide transition-colors duration-400 ${
              phase === "reveal" ? "text-amber-100" : "text-cyan-50"
            }`}
          >
            {phase === "lock" && "Unlocking private state…"}
            {phase === "unlock" && "Inco attested decrypt"}
            {phase === "reveal" && "Private stats revealed"}
          </p>
          <p className="mt-1 text-[11px] text-sky-300/55">
            {phase === "reveal"
              ? "Only you can see these numbers"
              : "Sealed on-chain · opening for you"}
          </p>
        </div>
      </div>
    </div>
  );
}
