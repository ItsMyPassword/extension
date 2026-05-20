import { describe, expect, it } from "vitest";
import { registrableDomain } from "../src/shared/domain.js";

describe("registrableDomain", () => {
  it("returns the registrable domain for a normal URL", () => {
    expect(registrableDomain("https://accounts.google.com/signin")).toBe("google.com");
    expect(registrableDomain("https://www.example.com")).toBe("example.com");
    expect(registrableDomain("https://example.com")).toBe("example.com");
  });

  it("handles multi-label public suffixes", () => {
    expect(registrableDomain("https://www.example.co.uk")).toBe("example.co.uk");
    expect(registrableDomain("https://blog.example.com.au")).toBe("example.com.au");
  });

  it("returns null for non-web URLs", () => {
    expect(registrableDomain("chrome://extensions")).toBeNull();
    expect(registrableDomain("about:blank")).toBeNull();
    expect(registrableDomain("file:///home/me/page.html")).toBeNull();
  });

  it("returns null for localhost and IP addresses", () => {
    expect(registrableDomain("http://localhost:3000")).toBeNull();
    expect(registrableDomain("http://127.0.0.1")).toBeNull();
    expect(registrableDomain("http://192.168.1.1")).toBeNull();
  });

  it("returns null for empty or non-string inputs", () => {
    expect(registrableDomain("")).toBeNull();
    expect(registrableDomain(undefined as unknown as string)).toBeNull();
  });

  it("lowercases the result", () => {
    expect(registrableDomain("https://WWW.EXAMPLE.COM")).toBe("example.com");
  });
});
