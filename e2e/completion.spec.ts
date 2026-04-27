import { expect, test, type Page } from "@playwright/test";

async function createTastingFromUi(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Create tasting" }).click();
  const code = (await page.locator(".code-pill span").innerText()).trim();
  return { code, joinLink: `http://localhost:5173/?code=${code}` };
}

test("host can end tasting and no new rounds can be started", async ({ page }) => {
  await createTastingFromUi(page);

  await page.getByRole("button", { name: "End tasting" }).click();

  await expect(page.getByText("completed")).toBeVisible();
  await expect(page.getByRole("button", { name: /Start/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "End tasting" })).toHaveCount(0);
});

test("completed tasting remains viewable by code and blocks new attendees", async ({ browser, page }) => {
  const { code, joinLink } = await createTastingFromUi(page);
  await page.getByRole("button", { name: "End tasting" }).click();
  await expect(page.getByText("completed")).toBeVisible();

  const resultsContext = await browser.newContext();
  const resultsPage = await resultsContext.newPage();
  await resultsPage.goto("/");
  const resultsCard = resultsPage.locator(".card").filter({ hasText: "Results" });
  await resultsCard.getByLabel("Tasting code").fill(code);
  await resultsCard.getByRole("button", { name: "View tasting" }).click();
  await expect(resultsPage.getByText("completed")).toBeVisible();
  await expect(resultsPage.getByText("Leaderboard")).toBeVisible();
  await expect(resultsPage.getByText("History")).toBeVisible();

  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  await guestPage.goto(joinLink);
  await expect(guestPage.getByRole("heading", { name: "This tasting has ended" })).toBeVisible();
  await expect(guestPage.getByRole("heading", { name: "Join this tasting" })).toHaveCount(0);
});
