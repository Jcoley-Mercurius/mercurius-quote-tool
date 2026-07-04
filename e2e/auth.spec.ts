import { test, expect } from "@playwright/test";
import {
  E2E_SIGNUP_PASSWORD,
  hasE2eLoginCredentials,
  isSupabaseConfigured,
} from "./helpers/env";
import {
  expectToast,
  loginWithTestUser,
  signUpNewUser,
} from "./helpers/auth";

test.describe("Authentication", () => {
  test.skip(
    !isSupabaseConfigured(),
    "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to run auth E2E tests."
  );

  test("user can sign up and see the new user welcome toast", async ({ page }) => {
    const email = `e2e-${Date.now()}@mercurius-e2e.test`;

    await signUpNewUser(page, email, E2E_SIGNUP_PASSWORD);

    const signedInToast = page.getByText("Account created! You're signed in.");
    const confirmEmailToast = page.getByText(
      "Account created! Check your email to confirm, then sign in."
    );

    await expect(signedInToast.or(confirmEmailToast)).toBeVisible();

    if (await signedInToast.isVisible()) {
      await page.waitForURL("/");
      await expectToast(page, "Welcome to Mercurius! Your account has been created.");
    } else {
      await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    }
  });

  test("user can log in successfully", async ({ page }) => {
    test.skip(
      !hasE2eLoginCredentials(),
      "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run login E2E tests."
    );

    await loginWithTestUser(page);
    await expect(page.getByRole("navigation")).toBeVisible();
    await expect(page.getByRole("link", { name: "History" })).toBeVisible();
  });
});