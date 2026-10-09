import { test, expect } from "@playwright/test";

test("persisted scenario evidence report and human-approved simulation", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByText("Your investigations", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Run live demo →" }).click();
  await page.getByRole("button", { name: "Run scenario", exact: true }).click();
  await expect(page.getByText(/4 persisted events/)).toBeVisible();
  await page.getByRole("link", { name: "Open investigation →" }).click();
  await page.getByRole("tab", { name: "AI report", exact: true }).click();
  await expect(page.getByText("Deterministic summary · no LLM")).toBeVisible();
  await expect(page.locator(".react-flow__node").first()).toBeVisible();
  if (process.env.CAPTURE_DEMO === "true")
    await page.screenshot({ path: "../docs/assets/investigation.png", fullPage: true });
  await page.locator(".react-flow__node").first().click();
  await page
    .getByRole("tab", { name: /containment/i })
    .first()
    .click();
  const approve = page.getByRole("button", { name: "Approve simulated containment" });
  await expect(approve).toBeVisible();
  await approve.click();
  await expect(page.getByText(/Approved. The synthetic case/)).toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: "Containment", exact: true }).click();
  await expect(page.getByText(/Approved. The synthetic case/)).toBeVisible();
  await page.goto("/response");
  await expect(page.getByText(/simulated-execution/)).toBeVisible();
  expect(errors).toEqual([]);
});
