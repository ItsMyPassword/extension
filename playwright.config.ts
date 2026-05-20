import { defineConfig } from "@playwright/test";

/**
 * Playwright config for end-to-end tests against the built Chrome extension.
 *
 * The tests load `.output/chrome-mv3` via Chromium's `--load-extension`
 * flag, so they verify the actual built bundle — not a re-bundled test copy.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    actionTimeout: 10_000,
    trace: process.env.CI ? "retain-on-failure" : "off",
  },
});
