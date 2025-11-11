import { test, expect } from "@playwright/test";

test("applications page renders data", async ({ page }) => {
  await page.goto("/applications");
  await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();
  await expect(page.getByText("In-flight applications")).toBeVisible();
});

test("lenders page lists products", async ({ page }) => {
  await page.goto("/lenders");
  await expect(page.getByRole("heading", { name: "Lenders" })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
});
