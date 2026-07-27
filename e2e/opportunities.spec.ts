import { expect, test, type Page } from "@playwright/test";
import { loginWithTestUser } from "./helpers/auth";
import {
  E2E_ALLOW_MUTATIONS,
  E2E_ASSIGNMENT_TARGET_USER_ID,
  E2E_CROSS_WORKSPACE_OPPORTUNITY_ID,
  E2E_DIRECT_OPPORTUNITY_ID,
  E2E_LINKED_QUOTE_ID,
  E2E_MEMBER_OPPORTUNITY_ID,
  E2E_OPPORTUNITY_ID,
  E2E_PERSONAL_OPPORTUNITY_ID,
  E2E_PUBLIC_QUOTE_TOKEN,
  hasE2eLoginCredentials,
  isSupabaseConfigured,
} from "./helpers/env";
import { fillBasicQuoteForm, submitQuoteForm } from "./helpers/quote-form";

const canAuthenticate = isSupabaseConfigured() && hasE2eLoginCredentials();

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(overflow).toBe(false);
}

test.describe("Opportunity workspace", () => {
  test.skip(
    !canAuthenticate,
    "Requires Supabase and E2E_USER_EMAIL / E2E_USER_PASSWORD."
  );

  test.beforeEach(async ({ page }) => {
    await loginWithTestUser(page);
  });

  test("list filters are accessible and URL state fails safely", async ({ page }) => {
    await page.goto(
      "/opportunities?status=unknown&origin=unknown&assignment=unknown&page=-8"
    );
    await expect(page.getByRole("heading", { name: "Opportunities" })).toBeVisible();
    await expect(page.getByLabel("Status")).toHaveValue("active");
    await expect(page.getByLabel("Source")).toHaveValue("all");
    await expect(page.getByLabel("Assignment")).toHaveValue("all");

    await page.getByLabel("Status").selectOption("all");
    await expect(page).toHaveURL(/status=all/);
    await expect(page).not.toHaveURL(/page=/);
    await page.getByLabel("Source").selectOption("marketplace");
    await expect(page).toHaveURL(/origin=marketplace/);
    await page.getByLabel("Assignment").selectOption("unassigned");
    await expect(page).toHaveURL(/assignment=unassigned/);
    await page.getByLabel("Assignment").selectOption("mine");
    await expect(page).toHaveURL(/assignment=mine/);
    await expect(page).not.toHaveURL(/user-owner|[0-9a-f]{8}-[0-9a-f-]{27,}/i);
    await expectNoHorizontalOverflow(page);
  });

  test("assignment filter survives Detail navigation and browser back", async ({ page }) => {
    await page.goto("/opportunities?status=all&assignment=mine");
    const opportunityLink = page.getByRole("link", {
      name: /^View opportunity:/,
    }).first();
    test.skip(
      !(await opportunityLink.isVisible()),
      "Requires an opportunity assigned to the authenticated E2E user."
    );
    await opportunityLink.click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL("/opportunities?status=all&assignment=mine");
    await expect(page.getByLabel("Assignment")).toHaveValue("mine");
  });

  test("Command Center unassigned priority opens the filtered list", async ({ page }) => {
    await page.goto("/command-center");
    const link = page.getByRole("link", {
      name: /Unassigned opportunities/i,
    });
    await expect(link).toHaveAttribute(
      "href",
      "/opportunities?assignment=unassigned"
    );
  });

  test("list renders either records or the honest initial empty state", async ({ page }) => {
    await page.goto("/opportunities?status=all");
    await expect(page.getByRole("heading", { name: "Opportunities" })).toBeVisible();
    const resultLink = page.getByRole("link", { name: /^View opportunity:/ }).first();
    const empty = page.getByText("No opportunities yet");
    await expect(resultLink.or(empty)).toBeVisible();

    const previous = page.getByRole("button", { name: "Previous" });
    if (await previous.isVisible()) {
      await expect(previous).toBeDisabled();
      await expect(page.getByText(/^Showing \d+–\d+ of \d+$/)).toBeVisible();
    }
  });

  test("pagination preserves filters when a next page fixture exists", async ({ page }) => {
    await page.goto("/opportunities?status=all&origin=marketplace");
    const next = page.getByRole("button", { name: "Next" });
    test.skip(
      !(await next.isVisible()) || await next.isDisabled(),
      "Requires more than one page of Marketplace opportunity fixtures."
    );
    await next.click();
    await expect(page).toHaveURL(/status=all/);
    await expect(page).toHaveURL(/origin=marketplace/);
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByRole("button", { name: "Previous" })).toBeEnabled();
  });

  test("invalid and nonexistent detail IDs use the safe not-found state", async ({ page }) => {
    await page.goto("/opportunities/not-a-uuid?organizationId=untrusted");
    await expect(page.getByRole("heading", { name: "Opportunity not found" })).toBeVisible();
    await expect(page.getByText(/unavailable in the active workspace/i)).toBeVisible();
    await expect(page.getByText("untrusted")).not.toBeVisible();

    await page.goto("/opportunities/00000000-0000-4000-8000-000000000000");
    await expect(page.getByRole("heading", { name: "Opportunity not found" })).toBeVisible();
  });

  test("cross-workspace IDs remain indistinguishable", async ({ page }) => {
    test.skip(
      !E2E_CROSS_WORKSPACE_OPPORTUNITY_ID,
      "Set E2E_CROSS_WORKSPACE_OPPORTUNITY_ID to a record hidden from the test user's active workspace."
    );
    await page.goto(`/opportunities/${E2E_CROSS_WORKSPACE_OPPORTUNITY_ID}`);
    await expect(page.getByRole("heading", { name: "Opportunity not found" })).toBeVisible();
    await expect(page.getByText(E2E_CROSS_WORKSPACE_OPPORTUNITY_ID)).not.toBeVisible();
  });

  test("seeded opportunity supports list, detail, and quote-prefill navigation", async ({ page }) => {
    test.skip(
      !E2E_OPPORTUNITY_ID,
      "Set E2E_OPPORTUNITY_ID to a visible seeded opportunity."
    );
    await page.goto("/opportunities?status=all&origin=all");
    const opportunityLink = page.locator(
      `a[href="/opportunities/${E2E_OPPORTUNITY_ID}"]`
    );
    await expect(opportunityLink).toBeVisible();
    await opportunityLink.click();
    await expect(page).toHaveURL(`/opportunities/${E2E_OPPORTUNITY_ID}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    for (const heading of [
      "Request overview",
      "Customer",
      "Property",
      "Assignment",
      "Activity timeline",
      "Linked quotes",
    ]) {
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    }
    await expect(page.getByText(/source:/i).first()).toBeVisible();
    await expect(page.getByText(/status:/i).first()).toBeVisible();
    await expect(page.getByText(/source_snapshot|marketplaceLeadId|marketplaceRequestId/i)).not.toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL("/opportunities?status=all&origin=all");
    await expect(opportunityLink).toBeVisible();
    await opportunityLink.click();
    await page.getByRole("link", { name: "Create Quote" }).click();
    await expect(page).toHaveURL(new RegExp(`opportunityId=${E2E_OPPORTUNITY_ID}`));
    await expect(page.getByText(/^Creating a quote for /)).toBeVisible();
    await expect(page.getByText(/will be saved to the .* workspace/i)).toBeVisible();
    await expect(page.getByText("Save quote to")).not.toBeVisible();
    await expect(page.getByRole("link", { name: "Back to opportunity" })).toHaveAttribute(
      "href",
      `/opportunities/${E2E_OPPORTUNITY_ID}`
    );
  });

  test("personal opportunity shows You without assignment controls", async ({ page }) => {
    test.skip(
      !E2E_PERSONAL_OPPORTUNITY_ID,
      "Set E2E_PERSONAL_OPPORTUNITY_ID to a visible personal opportunity."
    );
    await page.goto(`/opportunities/${E2E_PERSONAL_OPPORTUNITY_ID}`);
    await expect(page.getByRole("heading", { name: "Assignment" })).toBeVisible();
    await expect(page.getByText("You", { exact: true })).toBeVisible();
    await expect(page.getByRole("combobox", {
      name: "Assign opportunity",
    })).not.toBeVisible();
    await expect(page.getByRole("button", {
      name: "Assign to me",
    })).not.toBeVisible();
  });

  test("owner or admin assignment appears once in the timeline", async ({ page }) => {
    test.skip(
      !E2E_ALLOW_MUTATIONS ||
      !E2E_OPPORTUNITY_ID ||
      !E2E_ASSIGNMENT_TARGET_USER_ID,
      "Requires mutation opt-in and disposable owner/admin assignment fixtures."
    );
    await page.goto(`/opportunities/${E2E_OPPORTUNITY_ID}`);
    const assignment = page.getByRole("combobox", {
      name: "Assign opportunity",
    });
    await assignment.selectOption(E2E_ASSIGNMENT_TARGET_USER_ID);
    await expect(page.getByText("Assignment updated.")).toBeVisible();
    await expect(page.getByRole("heading", {
      name: "Activity timeline",
    })).toBeVisible();
    await expect(page.getByText(
      /^(Assigned|Reassigned|Self-assigned) ·/
    ).first()).toBeVisible();
  });

  test("member can self-assign with no elevated selector", async ({ page }) => {
    test.skip(
      !E2E_ALLOW_MUTATIONS || !E2E_MEMBER_OPPORTUNITY_ID,
      "Requires mutation opt-in and credentials for a disposable ordinary-member fixture."
    );
    await page.goto(`/opportunities/${E2E_MEMBER_OPPORTUNITY_ID}`);
    await expect(page.getByRole("combobox", {
      name: "Assign opportunity",
    })).not.toBeVisible();
    const selfAssign = page.getByRole("button", { name: "Assign to me" });
    await selfAssign.click();
    await expect(page.getByText("Assigned to you")).toBeVisible();
    await expect(page.getByText(/^Self-assigned ·/)).toBeVisible();
  });

  test("direct opportunity omits Marketplace-only context", async ({ page }) => {
    test.skip(
      !E2E_DIRECT_OPPORTUNITY_ID,
      "Set E2E_DIRECT_OPPORTUNITY_ID to a visible direct opportunity."
    );
    await page.goto(`/opportunities/${E2E_DIRECT_OPPORTUNITY_ID}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Marketplace request context")).not.toBeVisible();
    await expect(page.getByText("Homeowner-provided budget range")).not.toBeVisible();
  });

  test("linked quote edit mode ignores a conflicting opportunity parameter", async ({ page }) => {
    test.skip(
      !E2E_LINKED_QUOTE_ID || !E2E_OPPORTUNITY_ID,
      "Set E2E_LINKED_QUOTE_ID and E2E_OPPORTUNITY_ID to linked visible fixtures."
    );
    await page.goto(
      `/quote?quoteId=${E2E_LINKED_QUOTE_ID}&opportunityId=00000000-0000-4000-8000-000000000000`
    );
    await expect(page).toHaveURL(/quoteId=/);
    await expect(page.getByText("Opportunity not found")).not.toBeVisible();
    await expect(page.getByText(/^Creating a quote for /)).not.toBeVisible();
  });

  test("blank quote and primary workspace navigation remain available", async ({ page }) => {
    await page.goto("/quote");
    await expect(
      page.getByRole("heading", { name: "Create a professional quote" })
    ).toBeVisible();

    for (const route of ["/quotes", "/team", "/settings"]) {
      await page.goto(route);
      await expect(page).toHaveURL(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });

  test("saving an opportunity quote makes it visible on detail", async ({ page }) => {
    test.skip(
      !E2E_ALLOW_MUTATIONS || !E2E_OPPORTUNITY_ID,
      "Requires E2E_ALLOW_MUTATIONS=true and a disposable seeded E2E opportunity; never enable against production."
    );
    const marker = `E2E opportunity quote ${Date.now()}`;
    await page.goto(`/quote?opportunityId=${E2E_OPPORTUNITY_ID}`);
    await expect(page.getByText(/^Creating a quote for /)).toBeVisible();
    await fillBasicQuoteForm(page, marker);
    await submitQuoteForm(page);
    await expect(page).toHaveURL(/quoteId=/);
    await page.goto(`/opportunities/${E2E_OPPORTUNITY_ID}`);
    await expect(page.getByRole("heading", { name: "Linked quotes" })).toBeVisible();
    await expect(page.getByText(marker)).toBeVisible();
  });
});

test.describe("Public quote regression", () => {
  test.skip(
    !isSupabaseConfigured() || !E2E_PUBLIC_QUOTE_TOKEN,
    "Requires Supabase and E2E_PUBLIC_QUOTE_TOKEN for a visible seeded public quote."
  );

  test("public quote remains accessible without authentication", async ({ page }) => {
    await page.goto(`/quote/${E2E_PUBLIC_QUOTE_TOKEN}`);
    await expect(page).toHaveURL(`/quote/${E2E_PUBLIC_QUOTE_TOKEN}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page).not.toHaveURL(/login/);
  });
});
