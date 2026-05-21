/**
 * Encrypted, opt-in store of `(domain, username)` pairs the user has
 * registered with through the extension.
 *
 * The serialised JSON list is AES-GCM-encrypted under a PBKDF2-derived key
 * from the master password (mirroring the PIN-blob recipe). Only the
 * service worker can read it: the master never leaves the background.
 */
import { deriveAesGcmKey } from "./crypto/index.js";
import type { AccountEntry } from "../shared/types.js";

const STORAGE_KEY = "accountsCipher";
const ITERATIONS = 200_000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

interface CipherBlob {
  ciphertext: string;
  iv: string;
  salt: string;
  iterations: number;
}

export async function listAccounts(master: string, domain?: string): Promise<AccountEntry[]> {
  const all = await readAll(master);
  const filtered = domain === undefined ? all : all.filter((e) => e.domain === domain);
  return [...filtered].sort((a, b) => b.lastUsedAt - a.lastUsedAt);
}

export async function recordAccount(
  master: string,
  domain: string,
  username: string,
): Promise<AccountEntry> {
  const now = Date.now();
  const all = await readAll(master);
  const existing = all.find((e) => e.domain === domain && e.username === username);
  let entry: AccountEntry;
  if (existing !== undefined) {
    existing.lastUsedAt = now;
    entry = existing;
  } else {
    entry = { domain, username, createdAt: now, lastUsedAt: now };
    all.push(entry);
  }
  await writeAll(master, all);
  return entry;
}

export async function deleteAccount(
  master: string,
  domain: string,
  username: string,
): Promise<void> {
  const all = await readAll(master);
  const next = all.filter((e) => !(e.domain === domain && e.username === username));
  if (next.length === all.length) return;
  await writeAll(master, next);
}

/**
 * Remove the encrypted blob entirely. Returns 1 if a blob existed (we cannot
 * count entries without the master), 0 otherwise — the caller surfaces this
 * as a coarse "history wiped" confirmation.
 */
export async function wipeAccounts(): Promise<number> {
  const { [STORAGE_KEY]: raw } = await chrome.storage.local.get(STORAGE_KEY);
  await chrome.storage.local.remove(STORAGE_KEY);
  if (!raw || typeof raw !== "object") return 0;
  return 1;
}

async function readAll(master: string): Promise<AccountEntry[]> {
  const { [STORAGE_KEY]: raw } = await chrome.storage.local.get(STORAGE_KEY);
  if (!raw || typeof raw !== "object") return [];
  const blob = raw as CipherBlob;
  const salt = base64ToBytes(blob.salt);
  const iv = base64ToBytes(blob.iv);
  const ciphertext = base64ToBytes(blob.ciphertext);
  const key = await deriveAesGcmKey(master, salt, blob.iterations);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    ciphertext as BufferSource,
  );
  const parsed = JSON.parse(new TextDecoder().decode(plain));
  if (!Array.isArray(parsed)) return [];
  return parsed as AccountEntry[];
}

async function writeAll(master: string, entries: AccountEntry[]): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveAesGcmKey(master, salt, ITERATIONS);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    new TextEncoder().encode(JSON.stringify(entries)) as BufferSource,
  );
  const blob: CipherBlob = {
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    iv: bytesToBase64(iv),
    salt: bytesToBase64(salt),
    iterations: ITERATIONS,
  };
  await chrome.storage.local.set({ [STORAGE_KEY]: blob });
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function base64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
