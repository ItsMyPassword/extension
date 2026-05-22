/**
 * Sync runner. Orchestrates the lifecycle of a sync session (connect,
 * disconnect, status) without leaking the master to the rest of the
 * background.
 *
 * The runner does NOT auto-pull/push yet — that's a follow-up. This
 * module owns:
 *   - persistence of the SyncSession (chrome.storage.local)
 *   - the OPAQUE handshake (try-login-then-register fallback)
 *   - connection probing (GET /health)
 *   - clean disconnect (best-effort POST /auth/logout + local wipe)
 */
import { SyncApiError, SyncClient } from "../../shared/sync/client.js";
import { syncLogin, syncRegister, type SyncSession } from "../../shared/sync/auth.js";
import type { SyncSessionView } from "../../shared/messages.js";
import { clearSession, loadSession, saveSession } from "./session-store.js";

/** Surface of the SyncSession returned to UI layers. Strips secrets
 * (devicePrivkey, saltSync, ekFingerprint) the popup has no business
 * seeing. */
function toView(session: SyncSession, lastSyncAt: number | null): SyncSessionView {
  return {
    baseUrl: session.baseUrl,
    email: session.email,
    deviceId: session.deviceId,
    connectedAt: session.expiresAt - 30 * 24 * 60 * 60 * 1000,
    lastSyncAt,
  };
}

export interface SyncStatus {
  connected: boolean;
  session: SyncSessionView | null;
}

export async function getSyncStatus(): Promise<SyncStatus> {
  const session = await loadSession();
  if (!session) return { connected: false, session: null };
  return { connected: true, session: toView(session, null) };
}

/** Probe a server URL via `GET /health` with a short timeout. */
export async function testConnection(
  baseUrl: string,
): Promise<{ reachable: boolean; reason?: string }> {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (!/^https?:\/\/[^\s/]+/i.test(trimmed)) {
    return { reachable: false, reason: "invalid_url" };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${trimmed}/health`, { signal: controller.signal });
    if (!res.ok) return { reachable: false, reason: `http_${res.status}` };
    const body = (await res.json()) as { status?: string };
    if (body.status !== "ok") return { reachable: false, reason: "unexpected_payload" };
    return { reachable: true };
  } catch (err) {
    const code = err instanceof Error && err.name === "AbortError" ? "timeout" : "network_error";
    return { reachable: false, reason: code };
  } finally {
    clearTimeout(timeout);
  }
}

export interface ConnectResult {
  session: SyncSession;
  loggedIn: boolean;
}

/**
 * Connect a device to a server. Tries `login` first (cheap if the
 * account exists) and falls back to `register` on a 401. This makes the
 * wizard's UX a single button rather than asking the user up-front
 * whether they have an account.
 */
export async function connect(args: {
  baseUrl: string;
  email: string;
  master: string;
  deviceLabel?: string;
}): Promise<ConnectResult> {
  const baseUrl = args.baseUrl.trim().replace(/\/+$/, "");

  // We don't keep any "existing" state for a brand-new device, so this
  // is always a fresh keypair on the login path.
  try {
    const session = await syncLogin({
      baseUrl,
      email: args.email,
      master: args.master,
      ...(args.deviceLabel !== undefined ? { deviceLabel: args.deviceLabel } : {}),
    });
    await saveSession(session);
    return { session, loggedIn: true };
  } catch (err) {
    // Wrong master → surface as wrong-master regardless of register
    // outcome (we don't want to fall through to register with a bad
    // master).
    if (err instanceof Error && err.message === "wrong master password") {
      throw err;
    }
    if (!(err instanceof SyncApiError)) throw err;
    // 401 here means the server has no record under this email — we
    // attempt registration. Other statuses bubble up.
    if (err.status !== 401) throw err;

    const session = await syncRegister({
      baseUrl,
      email: args.email,
      master: args.master,
      ...(args.deviceLabel !== undefined ? { deviceLabel: args.deviceLabel } : {}),
    });
    await saveSession(session);
    return { session, loggedIn: false };
  }
}

/** Best-effort server logout + always-on local wipe. */
export async function disconnect(): Promise<void> {
  const session = await loadSession();
  if (session) {
    try {
      const client = new SyncClient({
        baseUrl: session.baseUrl,
        sessionToken: session.sessionToken,
      });
      await client.logout();
    } catch {
      // Network errors, expired token, deleted account — none of them
      // should block local disconnect. Wipe regardless.
    }
  }
  await clearSession();
}

export const __testing = { toView };
