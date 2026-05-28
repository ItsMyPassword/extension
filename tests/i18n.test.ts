import { describe, it, expect, vi, afterEach } from "vitest";

import { t, currentLocale } from "../src/shared/i18n.js";

function setChrome(value: unknown): void {
  (globalThis as unknown as { chrome: unknown }).chrome = value;
}

afterEach(() => {
  setChrome(undefined);
});

describe("t", () => {
  it("returns the key unchanged when chrome is unavailable", () => {
    setChrome(undefined);
    expect(t("popup_title")).toBe("popup_title");
  });

  it("returns the key unchanged when chrome.i18n is missing", () => {
    setChrome({});
    expect(t("popup_title")).toBe("popup_title");
  });

  it("returns the resolved message and forwards substitutions", () => {
    const getMessage = vi.fn((key: string, subs: string[]) =>
      key === "greeting" ? `Hello ${subs[0]}` : "",
    );
    setChrome({ i18n: { getMessage } });
    expect(t("greeting", "Ada")).toBe("Hello Ada");
    expect(getMessage).toHaveBeenCalledWith("greeting", ["Ada"]);
  });

  it("falls back to the key when getMessage returns an empty string", () => {
    setChrome({ i18n: { getMessage: () => "" } });
    expect(t("missing_key")).toBe("missing_key");
  });
});

describe("currentLocale", () => {
  it("returns 'en' when chrome is unavailable", () => {
    setChrome(undefined);
    expect(currentLocale()).toBe("en");
  });

  it("returns 'en' when chrome.i18n is missing", () => {
    setChrome({});
    expect(currentLocale()).toBe("en");
  });

  it("returns the browser UI language when available", () => {
    setChrome({ i18n: { getUILanguage: () => "fr" } });
    expect(currentLocale()).toBe("fr");
  });
});
