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
}: Props) {
  const xp = stats?.xp ?? 0;
  const level = stats?.level ?? 1;
  const xpInto = xp % 100;
  const xpPct = Math.min(100, xpInto);

  return (
    <>
      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3">
        <div className="pointer-events-auto pixel-panel px-3 py-2">
          <div className="text-[10px] uppercase tracking-[0.2em] text-grove-mist">
            Zone
          </div>
          <div className="font-pixel text-sm text-grove-crystal text-glow">
            Whispering Grove
          </div>
        </div>

        <div className="pointer-events-auto pixel-panel min-w-[200px] px-3 py-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-grove-mist">Lv {level}</span>
            <span className="text-grove-glow">{xp} XP</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-black/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-grove-glow to-grove-crystal transition-all duration-500"
              style={{ width: `${xpPct}%` }}
            />
          </div>
        </div>

        <div className="pointer-events-auto">
          {ready ? (
            <div className="pixel-panel px-3 py-2 text-xs text-grove-leaf">
              {short} · session active
            </div>
          ) : (
            <button
              type="button"
              onClick={onConnect}
              className="pixel-btn bg-grove-glow/20 text-grove-glow hover:bg-grove-glow/30"
            >
              Connect wallet
            </button>
          )}
        </div>
      </div>

      {busy && (
        <div className="absolute left-1/2 top-20 z-30 -translate-x-1/2 pixel-panel px-4 py-2 text-xs text-grove-gold">
          {busy}
        </div>
      )}

      {/* Bottom bar */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 p-3">
        {log[0] && (
          <div className="pointer-events-none max-w-lg truncate rounded-lg bg-black/60 px-3 py-1 text-center text-[11px] text-grove-mist">
            {log[0]}
          </div>
        )}
        <div className="pointer-events-auto flex flex-wrap justify-center gap-2">
          {(
            [
              ["inventory", "Inventory"],
              ["character", "Private Stats"],
              ["quests", "Quests"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`pixel-btn ${panel === id ? "ring-1 ring-grove-glow" : ""}`}
              onClick={() => onPanel(panel === id ? "none" : id)}
            >
              {label}
            </button>
          ))}
          <button type="button" className="pixel-btn text-grove-crystal" onClick={onDecrypt}>
            🔓 Decrypt
          </button>
        </div>
      </div>

      {/* Panels */}
      {panel === "inventory" && (
        <Panel title="Inventory" onClose={() => onPanel("none")}>
          <Item
            name="Crystal Dust"
            locked={!stats}
            value={stats ? String(stats.dust) : "•••"}
            onDecrypt={onDecrypt}
          />
          <Item
            name="Potions"
            locked={!stats}
            value={stats ? String(stats.potions) : "•••"}
            onDecrypt={onDecrypt}
          />
          <Item
            name="Map Pieces"
            locked={!stats}
            value={stats ? String(stats.maps) : "•••"}
            onDecrypt={onDecrypt}
          />
          <p className="mt-3 text-[10px] leading-relaxed text-grove-mist">
            Encrypted with Inco Lightning. Only your wallet/session can decrypt.
          </p>
        </Panel>
      )}

      {panel === "character" && (
        <Panel title="Private Stats" onClose={() => onPanel("none")}>
          <StatRow label="HP" value={stats?.hp} onDecrypt={onDecrypt} />
          <StatRow label="ATK" value={stats?.atk} onDecrypt={onDecrypt} />
          <StatRow label="DEF" value={stats?.def} onDecrypt={onDecrypt} />
          <StatRow label="Luck" value={stats?.luck} onDecrypt={onDecrypt} />
          <StatRow label="Level" value={stats?.level} onDecrypt={onDecrypt} />
          <StatRow label="XP" value={stats?.xp} onDecrypt={onDecrypt} />
        </Panel>
      )}

      {panel === "quests" && (
        <Panel title="Quests" onClose={() => onPanel("none")}>
          <div className="rounded-lg border border-grove-border bg-black/30 p-3">
            <div className="text-sm text-grove-crystal">Gather Crystal Dust</div>
            <div className="mt-1 text-[11px] text-grove-mist">
              Collect crystals in the grove. Progress is stored privately on-chain.
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/50">
              <div
                className="h-full bg-grove-leaf transition-all"
                style={{
                  width: `${Math.min(100, ((stats?.quest ?? 0) / QUEST_TARGET) * 100)}%`,
                }}
              />
            </div>
            <div className="mt-1 text-right text-[11px] text-grove-mist">
              {stats ? `${stats.quest} / ${QUEST_TARGET}` : "🔒 Decrypt to view"}
            </div>
            {(stats?.quest ?? 0) >= QUEST_TARGET && (
              <div className="mt-2 text-xs text-grove-gold">Quest complete!</div>
            )}
          </div>
          {!stats && (
            <button type="button" className="pixel-btn mt-3 w-full" onClick={onDecrypt}>
              Decrypt progress
            </button>
          )}
        </Panel>
      )}
    </>
  );
}

function Panel({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="absolute bottom-20 left-1/2 z-30 w-[min(360px,92vw)] -translate-x-1/2 pixel-panel p-4 shadow-glow">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-pixel text-sm text-grove-glow">{title}</h2>
        <button type="button" className="text-grove-mist hover:text-white" onClick={onClose}>
          ✕
        </button>
      </div>
      {children}
    </div>
  );
}

function Item({
  name,
  value,
  locked,
  onDecrypt,
}: {
  name: string;
  value: string;
  locked: boolean;
  onDecrypt: () => void;
}) {
  return (
    <div className="mb-2 flex items-center justify-between rounded-lg border border-grove-border/80 bg-black/25 px-3 py-2">
      <div>
        <div className="text-sm">{name}</div>
        <div className="text-xs text-grove-mist">{locked ? "🔒 encrypted" : value}</div>
      </div>
      {locked ? (
        <button type="button" className="pixel-btn text-[10px]" onClick={onDecrypt}>
          Decrypt
        </button>
      ) : (
        <span className="text-grove-crystal">{value}</span>
      )}
    </div>
  );
}

function StatRow({
  label,
  value,
  onDecrypt,
}: {
  label: string;
  value?: number;
  onDecrypt: () => void;
}) {
  return (
    <div className="mb-2 flex items-center justify-between border-b border-grove-border/50 py-1.5 text-sm">
      <span className="text-grove-mist">{label}</span>
      {value == null ? (
        <button type="button" className="text-xs text-grove-glow underline" onClick={onDecrypt}>
          🔒 Decrypt
        </button>
      ) : (
        <span className="font-pixel text-grove-crystal">{value}</span>
      )}
    </div>
  );
}
