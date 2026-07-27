import { expect, test } from "@playwright/test";
import { loginWithTestUser } from "./helpers/auth";
import { hasE2eLoginCredentials, isSupabaseConfigured } from "./helpers/env";

test.describe("Property Detail", () => {
  const propertyId = process.env.E2E_PROPERTY_ID;
  test.skip(
    !isSupabaseConfigured() || !hasE2eLoginCredentials() || !propertyId,
    "Requires disposable Supabase property fixtures, E2E_PROPERTY_ID, and login credentials."
  );
  test.beforeEach(async ({ page }) => { await loginWithTestUser(page); });

  test("opens from Customer Detail without exposing private instructions on the card", async ({ page }) => {
    const customerId = process.env.E2E_CUSTOMER_ID;
    test.skip(!customerId, "Requires E2E_CUSTOMER_ID associated with E2E_PROPERTY_ID.");
    await page.goto(`/customers/${customerId}`);
    const propertyLink = page.locator(`a[href="/properties/${propertyId}"]`);
    await expect(propertyLink).toBeVisible();
    await expect(page.getByText("Private access instructions")).toHaveCount(0);
    await propertyLink.click();
    await expect(page.getByRole("heading", { name: "Private access instructions" })).toBeVisible();
  });

  test("edits operational data with an accessible keyboard dialog", async ({ page }) => {
    await page.goto(`/properties/${propertyId}`);
    await page.getByRole("button", { name: "Edit property" }).click();
    const dialog = page.getByRole("dialog", { name: "Edit property" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Property summary (optional)").fill("E2E property summary");
    await dialog.getByRole("button", { name: "Save property" }).click();
    await expect(page.getByText("E2E property summary")).toBeVisible();
  });

  test("fits private detail and editing at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto(`/properties/${propertyId}`);
    await page.getByRole("button", { name: "Edit property" }).click();
    expect(await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    )).toBe(false);
  });
});
