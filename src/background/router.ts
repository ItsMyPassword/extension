/**
 * Message router for the background service worker.
 *
 * Pure logic, no side effects at import time. The entrypoint module wires
 * `handleRequest` into `chrome.runtime.onMessage`.
 */
import { derivePassword, fingerprintMaster, formatFingerprint } from "./crypto/index.js";
import { effectiveProfile, loadState, updateState, wipeAll, type StoredState } from "./storage.js";
import { lock, readMaster, status as sessionStatus, unlock } from "./session.js";
import type {
  ErrorResponse,
  GenerateResponse,
  GetProfileResponse,
  GetStateResponse,
  Request,
  StatusResponse,
  UnlockResponse,
  OkResponse,
  FingerprintResponse,
} from "../shared/messages.js";
import { DEFAULT_RANDOM_PROFILE, type Profile } from "../shared/types.js";

type AnyResponse =
  | OkResponse
  | ErrorResponse
  | StatusResponse
  | UnlockResponse
  | FingerprintResponse
  | GenerateResponse
  | GetProfileResponse
  | GetStateResponse;

export async function handleRequest(request: Request): Promise<AnyResponse> {
  try {
    switch (request.kind) {
      case "status":
        return await handleStatus();
      case "setup":
        return await handleSetup(request.master, request.defaultProfile);
      case "unlock":
        return await handleUnlock(request.master);
      case "lock":
        await lock();
        return { ok: true };
      case "fingerprint":
        return await handleFingerprint(request.master);
      case "generate":
        return await handleGenerate(request.domain, request.email, request.profile);
      case "getProfile":
        return await handleGetProfile(request.domain);
      case "setProfile":
        await handleSetProfile(request.domain, request.profile);
        return { ok: true };
      case "getState":
        return await handleGetState();
      case "wipe":
        await wipeAll();
        await lock();
        return { ok: true };
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function handleStatus(): Promise<StatusResponse> {
  const state = await loadState();
  const ses = await sessionStatus();
  return {
    ok: true,
    locked: ses.locked,
    isFirstRun: state.fingerprint === undefined,
    fingerprint: state.fingerprint ?? null,
  };
}

async function handleSetup(
  master: string,
  defaultProfile?: Profile,
): Promise<UnlockResponse | ErrorResponse> {
  if (!master || master.length < 8) {
    return { ok: false, error: "master password must be at least 8 characters" };
  }
  const fingerprintBytes = await fingerprintMaster(master);
  const fingerprint = formatFingerprint(fingerprintBytes);

  await updateState((state) => ({
    ...state,
    fingerprint,
    defaultProfile: defaultProfile ?? state.defaultProfile,
  }));

  const state = await loadState();
  await unlock(master, state.autoLockMinutes);
  return { ok: true, fingerprint };
}

async function handleUnlock(master: string): Promise<UnlockResponse | ErrorResponse> {
  const state = await loadState();
  if (state.fingerprint === undefined) {
    return { ok: false, error: "extension has not been set up" };
  }
  const candidate = formatFingerprint(await fingerprintMaster(master));
  if (candidate !== state.fingerprint) {
    return { ok: false, error: "incorrect master password" };
  }
  await unlock(master, state.autoLockMinutes);
  return { ok: true, fingerprint: candidate };
}

async function handleFingerprint(master: string): Promise<FingerprintResponse> {
  const fp = formatFingerprint(await fingerprintMaster(master));
  return { ok: true, fingerprint: fp };
}

async function handleGenerate(
  domain: string,
  email: string,
  profile?: Profile,
): Promise<GenerateResponse | ErrorResponse> {
  const master = await readMaster();
  if (master === null) {
    return { ok: false, error: "locked" };
  }
  const state = await loadState();
  const effective = profile ?? effectiveProfile(state, domain);
  const password = await derivePassword({
    inputs: { master, domain, email },
    profile: effective,
  });
  return { ok: true, password };
}

async function handleGetProfile(domain: string): Promise<GetProfileResponse> {
  const state = await loadState();
  const isOverride = state.sites[domain] !== undefined;
  return {
    ok: true,
    profile: state.sites[domain] ?? state.defaultProfile,
    isOverride,
  };
}

async function handleSetProfile(domain: string, profile: Profile): Promise<void> {
  await updateState((state) => ({
    ...state,
    sites: { ...state.sites, [domain]: profile },
  }));
}

async function handleGetState(): Promise<GetStateResponse> {
  const state: StoredState = await loadState();
  return {
    ok: true,
    defaultProfile: state.defaultProfile ?? DEFAULT_RANDOM_PROFILE,
    autoLockMinutes: state.autoLockMinutes,
    hasPin: state.pin !== undefined,
    sites: state.sites,
  };
}
