import { beforeEach, describe, expect, it } from "vitest";
import { installChromeMock } from "./helpers/chrome-mock.js";
import {
  DEFAULT_STATE,
  SCHEMA_VERSION,
  effectiveProfile,
  loadState,
  saveState,
  updateState,
  wipeAll,
} from "../src/background/storage.js";
import { DEFAULT_RANDOM_PROFILE } from "../src/shared/types.js";

const mock = installChromeMock();

beforeEach(() => {
  mock.reset();
});

describe("loadState", () => {
  it("returns default state when storage is empty", async () => {
    const state = await loadState();
    expect(state.schemaVersion).toBe(SCHEMA_VERSION);
    expect(state.defaultProfile).toEqual(DEFAULT_RANDOM_PROFILE);
    expect(state.sites).toEqual({});
    expect(state.autoLockMinutes).toBe(DEFAULT_STATE.autoLockMinutes);
  });

  it("resets when the schema version does not match", async () => {
    await chrome.storage.local.set({ "state.v1": { schemaVersion: 0, sites: { "x.com": {} } } });
    const state = await loadState();
    expect(state.schemaVersion).toBe(SCHEMA_VERSION);
    expect(state.sites).toEqual({});
  });
});

describe("saveState / updateState", () => {
  it("round-trips state through storage", async () => {
    await saveState({
      schemaVersion: SCHEMA_VERSION,
      defaultProfile: DEFAULT_RANDOM_PROFILE,
      autoLockMinutes: 30,
      fingerprint: "abc",
      sites: { "example.com": DEFAULT_RANDOM_PROFILE },
    });
    const state = await loadState();
    expect(state.autoLockMinutes).toBe(30);
    expect(state.fingerprint).toBe("abc");
    expect(state.sites["example.com"]).toEqual(DEFAULT_RANDOM_PROFILE);
  });

  it("updateState mutates atomically", async () => {
    await updateState((s) => ({ ...s, autoLockMinutes: 5 }));
    const state = await loadState();
    expect(state.autoLockMinutes).toBe(5);
  });
});

describe("effectiveProfile", () => {
  it("returns the site override when present", async () => {
    const state = await loadState();
    const override = { ...DEFAULT_RANDOM_PROFILE, length: 24 } as const;
    const next = { ...state, sites: { "example.com": override } };
    expect(effectiveProfile(next, "example.com")).toEqual(override);
  });

  it("falls back to the default profile", async () => {
    const state = await loadState();
    expect(effectiveProfile(state, "unknown.com")).toEqual(state.defaultProfile);
  });
});

describe("wipeAll", () => {
  it("removes everything", async () => {
    await saveState({
      schemaVersion: SCHEMA_VERSION,
      defaultProfile: DEFAULT_RANDOM_PROFILE,
      autoLockMinutes: 15,
      fingerprint: "x",
      sites: {},
    });
    await wipeAll();
    const state = await loadState();
    expect(state.fingerprint).toBeUndefined();
  });
});
