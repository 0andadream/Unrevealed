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
      {/* Top-right counter — Galleria style */}
      <div className="pointer-events-none absolute right-3 top-3 z-20 flex items-center gap-2 pixel-panel px-2 py-1.5 sm:px-3 sm:py-2">
        <span className="inline-block h-3 w-3 rounded-sm bg-g-crystal shadow-[inset_1px_1px_0_#fff]" />
        <span className="pixel-value text-[11px] sm:text-[14px]">
          {collectedCount} / {crystalTotal}
        </span>
      </div>

      {/* Top-left zone */}
      <div className="pointer-events-none absolute left-3 top-3 z-20 pixel-panel px-3 py-2">
        <div className="pixel-label">ZONE</div>
        <div className="pixel-value mt-1 text-[10px] tracking-wider sm:text-[12px]">
          WHISPERING GROVE
        </div>
      </div>

      {/* Connect / session — top center-right under counter on mobile */}
      <div className="pointer-events-auto absolute right-3 top-14 z-20 sm:top-3 sm:right-36">
        {ready ? (
          <div className="pixel-panel px-2 py-1.5 text-[8px] text-g-bright sm:text-[9px]">
            {short} · SESSION
          </div>
        ) : (
          <button type="button" onClick={onConnect} className="pixel-btn pixel-btn-primary">
            Connect
          </button>
        )}
      </div>

      {busy && (
        <div className="absolute left-1/2 top-16 z-30 -translate-x-1/2 pixel-panel px-3 py-2 text-[8px] text-g-gold sm:text-[9px]">
          {busy}
        </div>
      )}

      {/* Bottom HUD bar — Galleria dock */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
        {log[0] && (
          <div className="mx-auto mb-1 max-w-xl truncate px-3 text-center text-[8px] text-g-bright text-shadow-pixel">
            {log[0]}
          </div>
        )}

        <div className="relative flex h-[72px] items-stretch bg-g-mid sm:h-[88px]">
          {/* top cream border */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-g-cream" />
          <div className="pointer-events-none absolute inset-x-0 top-[3px] h-[2px] bg-g-bright/70" />

          {/* rivets */}
          <span className="rivet left-2 top-2" />
          <span className="rivet right-2 top-2" />
          <span className="rivet bottom-2 left-2" />
          <span className="rivet bottom-2 right-2" />

          <HudCell label="LEVEL" value={String(level)} />
          <HudCell
            label="XP"
            value={stats ? String(xp) : "—"}
            bar={stats ? xpPct : 0}
          />

          {/* Center action pocket */}
          <div className="pointer-events-auto relative z-10 flex w-[min(42vw,220px)] shrink-0 flex-col items-center justify-end pb-1">
            <div className="flex flex-wrap justify-center gap-1 px-1">
              {(
                [
                  ["inventory", "BAG"],
                  ["character", "STATS"],
                  ["quests", "QUEST"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`pixel-btn !px-2 !py-1.5 !text-[7px] sm:!text-[8px] ${
                    panel === id ? "!bg-g-bright !text-g-bg" : ""
                  }`}
                  onClick={() => onPanel(panel === id ? "none" : id)}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                className="pixel-btn !px-2 !py-1.5 !text-[7px] text-g-crystal sm:!text-[8px]"
                onClick={onDecrypt}
              >
                DECRYPT
              </button>
            </div>
          </div>

          <HudCell
            label="DUST"
            value={stats ? String(stats.dust) : "🔒"}
          />
          <HudCell
            label="QUEST"
            value={stats ? `${stats.quest}/${QUEST_TARGET}` : "🔒"}
            bar={stats ? questPct : 0}
          />
        </div>
      </div>

      {/* Floating panels */}
      {panel === "inventory" && (
        <Panel title="INVENTORY" onClose={() => onPanel("none")}>
          <Item name="Crystal Dust" locked={!stats} value={stats?.dust} onDecrypt={onDecrypt} />
          <Item name="Potions" locked={!stats} value={stats?.potions} onDecrypt={onDecrypt} />
          <Item name="Map Pieces" locked={!stats} value={stats?.maps} onDecrypt={onDecrypt} />
          <p className="mt-3 text-[7px] leading-relaxed text-g-bright">
            Encrypted on Inco Lightning. Only you can decrypt.
          </p>
        </Panel>
      )}

      {panel === "character" && (
        <Panel title="PRIVATE STATS" onClose={() => onPanel("none")}>
          <Stat label="HP" value={stats?.hp} onDecrypt={onDecrypt} />
          <Stat label="ATK" value={stats?.atk} onDecrypt={onDecrypt} />
          <Stat label="DEF" value={stats?.def} onDecrypt={onDecrypt} />
          <Stat label="LUCK" value={stats?.luck} onDecrypt={onDecrypt} />
          <Stat label="LEVEL" value={stats?.level} onDecrypt={onDecrypt} />
          <Stat label="XP" value={stats?.xp} onDecrypt={onDecrypt} />
        </Panel>
      )}

      {panel === "quests" && (
        <Panel title="QUESTS" onClose={() => onPanel("none")}>
          <div className="border-2 border-g-bright bg-g-bg p-3 shadow-pixel">
            <div className="text-[9px] text-g-crystal">GATHER CRYSTAL DUST</div>
            <div className="mt-2 text-[7px] leading-relaxed text-g-bright">
              Walk the grove. Collect crystals. Progress stays private on-chain.
            </div>
            <div className="pixel-bar mt-3">
              <i style={{ width: `${questPct}%` }} />
            </div>
            <div className="mt-1 text-right text-[8px] text-g-cream">
              {stats ? `${stats.quest} / ${QUEST_TARGET}` : "DECRYPT TO VIEW"}
            </div>
            {(stats?.quest ?? 0) >= QUEST_TARGET && (
              <div className="mt-2 text-[8px] text-g-gold">QUEST COMPLETE</div>
            )}
          </div>
        </Panel>
      )}
    </>
  );
}

function HudCell({
  label,
  value,
  bar,
}: {
  label: string;
  value: string;
  bar?: number;
}) {
  return (
    <div
      className="pointer-events-none flex min-w-0 flex-1 flex-col items-center justify-center gap-1 border-r-2 border-g-bg px-1 shadow-pixel-inset"
      style={{ borderLeft: "1px solid #345878" }}
    >
      <span className="pixel-label whitespace-nowrap">{label}</span>
      <span className="pixel-value text-[11px] sm:text-[16px]">{value}</span>
      {bar != null && (
        <div className="pixel-bar mt-0.5 w-[72%]">
          <i style={{ width: `${bar}%` }} />
        </div>
      )}
    </div>
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
    <div className="absolute bottom-24 left-1/2 z-30 w-[min(340px,92vw)] -translate-x-1/2 pixel-panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[10px] tracking-wider text-g-cream text-shadow-pixel">
          {title}
        </h2>
        <button
          type="button"
          className="text-g-bright hover:text-g-cream"
          onClick={onClose}
        >
          X
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
  value?: number;
  locked: boolean;
  onDecrypt: () => void;
}) {
  return (
    <div className="mb-2 flex items-center justify-between border-2 border-g-mid bg-g-deep px-3 py-2">
      <div>
        <div className="text-[8px] text-g-cream">{name}</div>
        <div className="mt-1 text-[7px] text-g-bright">
          {locked ? "LOCKED · ENCRYPTED" : value}
        </div>
      </div>
      {locked ? (
        <button type="button" className="pixel-btn !py-1 !text-[7px]" onClick={onDecrypt}>
          DECRYPT
        </button>
      ) : (
        <span className="pixel-value text-[12px]">{value}</span>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  onDecrypt,
}: {
  label: string;
  value?: number;
  onDecrypt: () => void;
}) {
  return (
    <div className="mb-1 flex items-center justify-between border-b border-g-mid/60 py-1.5">
      <span className="text-[8px] text-g-bright">{label}</span>
      {value == null ? (
        <button type="button" className="text-[7px] text-g-crystal underline" onClick={onDecrypt}>
          DECRYPT
        </button>
      ) : (
        <span className="pixel-value text-[11px]">{value}</span>
      )}
    </div>
  );
}
