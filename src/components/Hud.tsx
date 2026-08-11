"use client";

import type { DecryptedStats } from "@/hooks/useGrove";
import { QUEST_TARGET } from "@/lib/config";

type Props = {
  short: string | null;
  ready: boolean;
  busy: string | null;
  stats: DecryptedStats | null;
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
  const questPct = Math.min(100, ((stats?.quest ?? 0) / QUEST_TARGET) * 100);

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-4">
        <div className="pointer-events-auto glass rounded-2xl px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.2em] text-sky-300/70">
            Zone
          </div>
          <div className="text-base font-semibold text-sky-50">Whispering Grove</div>
          <div className="mt-1 text-xs text-sky-300/60">
            {collectedCount}/{crystalTotal} crystals · encrypted loot
          </div>
        </div>

        <div className="pointer-events-auto glass min-w-[200px] rounded-2xl px-4 py-3">
          <div className="flex justify-between text-xs text-sky-200/80">
            <span>Level {level}</span>
            <span>{stats ? `${xp} XP` : "XP 🔒"}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-400 transition-all"
              style={{ width: `${stats ? xpPct : 0}%` }}
            />
          </div>
        </div>

        <div className="pointer-events-auto">
          {ready ? (
            <div className="glass rounded-2xl px-4 py-3 text-xs text-emerald-300">
              {short}
              <div className="mt-0.5 text-[10px] text-sky-300/60">
                Session key active · Inco private state
              </div>
            </div>
          ) : (
            <button type="button" onClick={onConnect} className="glass-btn glass-btn-primary">
              Connect wallet
            </button>
          )}
        </div>
      </div>

      {busy && (
        <div className="absolute left-1/2 top-24 z-30 -translate-x-1/2 glass rounded-xl px-4 py-2 text-xs text-amber-200">
          {busy}
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 p-4">
        {log[0] && (
          <div className="max-w-lg truncate rounded-full bg-black/50 px-4 py-1.5 text-center text-[11px] text-sky-100/80">
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
              className={`glass-btn ${panel === id ? "ring-1 ring-cyan-300/50" : ""}`}
              onClick={() => onPanel(panel === id ? "none" : id)}
            >
              {label}
            </button>
          ))}
          <button type="button" className="glass-btn glass-btn-primary" onClick={onDecrypt}>
            Decrypt with Inco
          </button>
        </div>
      </div>

      {panel !== "none" && (
        <div className="absolute bottom-24 left-1/2 z-30 w-[min(360px,92vw)] -translate-x-1/2 glass rounded-2xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wide text-sky-50">
              {panel === "inventory" && "Inventory"}
              {panel === "character" && "Private stats"}
              {panel === "quests" && "Quest"}
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
              <Row label="Crystal Dust" value={stats?.dust} locked={!stats} onDecrypt={onDecrypt} />
              <Row label="Potions" value={stats?.potions} locked={!stats} onDecrypt={onDecrypt} />
              <Row label="Map pieces" value={stats?.maps} locked={!stats} onDecrypt={onDecrypt} />
              <p className="mt-3 text-[11px] leading-relaxed text-sky-300/60">
                Stored as Inco <code className="text-cyan-300">euint256</code> handles.
                Only your wallet/session can decrypt.
              </p>
            </>
          )}

          {panel === "character" && (
            <>
              <Row label="HP" value={stats?.hp} locked={!stats} onDecrypt={onDecrypt} />
              <Row label="ATK" value={stats?.atk} locked={!stats} onDecrypt={onDecrypt} />
              <Row label="DEF" value={stats?.def} locked={!stats} onDecrypt={onDecrypt} />
              <Row label="Luck" value={stats?.luck} locked={!stats} onDecrypt={onDecrypt} />
              <Row label="Level" value={stats?.level} locked={!stats} onDecrypt={onDecrypt} />
              <Row label="XP" value={stats?.xp} locked={!stats} onDecrypt={onDecrypt} />
            </>
          )}

          {panel === "quests" && (
            <div className="rounded-xl border border-sky-500/20 bg-black/20 p-3">
              <div className="text-sm text-cyan-200">Gather 20 Crystal Dust</div>
              <div className="mt-1 text-[11px] text-sky-300/60">
                Progress is an encrypted on-chain value.
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/40">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all"
                  style={{ width: `${questPct}%` }}
                />
              </div>
              <div className="mt-1 text-right text-[11px] text-sky-200/70">
                {stats ? `${stats.quest} / ${QUEST_TARGET}` : "Decrypt to view"}
              </div>
            </div>
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
        <span className="font-medium text-sky-50">{value}</span>
      )}
    </div>
  );
}
