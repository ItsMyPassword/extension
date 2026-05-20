import { describe, expect, it } from "vitest";
import { isRequest } from "../src/shared/messages.js";

describe("isRequest", () => {
  it("accepts well-formed messages", () => {
    expect(isRequest({ kind: "status" })).toBe(true);
    expect(isRequest({ kind: "unlock", master: "x" })).toBe(true);
    expect(isRequest({ kind: "generate", domain: "x", email: "y" })).toBe(true);
  });

  it("rejects malformed messages", () => {
    expect(isRequest(null)).toBe(false);
    expect(isRequest(undefined)).toBe(false);
    expect(isRequest("status")).toBe(false);
    expect(isRequest({})).toBe(false);
    expect(isRequest({ kind: 42 })).toBe(false);
  });
});
