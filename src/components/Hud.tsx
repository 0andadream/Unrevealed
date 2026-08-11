"use client";

import type { DecryptedStats } from "@/hooks/useGrove";
import { QUEST_TARGET } from "@/lib/config";

type Props = {
  short: string | null;
  ready: boolean;
  busy: string | null;
  stats: DecryptedStats | null;
  decrypted: boolean;
  decryptFlash: boolean;
  privateCollects: number;
  panel: "none" | "inventory" | "character" | "quests";
  onPanel: (p: Props["panel"]) => void;
  onConnect: () => void;
  onDecrypt: () => void;
  log: string[];
  collectedCount: number;
  crystalTotal: number;
};

export function Hud({
  short,
  ready,
  busy,
  stats,
  decrypted,
  decryptFlash,
  privateCollects,
  panel,
  onPanel,
  onConnect,
  onDecrypt,
  log,
  collectedCount,
  crystalTotal,
}: Props) {
  const xp = stats?.xp ?? 0;
  const level = stats?.level ?? 1;
  const xpPct = Math.min(100, xp % 100);
  // Silhouette progress while locked — estimated from public crystal count
  const lockedXpGuess = Math.min(100, (collectedCount * 10) % 100);
  const questPct = Math.min(
    100,
    decrypted && stats
      ? (stats.quest / QUEST_TARGET) * 100
      : (privateCollects * 5 / QUEST_TARGET) * 100
  );

  const sealed = !decrypted;

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-4">
        <div className="pointer-events-auto glass rounded-2xl px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.2em] text-sky-300/70">
            Zone
          </div>
          <div className="text-base font-semibold text-sky-50">Whispering Grove</div>
          <div className="mt-1 text-xs text-sky-300/60">
            {collectedCount}/{crystalTotal} crystals ·{" "}
            <span className={sealed ? "text-cyan-300" : "text-amber-200/90"}>
              {sealed ? "encrypted on Inco" : "decrypted for you"}
            </span>
          </div>
        </div>

        {/* XP — silhouette when locked */}
        <div
          className={`pointer-events-auto glass min-w-[210px] rounded-2xl px-4 py-3 transition-all duration-500 ${
            sealed
              ? "ring-1 ring-cyan-400/30"
              : "ring-1 ring-amber-300/35"
          } ${decryptFlash ? "decrypt-flash" : ""}`}
        >
          <div className="flex justify-between text-xs">
            <span className={sealed ? "text-cyan-200/80" : "text-amber-100/90"}>
              {sealed ? "Level 🔒" : `Level ${level}`}
            </span>
            <span className={sealed ? "text-cyan-300/70" : "text-amber-200/80"}>
              {sealed ? "XP sealed" : `${xp} XP`}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/40">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                sealed
                  ? "bg-gradient-to-r from-cyan-500/50 to-blue-500/40 animate-pulse"
                  : "bg-gradient-to-r from-amber-300 to-orange-400"
              }`}
              style={{ width: `${sealed ? lockedXpGuess : xpPct}%` }}
            />
          </div>
          {sealed && (
            <div className="mt-1 text-[10px] text-cyan-400/60">
              Private fill · decrypt to reveal exact XP
            </div>
          )}
        </div>

        <div className="pointer-events-auto flex flex-col items-end gap-2">
          {ready ? (
            <div className="glass rounded-2xl px-4 py-3 text-xs text-emerald-300">
              {short}
              <div className="mt-0.5 text-[10px] text-sky-300/60">
                Session key · private writes
              </div>
            </div>
          ) : (
            <button type="button" onClick={onConnect} className="glass-btn glass-btn-primary">
              Connect for private loot
            </button>
          )}
          {/* Privacy hero CTA */}
          <button
            type="button"
            onClick={onDecrypt}
            disabled={!ready}
            className={`glass-btn glass-btn-primary min-w-[160px] ${
              sealed ? "shadow-[0_0_24px_rgba(34,211,238,0.25)]" : ""
            }`}
          >
            {sealed ? "Decrypt with Inco" : "Refresh decrypt"}
          </button>
        </div>
      </div>

      {busy && (
        <div className="absolute left-1/2 top-28 z-30 -translate-x-1/2 glass rounded-xl px-4 py-2 text-xs text-amber-200">
          {busy}
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 p-4 pb-5">
        {log[0] && (
          <div className="max-w-lg truncate rounded-full bg-black/50 px-4 py-1.5 text-center text-[11px] text-sky-100/85">
            {log[0]}
          </div>
        )}
        <div className="pointer-events-auto flex flex-wrap justify-center gap-2">
          {(
            [
              ["inventory", "Inventory"],
              ["character", "Private stats"],
              ["quests", "Quest"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`glass-btn ${panel === id ? "ring-1 ring-cyan-300/50" : ""} ${
                sealed ? "border-cyan-400/25" : "border-amber-300/25"
              }`}
              onClick={() => onPanel(panel === id ? "none" : id)}
            >
              {sealed ? "🔒 " : ""}
              {label}
            </button>
          ))}
        </div>
      </div>

      {panel !== "none" && (
        <div
          className={`absolute bottom-24 left-1/2 z-30 w-[min(360px,92vw)] -translate-x-1/2 glass rounded-2xl p-5 transition-all ${
            decryptFlash ? "decrypt-flash" : ""
          } ${sealed ? "ring-1 ring-cyan-400/30" : "ring-1 ring-amber-300/30"}`}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wide text-sky-50">
              {panel === "inventory" && "Inventory"}
              {panel === "character" && "Private stats"}
              {panel === "quests" && "Quest"}
              <span
                className={`ml-2 text-[10px] font-normal uppercase tracking-wider ${
                  sealed ? "text-cyan-300" : "text-amber-200"
                }`}
              >
                {sealed ? "encrypted" : "revealed"}
              </span>
            </h2>
            <button
              type="button"
              className="text-sky-300/70 hover:text-white"
              onClick={() => onPanel("none")}
            >
              ✕
            </button>
          </div>

          {panel === "inventory" && (
            <>
              <Row label="Crystal Dust" value={stats?.dust} locked={sealed} onDecrypt={onDecrypt} />
              <Row label="Potions" value={stats?.potions} locked={sealed} onDecrypt={onDecrypt} />
              <Row label="Map pieces" value={stats?.maps} locked={sealed} onDecrypt={onDecrypt} />
              <p className="mt-3 text-[11px] leading-relaxed text-sky-300/60">
                On-chain as Inco <code className="text-cyan-300">euint256</code>. Only your
                session can decrypt.
              </p>
            </>
          )}

          {panel === "character" && (
            <>
              <Row label="HP" value={stats?.hp} locked={sealed} onDecrypt={onDecrypt} />
              <Row label="ATK" value={stats?.atk} locked={sealed} onDecrypt={onDecrypt} />
              <Row label="DEF" value={stats?.def} locked={sealed} onDecrypt={onDecrypt} />
              <Row label="Luck" value={stats?.luck} locked={sealed} onDecrypt={onDecrypt} />
              <Row label="Level" value={stats?.level} locked={sealed} onDecrypt={onDecrypt} />
              <Row label="XP" value={stats?.xp} locked={sealed} onDecrypt={onDecrypt} />
            </>
          )}

          {panel === "quests" && (
            <div className="rounded-xl border border-cyan-500/20 bg-black/25 p-3">
              <div className="text-sm text-cyan-100">Ghost Collector</div>
              <div className="mt-1 text-[11px] leading-relaxed text-sky-300/65">
                Collect crystals while your inventory stays encrypted. Decrypt only when you
                want to verify — privacy is the run.
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/40">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    sealed
                      ? "bg-gradient-to-r from-cyan-500/60 to-blue-500/50"
                      : "bg-gradient-to-r from-amber-300 to-orange-400"
                  }`}
                  style={{ width: `${questPct}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[11px] text-sky-200/70">
                <span>{sealed ? "Private progress" : "Revealed"}</span>
                <span>
                  {decrypted && stats
                    ? `${stats.quest} / ${QUEST_TARGET} dust`
                    : `~${Math.min(QUEST_TARGET, privateCollects * 5)} / ${QUEST_TARGET} (est.)`}
                </span>
              </div>
              {decrypted && (stats?.quest ?? 0) >= QUEST_TARGET && (
                <div className="mt-2 text-xs text-amber-200">Quest complete — without public spoilers.</div>
              )}
            </div>
          )}

          {sealed && (
            <button
              type="button"
              onClick={onDecrypt}
              className="glass-btn glass-btn-primary mt-4 w-full"
            >
              Decrypt with Inco
            </button>
          )}
        </div>
      )}
    </>
  );
}

function Row({
  label,
  value,
  locked,
  onDecrypt,
}: {
  label: string;
  value?: number;
  locked: boolean;
  onDecrypt: () => void;
}) {
  return (
    <div className="mb-2 flex items-center justify-between border-b border-white/5 py-2 text-sm">
      <span className="text-sky-200/70">{label}</span>
      {locked ? (
        <button type="button" className="text-xs text-cyan-300 underline" onClick={onDecrypt}>
          🔒 Decrypt
        </button>
      ) : (
        <span className="font-medium text-amber-50 animate-[fadeIn_0.4s_ease]">
          {value}
        </span>
      )}
    </div>
  );
}
