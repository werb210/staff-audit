import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(token => localStorage.setItem("apiToken", token as string), process.env.API_TOKEN || "");
});

test("top nav + tabs render", async ({ page }) => {
  await page.goto("/dashboard#/apps");
  await expect(page.getByText("Applications")).toBeVisible();
  await page.getByText("Sales Pipeline").click();
  await expect(page.getByText("Sales Pipeline")).toBeVisible(); // page header in your component
  await page.getByText("Settings", { exact: true }).click();
  await expect(page.getByText("Users")).toBeVisible();
  await expect(page.getByText("Feature Flags")).toBeVisible();
});

test("pipeline has 6 columns", async ({ page }) => {
  await page.goto("/dashboard#/pipeline");
  for (const name of ["New","Requires Docs","In Review","All Docs Accepted","Sent to Lender","Closed"]) {
    await expect(page.getByText(name)).toBeVisible();
  }
});

test("lenders UI loads", async ({ page }) => {
  await page.goto("/dashboard#/lenders");
  for (const tab of ["Lenders","Products","Recommendation","Reports"]) {
    await expect(page.getByText(tab)).toBeVisible();
  }
});
