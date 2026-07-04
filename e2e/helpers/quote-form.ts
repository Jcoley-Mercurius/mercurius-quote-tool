import { expect, type Page } from "@playwright/test";

export async function fillBasicQuoteForm(
  page: Page,
  jobDescription: string
): Promise<void> {
  await expect(page.getByRole("heading", { name: "Create a professional quote" })).toBeVisible();

  await page.getByRole("button", { name: "HVAC" }).click();
  await page.getByLabel("Square footage").fill("1850");
  await page.getByRole("button", { name: "1 Story" }).click();
  await page.getByLabel("Year built").fill("1987");
  await page.getByLabel("Zip code").fill("33904");
  await page.locator("#jobDescription").fill(jobDescription);
}

export async function submitQuoteForm(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Generate Quote" }).click();
}