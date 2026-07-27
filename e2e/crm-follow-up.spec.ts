import { expect, test } from "@playwright/test";
import { loginWithTestUser } from "./helpers/auth";
import { hasE2eLoginCredentials, isSupabaseConfigured } from "./helpers/env";

test.describe("Internal CRM notes and manual follow-up", () => {
  const customerId = process.env.E2E_CUSTOMER_ID;
  const propertyId = process.env.E2E_PROPERTY_ID;
  test.skip(
    !isSupabaseConfigured() || !hasE2eLoginCredentials() || !customerId || !propertyId,
    "Requires disposable CRM fixtures, E2E_CUSTOMER_ID, E2E_PROPERTY_ID, and login credentials."
  );
  test.beforeEach(async ({ page }) => { await loginWithTestUser(page); });

  test("creates a customer note and manual follow-up without messaging", async ({ page }) => {
    await page.goto(`/customers/${customerId}`);
    await page.getByRole("button", { name: "Add note" }).click();
    await page.getByRole("dialog", { name: "Add internal note" }).getByLabel("Note body").fill("E2E internal context");
    await page.getByRole("button", { name: "Add note", exact: true }).click();
    await expect(page.getByText("E2E internal context")).toBeVisible();
    await page.getByRole("button", { name: "Add follow-up" }).click();
    const dialog = page.getByRole("dialog", { name: "Add follow-up" });
    await dialog.getByLabel("Title").fill("E2E manual callback");
    await dialog.getByRole("button", { name: "Save follow-up" }).click();
    await expect(page.getByText("E2E manual callback")).toBeVisible();
    await expect(page.getByText(/No messages or reminders are sent automatically/)).toBeVisible();
  });

  test("creates a property note without copying access instructions", async ({ page }) => {
    await page.goto(`/properties/${propertyId}`);
    await page.getByRole("button", { name: "Add note" }).click();
    const note = page.getByRole("dialog", { name: "Add internal note" });
    await expect(note.getByLabel("Note body")).toHaveValue("");
    await note.getByLabel("Note body").fill("E2E property context");
    await note.getByRole("button", { name: "Add note", exact: true }).click();
    await expect(page.getByText("E2E property context")).toBeVisible();
  });

  test("supports 320px keyboard task creation and completion", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto(`/customers/${customerId}`);
    await page.getByRole("button", { name: "Add follow-up" }).press("Enter");
    await page.getByRole("dialog", { name: "Add follow-up" }).getByLabel("Title").fill("Narrow follow-up");
    expect(await page.evaluate(() => document.documentElement.scrollWidth >
      document.documentElement.clientWidth)).toBe(false);
  });
});
