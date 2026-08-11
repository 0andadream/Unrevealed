"use client";

const KEY = "inco-grove.onboarded.v1";

export function shouldShowOnboarding() {
  if (typeof window === "undefined") return false;
  return !localStorage.getItem(KEY);
}

export function markOnboarded() {
  localStorage.setItem(KEY, "1");
}

type Props = {
  onDismiss: () => void;
};

/** First-time overlay — privacy is the hero. */
export function OnboardingOverlay({ onDismiss }: Props) {
  const dismiss = () => {
    markOnboarded();
    onDismiss();
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#030810]/78 p-4 backdrop-blur-md">
      <div className="w-[min(420px,100%)] rounded-3xl border border-cyan-400/25 bg-gradient-to-b from-[#0c1a32]/95 to-[#071018]/98 p-6 shadow-[0_0_80px_rgba(34,211,238,0.12)]">
        <div className="mb-1 text-[11px] uppercase tracking-[0.25em] text-cyan-300/70">
          Welcome to Inco Grove
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-sky-50">
          Your loot stays private.
        </h2>
        <ul className="mt-5 space-y-3 text-sm leading-relaxed text-sky-100/85">
          <li className="flex gap-3">
            <span className="mt-0.5 text-cyan-300">✦</span>
            <span>
              <strong className="text-sky-50">Collect crystals</strong> — each one is
              stored <em>encrypted</em> on Inco Lightning.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 text-cyan-300">✦</span>
            <span>
              <strong className="text-sky-50">Only you</strong> can decrypt inventory &amp;
              stats with your session key.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 text-cyan-300">✦</span>
            <span>
              Progress stays private until you choose to{" "}
              <strong className="text-sky-50">Decrypt with Inco</strong>.
            </span>
          </li>
        </ul>
        <p className="mt-4 text-xs text-sky-300/55">
          Connect once → grant a session key → collect without wallet popups.
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-500/90 to-indigo-500/90 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110"
        >
          Enter the Grove
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="mt-2 w-full py-2 text-xs text-sky-400/60 hover:text-sky-200"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
