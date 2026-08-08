import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const SK = "inco-grove.session.v1";

export type SessionBundle = {
  privateKey: `0x${string}`;
  address: `0x${string}`;
  expiresAt: number;
};

export function loadSession(): SessionBundle | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SK);
    if (!raw) return null;
    const b = JSON.parse(raw) as SessionBundle;
    if (!b.privateKey || !b.address) return null;
    if (b.expiresAt && b.expiresAt * 1000 < Date.now()) return null;
    return b;
  } catch {
    return null;
  }
}

export function createSession(hours = 24): SessionBundle {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  const expiresAt = Math.floor(Date.now() / 1000) + hours * 3600;
  const bundle: SessionBundle = {
    privateKey,
    address: account.address,
    expiresAt,
  };
  localStorage.setItem(SK, JSON.stringify(bundle));
  return bundle;
}

export function clearSession() {
  localStorage.removeItem(SK);
}
