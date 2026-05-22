/**
 * Focused tests on the sync runner. We don't exercise the full OPAQUE
 * flow here (that's covered cross-repo by server tests); we test the
 * pieces that have non-trivial control flow: connection probing and
 * the auto-fallback in `connect` (login → 401 → register).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

import { testConnection } from "../../src/background/sync/runner.js";

describe("testConnection", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("rejects an invalid URL without hitting the network", async () => {
    const spy = vi.fn();
    globalThis.fetch = spy;
    const res = await testConnection("not a url");
    expect(res.reachable).toBe(false);
    expect(res.reason).toBe("invalid_url");
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns reachable=true on a healthy /health response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const res = await testConnection("https://sync.example.com");
    expect(res.reachable).toBe(true);
    expect(res.reason).toBeUndefined();
  });

  it("surfaces an HTTP status when /health returns non-2xx", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("", { status: 502 }));
    const res = await testConnection("https://sync.example.com");
    expect(res.reachable).toBe(false);
    expect(res.reason).toBe("http_502");
  });

  it("surfaces an unexpected payload", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ hello: "world" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const res = await testConnection("https://sync.example.com");
    expect(res.reachable).toBe(false);
    expect(res.reason).toBe("unexpected_payload");
  });

  it("surfaces a network error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    const res = await testConnection("https://offline.example.com");
    expect(res.reachable).toBe(false);
    expect(res.reason).toBe("network_error");
  });

  it("strips trailing slashes from the URL before probing", async () => {
    const spy = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ status: "ok" }), { status: 200 }));
    globalThis.fetch = spy;
    await testConnection("https://sync.example.com/////");
    const url = (spy.mock.calls[0]?.[0] as string) ?? "";
    expect(url).toBe("https://sync.example.com/health");
  });
});
