import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures.js";

// Regression for the in-popup lock→unlock transition: enabling a PIN and
// then locking from within the open popup (without reopening it) must still
// surface the PIN tab on the unlock screen. The e2e Chromium renders the
// extension UI in French, so selectors use French labels.
const HEADER_ACTION = "header button[aria-label]";
const MASTER = "a-very-long-master-pass";
const PIN = "135790";

async function completeSetup(page: Page): Promise<void> {
  const pw = page.locator('input[type="password"]');
  await pw.nth(0).fill(MASTER);
  await pw.nth(1).fill(MASTER);
  await page.locator('button[type="submit"]').click();
  await page.locator("button.btn-ghost").click(); // skip history opt-in
  await expect(page.locator(HEADER_ACTION).first()).toBeVisible({ timeout: 30_000 });
}

async function enablePin(page: Page): Promise<void> {
  await page.locator('header button[aria-label="Paramètres"]').click();
  await page.locator("button", { hasText: "Sécurité" }).click();
  await page.locator("button", { hasText: "Activer le PIN" }).click();
  // PIN field is the password-typed mono input (auto-lock field is number).
  await page.locator('input[type="password"].input-mono').fill(PIN);
  await page.locator("button", { hasText: "Activer le PIN" }).click();
  await expect(page.getByText("Le PIN est actif")).toBeVisible({ timeout: 10_000 });
  // Back out: sub-page → settings menu → main.
  await page.locator('header button[aria-label="Retour"]').click();
  await page.locator('header button[aria-label="Retour"]').click();
  await expect(page.locator('header button[aria-label="Verrouiller"]')).toBeVisible({
    timeout: 15_000,
  });
}

test("locking in-popup after enabling a PIN keeps the PIN tab on unlock", async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await completeSetup(page);
  await enablePin(page);

  // Lock from within the SAME popup — no reopen.
  await page.locator('header button[aria-label="Verrouiller"]').click();

  // The unlock screen must default to the PIN tab.
  const pinTab = page.locator('[role="tab"]', { hasText: "Code PIN" });
  await expect(pinTab).toBeVisible({ timeout: 15_000 });
  await expect(pinTab).toHaveAttribute("aria-pressed", "true");

  // And the PIN actually unlocks from this same in-popup flow.
  await page.locator('input[type="password"].input-mono').fill(PIN);
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('header button[aria-label="Verrouiller"]')).toBeVisible({
    timeout: 30_000,
  });
});
