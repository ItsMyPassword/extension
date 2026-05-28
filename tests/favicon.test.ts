import { describe, it, expect, afterEach } from "vitest";

import { faviconUrl } from "../src/shared/favicon.js";

function setChrome(value: unknown): void {
  (globalThis as unknown as { chrome: unknown }).chrome = value;
}

afterEach(() => {
  setChrome(undefined);
});

describe("faviconUrl", () => {
  it("returns null when chrome is unavailable", () => {
    setChrome(undefined);
    expect(faviconUrl("example.com")).toBeNull();
  });

  it("returns null when chrome.runtime is missing", () => {
    setChrome({});
    expect(faviconUrl("example.com")).toBeNull();
  });

  it("returns null when chrome.runtime.getURL is missing", () => {
    setChrome({ runtime: {} });
    expect(faviconUrl("example.com")).toBeNull();
  });

  it("builds a _favicon URL with the default size and an encoded https page URL", () => {
    setChrome({ runtime: { getURL: (path: string) => `chrome-extension://abc/${path}` } });
    expect(faviconUrl("example.com")).toBe(
      "chrome-extension://abc/_favicon/?pageUrl=https%3A%2F%2Fexample.com&size=32",
    );
  });

  it("honours a custom size", () => {
    setChrome({ runtime: { getURL: (path: string) => path } });
    expect(faviconUrl("sub.example.org", 64)).toBe(
      "_favicon/?pageUrl=https%3A%2F%2Fsub.example.org&size=64",
    );
  });
});
