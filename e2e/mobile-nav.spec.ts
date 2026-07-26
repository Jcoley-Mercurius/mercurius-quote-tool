import { test, expect } from "@playwright/test";
import {
  E2E_OPPORTUNITY_ID,
  hasE2eLoginCredentials,
  isSupabaseConfigured,
} from "./helpers/env";
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
    await expect(drawer.getByRole("link", { name: /Business Command Center/ })).toBeVisible();
    await expect(drawer.getByRole("link", { name: /Quotes/ })).toBeVisible();

    await page.getByRole("button", { name: "Close menu", expanded: true }).click();
    await expect(drawer).not.toBeVisible();

    await menuToggle.click();
    await drawer.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL("/settings");
    await expect(page.getByRole("heading", { name: "Vendor Profile" })).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Navigation menu" })).not.toBeVisible();
  });

  test("command center fits a narrow viewport", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto("/command-center");
    await expect(page.getByRole("heading", { name: /Good |Welcome/ })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflow).toBe(false);
  });

  test("drawer closes when the backdrop is clicked", async ({ page }) => {
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("dialog", { name: "Navigation menu" })).toBeVisible();

    await page.locator("button.fixed.inset-0").click();
    await expect(page.getByRole("dialog", { name: "Navigation menu" })).not.toBeVisible();
  });

  test("Escape closes the drawer and restores focus", async ({ page }) => {
    const menuToggle = page.getByRole("button", { name: "Open menu" });
    await menuToggle.focus();
    await menuToggle.click();
    await expect(page.getByRole("dialog", { name: "Navigation menu" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Navigation menu" })).not.toBeVisible();
    await expect(menuToggle).toBeFocused();
  });

  test("opportunity pages fit and remain usable at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto("/opportunities");
    await expect(page.getByRole("heading", { name: "Opportunities" })).toBeVisible();
    await expect(page.getByLabel("Status")).toBeVisible();
    await expect(page.getByLabel("Source")).toBeVisible();
    await expect(page.getByLabel("Assignment")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflow).toBe(false);
  });

  test("seeded detail and quote context wrap at phone width", async ({ page }) => {
    test.skip(
      !E2E_OPPORTUNITY_ID,
      "Set E2E_OPPORTUNITY_ID to a visible seeded opportunity."
    );
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto(`/opportunities/${E2E_OPPORTUNITY_ID}`);
    await expect(page.getByRole("link", { name: "Create Quote" })).toBeVisible();
    expect(await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )).toBe(false);
    await page.getByRole("link", { name: "Create Quote" }).click();
    await expect(page.getByText(/^Creating a quote for /)).toBeVisible();
    expect(await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )).toBe(false);
  });
});
