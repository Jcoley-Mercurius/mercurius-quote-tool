import { expect, test } from "@playwright/test";
import { loginWithTestUser } from "./helpers/auth";
import {
  hasE2eLoginCredentials,
  isSupabaseConfigured,
} from "./helpers/env";

test.describe("Customer CRM", () => {
  test.skip(
    !isSupabaseConfigured() || !hasE2eLoginCredentials(),
    "Requires disposable Supabase customer fixtures and E2E login credentials."
  );

  test.beforeEach(async ({ page }) => {
    await loginWithTestUser(page);
  });

  test("directory search stays out of the URL and fits supported widths", async ({ page }) => {
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/customers");
      await expect(page.getByRole("heading", { name: "Customers" })).toBeVisible();
      await page.getByLabel("Search customers").fill("fixture customer");
      await expect(page).toHaveURL("/customers");
      expect(await page.evaluate(
        () => document.documentElement.scrollWidth >
          document.documentElement.clientWidth
      )).toBe(false);
    }
  });

  test("invalid and hidden customer IDs use the safe not-found state", async ({ page }) => {
    await page.goto("/customers/not-a-uuid");
    await expect(page.getByRole("heading", {
      name: "Customer not found",
    })).toBeVisible();
    await page.goto("/customers/00000000-0000-4000-8000-000000000000");
    await expect(page.getByRole("heading", {
      name: "Customer not found",
    })).toBeVisible();
  });
});
