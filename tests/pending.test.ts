import { beforeEach, describe, expect, it, vi } from "vitest";
import { installChromeMock } from "./helpers/chrome-mock.js";
import { clearPendingSave, getPendingSave, setPendingSave } from "../src/background/pending.js";

const mock = installChromeMock();

beforeEach(() => {
  mock.reset();
  vi.useRealTimers();
});

describe("pending save store", () => {
  it("returns null when no pending entry exists", async () => {
    expect(await getPendingSave("example.com")).toBeNull();
  });

  it("round-trips a pending entry", async () => {
    await setPendingSave("example.com", "alice@example.com");
    expect(await getPendingSave("example.com")).toEqual({ username: "alice@example.com" });
  });

  it("scopes entries by domain", async () => {
    await setPendingSave("a.com", "alice@a.com");
    await setPendingSave("b.com", "bob@b.com");
    expect(await getPendingSave("a.com")).toEqual({ username: "alice@a.com" });
    expect(await getPendingSave("b.com")).toEqual({ username: "bob@b.com" });
    expect(await getPendingSave("c.com")).toBeNull();
  });

  it("clear removes the entry", async () => {
    await setPendingSave("a.com", "x@x.com");
    await clearPendingSave("a.com");
    expect(await getPendingSave("a.com")).toBeNull();
  });

  it("clear is a no-op when nothing matches", async () => {
    await clearPendingSave("a.com");
    expect(await getPendingSave("a.com")).toBeNull();
  });

  it("expires entries older than the TTL", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    await setPendingSave("a.com", "x@x.com");
    expect(await getPendingSave("a.com")).not.toBeNull();
    // TTL is 5 minutes; jump 6 minutes ahead.
    vi.setSystemTime(new Date("2026-01-01T00:06:00Z"));
    expect(await getPendingSave("a.com")).toBeNull();
  });
});
