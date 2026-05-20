import { expect, test } from "./fixtures.js";

test.describe("popup setup, lock and unlock", () => {
  test("first-run shows setup, then transitions to the main screen", async ({
    context,
    extensionId,
  }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();

    await page.getByLabel("Master password").fill("a-very-long-master-pass");
    await page.getByLabel("Confirm").fill("a-very-long-master-pass");
    await page.getByRole("button", { name: "Create" }).click();

    await expect(page.locator(".header__title strong")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "Lock" })).toBeVisible();
  });

  test("lock then unlock with the master password preserves the fingerprint", async ({
    context,
    extensionId,
  }) => {
    const setup = await context.newPage();
    await setup.goto(`chrome-extension://${extensionId}/popup.html`);
    await setup.getByLabel("Master password").fill("a-very-long-master-pass");
    await setup.getByLabel("Confirm").fill("a-very-long-master-pass");
    await setup.getByRole("button", { name: "Create" }).click();
    await expect(setup.getByRole("button", { name: "Lock" })).toBeVisible({ timeout: 30_000 });
    const fingerprint = await setup.locator(".fingerprint__value").first().textContent();
    await setup.getByRole("button", { name: "Lock" }).click();
    await setup.close();

    const unlock = await context.newPage();
    await unlock.goto(`chrome-extension://${extensionId}/popup.html`);
    await expect(unlock.getByRole("heading", { name: "Unlock" })).toBeVisible();
    await expect(unlock.locator(".fingerprint__value").first()).toHaveText(fingerprint ?? "");

    await unlock.getByLabel("Master password").fill("a-very-long-master-pass");
    await unlock.getByRole("button", { name: "Unlock" }).click();
    await expect(unlock.getByRole("button", { name: "Lock" })).toBeVisible({ timeout: 30_000 });
  });
});
