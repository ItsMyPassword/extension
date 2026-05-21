/**
 * Pending "save this account?" records, keyed by registrable domain.
 *
 * When the badge fills a password but the user hasn't yet decided whether
 * to record the (domain, username) pair, we stash a marker in
 * chrome.storage.session so the banner can reappear after a form-submit
 * navigation. Entries auto-expire after a short TTL — we don't want to
 * still nag the user about a fill from twenty minutes ago.
 */
import type { Profile } from "../shared/types.js";

const PENDING_KEY = "pendingSaves";
const TTL_MS = 5 * 60 * 1000;

interface PendingRecord {
  username: string;
  profile?: Profile;
  ts: number;
}

type Store = Record<string, PendingRecord>;

async function readStore(): Promise<Store> {
  const { [PENDING_KEY]: raw } = await chrome.storage.session.get(PENDING_KEY);
  if (raw === undefined || raw === null || typeof raw !== "object") return {};
  return raw as Store;
}

async function writeStore(store: Store): Promise<void> {
  await chrome.storage.session.set({ [PENDING_KEY]: store });
}

export async function setPendingSave(
  domain: string,
  username: string,
  profile?: Profile,
): Promise<void> {
  const store = await readStore();
  store[domain] = {
    username,
    ts: Date.now(),
    ...(profile !== undefined ? { profile } : {}),
  };
  await writeStore(store);
}

export async function getPendingSave(
  domain: string,
): Promise<{ username: string; profile?: Profile } | null> {
  const store = await readStore();
  const entry = store[domain];
  if (entry === undefined) return null;
  if (Date.now() - entry.ts > TTL_MS) {
    delete store[domain];
    await writeStore(store);
    return null;
  }
  return {
    username: entry.username,
    ...(entry.profile !== undefined ? { profile: entry.profile } : {}),
  };
}

export async function clearPendingSave(domain: string): Promise<void> {
  const store = await readStore();
  if (store[domain] === undefined) return;
  delete store[domain];
  await writeStore(store);
}
