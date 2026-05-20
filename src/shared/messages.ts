/**
 * Message contract between the popup (and future content scripts) and the
 * background service worker.
 *
 * Every message goes through `chrome.runtime.sendMessage` with a single
 * discriminated-union payload. Centralising the type here keeps both sides
 * honest about the shape of requests and responses.
 */
import type { Profile } from "./types.js";

export type Request =
  | { kind: "status" }
  | { kind: "unlock"; master: string }
  | { kind: "lock" }
  | { kind: "setup"; master: string; defaultProfile?: Profile }
  | { kind: "fingerprint"; master: string }
  | { kind: "generate"; domain: string; email: string; profile?: Profile }
  | { kind: "getProfile"; domain: string }
  | { kind: "setProfile"; domain: string; profile: Profile }
  | { kind: "getState" }
  | { kind: "wipe" };

export type Response<T extends Request> = T extends { kind: "status" }
  ? StatusResponse
  : T extends { kind: "unlock" }
    ? UnlockResponse
    : T extends { kind: "lock" }
      ? OkResponse
      : T extends { kind: "setup" }
        ? UnlockResponse
        : T extends { kind: "fingerprint" }
          ? FingerprintResponse
          : T extends { kind: "generate" }
            ? GenerateResponse
            : T extends { kind: "getProfile" }
              ? GetProfileResponse
              : T extends { kind: "setProfile" }
                ? OkResponse
                : T extends { kind: "getState" }
                  ? GetStateResponse
                  : T extends { kind: "wipe" }
                    ? OkResponse
                    : never;

export interface OkResponse {
  ok: true;
}

export interface ErrorResponse {
  ok: false;
  error: string;
}

export interface StatusResponse {
  ok: true;
  locked: boolean;
  isFirstRun: boolean;
  fingerprint: string | null;
}

export interface UnlockResponse {
  ok: true;
  fingerprint: string;
}

export interface FingerprintResponse {
  ok: true;
  fingerprint: string;
}

export interface GenerateResponse {
  ok: true;
  password: string;
}

export interface GetProfileResponse {
  ok: true;
  profile: Profile;
  isOverride: boolean;
}

export interface GetStateResponse {
  ok: true;
  defaultProfile: Profile;
  autoLockMinutes: number;
  hasPin: boolean;
  sites: Record<string, Profile>;
}

/** Discriminator for `chrome.runtime.onMessage` callbacks. */
export function isRequest(value: unknown): value is Request {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    typeof (value as { kind: unknown }).kind === "string"
  );
}
