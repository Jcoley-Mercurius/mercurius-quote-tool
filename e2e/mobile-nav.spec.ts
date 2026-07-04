import { test, expect } from "@playwright/test";
import { hasE2eLoginCredentials, isSupabaseConfigured } from "./helpers/env";
import { loginWithTestUser } from "./helpers/auth";

test.describe("Mobile navigation", () => {
  test.skip(
    !isSupabaseConfigured() || !hasE2eLoginCredentials(),
    "Requires Supabase and E2E_USER_EMAIL / E2E_USER_PASSWORD."
  );

  test.beforeEach(async ({ page }) => {
    await loginWithTestUser(page);
  });

  test("hamburger menu opens, closes, and navigates", async ({ page }) => {
    const menuToggle = page.getByRole("button", { name: "Open menu" });
    await expect(menuToggle).toBeVisible();

    await menuToggle.click();
    const drawer = page.getByRole("dialog", { name: "Navigation menu" });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("link", { name: "History" })).toBeVisible();

    await page.getByRole("button", { name: "Close menu", expanded: true }).click();
    await expect(drawer).not.toBeVisible();

    await menuToggle.click();
    await drawer.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL("/settings");
    await expect(page.getByRole("heading", { name: "Vendor Profile" })).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Navigation menu" })).not.toBeVisible();
  });

  test("drawer closes when the backdrop is clicked", async ({ page }) => {
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("dialog", { name: "Navigation menu" })).toBeVisible();

    await page.locator("button.fixed.inset-0").click();
    await expect(page.getByRole("dialog", { name: "Navigation menu" })).not.toBeVisible();
  });
});