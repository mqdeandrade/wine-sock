import { expect, test } from "@playwright/test";

test("loads landing page and varietals", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Wine Sock" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Create a tasting" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Join a tasting" })).toBeVisible();
  await expect(page.getByText("Unexpected token")).toHaveCount(0);

  const varietals = await page.request.get("/api/varietals");
  await expect(varietals).toBeOK();
  await expect(await varietals.json()).toMatchObject({
    varietals: expect.arrayContaining([
      expect.objectContaining({ id: "pinotage", name: "Pinotage" }),
    ]),
  });
});

test("creates a tasting and shows host lobby", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Create tasting" }).click();

  await expect(page.locator(".code-pill")).toContainText("Tap to copy link");
  await expect(page.getByRole("heading", { name: "Lobby" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Run the tasting" })).toBeVisible();
  await expect(page.getByText("Leaderboard")).toBeVisible();
  await expect(page.getByText("History")).toBeVisible();
});
