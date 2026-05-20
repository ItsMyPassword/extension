import { expect, test } from "./fixtures.js";

test("badge is injected next to password fields on a real http origin", async ({
  context,
  extensionId,
  fixtureServer,
}) => {
  // Set up the extension first so the badge has a fingerprint to work with.
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.getByLabel("Master password").fill("a-very-long-master-pass");
  await popup.getByLabel("Confirm").fill("a-very-long-master-pass");
  await popup.getByRole("button", { name: "Create" }).click();
  await expect(popup.getByRole("button", { name: "Lock" })).toBeVisible({ timeout: 30_000 });
  await popup.close();

  const tab = await context.newPage();
  await tab.goto(fixtureServer.url);

  await expect(tab.locator("itsmypassword-badge")).toBeAttached({ timeout: 15_000 });
});
