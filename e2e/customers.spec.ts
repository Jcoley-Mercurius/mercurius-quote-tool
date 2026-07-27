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

  test.describe("PR5.3 maintenance fixtures", () => {
    const customerId = process.env.E2E_CUSTOMER_ID;
    test.skip(!customerId, "Requires E2E_CUSTOMER_ID in a disposable seeded workspace.");

    test("edits a customer with keyboard-accessible dialog semantics", async ({ page }) => {
      await page.goto(`/customers/${customerId}`);
      await page.getByRole("button", { name: "Edit customer" }).click();
      const dialog = page.getByRole("dialog", { name: "Edit customer" });
      await expect(dialog).toBeVisible();
      await dialog.getByLabel("Company").fill("E2E Fixture Company");
      await dialog.getByRole("button", { name: "Save changes" }).click();
      await expect(page.getByText("E2E Fixture Company")).toBeVisible();
    });

    test("archive and restore preserve direct detail access at 320px", async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 720 });
      await page.goto(`/customers/${customerId}`);
      await page.getByRole("button", { name: "Archive" }).click();
      const archive = page.getByRole("dialog", { name: "Archive customer?" });
      await archive.getByLabel("Reason (optional)").fill("E2E reversible archive");
      await archive.getByRole("button", { name: "Archive customer" }).click();
      await expect(page.getByRole("button", { name: "Restore customer" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth >
        document.documentElement.clientWidth)).toBe(false);
      await page.getByRole("button", { name: "Restore customer" }).click();
      await page.getByRole("dialog", { name: "Restore customer?" })
        .getByRole("button", { name: "Restore customer" }).click();
      await expect(page.getByRole("button", { name: "Edit customer" })).toBeVisible();
    });
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
