import { test, expect } from "@playwright/test";
import { hasE2eLoginCredentials, isSupabaseConfigured } from "./helpers/env";
import { expectToast, loginWithTestUser } from "./helpers/auth";
import { fillBasicQuoteForm, submitQuoteForm } from "./helpers/quote-form";

test.describe("Quote generation", () => {
  test.skip(
    !isSupabaseConfigured() || !hasE2eLoginCredentials(),
    "Requires Supabase and E2E_USER_EMAIL / E2E_USER_PASSWORD."
  );

  test.beforeEach(async ({ page }) => {
    await loginWithTestUser(page);
  });

  test("user can generate a quote and see it in history", async ({ page }) => {
    const jobDescription =
      "E2E smoke test: replace 3-ton AC unit on 1987 Cape Coral pool home.";

    await fillBasicQuoteForm(page, jobDescription);
    await submitQuoteForm(page);

    await expectToast(page, "Quote generated and saved.");
    await expect(page.getByRole("heading", { name: "Line Items" })).toBeVisible();
    await expect(page).toHaveURL(/quoteId=/);

    await page.goto("/quotes");
    await expect(page.getByRole("heading", { name: "Quote History" })).toBeVisible();
    await expect(page.getByText(jobDescription)).toBeVisible();
  });
});