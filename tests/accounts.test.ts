import { beforeEach, describe, expect, it } from "vitest";
import { installChromeMock } from "./helpers/chrome-mock.js";
import {
  deleteAccount,
  listAccounts,
  recordAccount,
  wipeAccounts,
} from "../src/background/accounts.js";

const MASTER = "correct horse battery staple";

const mock = installChromeMock();

beforeEach(() => {
  mock.reset();
});

describe("accounts CRUD", () => {
  it("returns an empty list when nothing has been recorded", async () => {
    const entries = await listAccounts(MASTER);
    expect(entries).toEqual([]);
  });

  it("records and reads back an entry", async () => {
    await recordAccount(MASTER, "example.com", "alice@example.com");
    const entries = await listAccounts(MASTER);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      domain: "example.com",
      username: "alice@example.com",
    });
    expect(entries[0]!.createdAt).toBeGreaterThan(0);
    expect(entries[0]!.lastUsedAt).toBe(entries[0]!.createdAt);
  });
});

describe("accounts dedup + delete", () => {
  it("re-recording the same (domain, username) just bumps lastUsedAt", async () => {
    await recordAccount(MASTER, "example.com", "alice@example.com");
    const first = (await listAccounts(MASTER))[0]!;
    await new Promise((r) => setTimeout(r, 5));
    await recordAccount(MASTER, "example.com", "alice@example.com");
    const second = (await listAccounts(MASTER))[0]!;
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.lastUsedAt).toBeGreaterThanOrEqual(first.lastUsedAt);
    expect(await listAccounts(MASTER)).toHaveLength(1);
  });

  it("filters by domain when requested", async () => {
    await recordAccount(MASTER, "a.com", "x@x.com");
    await recordAccount(MASTER, "b.com", "y@y.com");
    expect(await listAccounts(MASTER, "a.com")).toHaveLength(1);
    expect(await listAccounts(MASTER, "missing.com")).toEqual([]);
  });

  it("deletes a single entry without touching the others", async () => {
    await recordAccount(MASTER, "a.com", "x@x.com");
    await recordAccount(MASTER, "a.com", "z@z.com");
    await deleteAccount(MASTER, "a.com", "x@x.com");
    const entries = await listAccounts(MASTER);
    expect(entries.map((e) => e.username)).toEqual(["z@z.com"]);
  });

  it("wipeAccounts removes the cipher blob", async () => {
    await recordAccount(MASTER, "a.com", "x@x.com");
    const cleared = await wipeAccounts();
    expect(cleared).toBe(1);
    expect(await listAccounts(MASTER)).toEqual([]);
  });
});
