import { expect, test, type Browser, type Page } from "@playwright/test";

async function createTastingFromUi(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Create tasting" }).click();
  const code = (await page.locator(".code-pill span").innerText()).trim();
  return { code, joinLink: `http://localhost:5173/?code=${code}` };
}

async function joinInBrowser(browser: Browser, joinLink: string, code: string, name: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(joinLink);
  await page.getByLabel("Your name").fill(name);
  await page.getByRole("button", { name: `Join ${code}` }).click();
  await expect(page.getByText(`Playing as ${name}`)).toBeVisible();
  return page;
}

test("host and attendee views update live through join, guessing, reveal, leaderboard, and history", async ({
  browser,
  page,
}) => {
  const { code, joinLink } = await createTastingFromUi(page);
  const guestName = `Realtime ${code}`;

  const guestPage = await joinInBrowser(browser, joinLink, code, guestName);
  await expect(page.getByText("1 attendees joined")).toBeVisible();
  await expect(page.locator(".score-row").filter({ hasText: guestName })).toContainText("0");

  await page.getByRole("button", { name: "Start first round" }).click();
  await expect(guestPage.getByRole("heading", { name: "Pick one varietal" })).toBeVisible();

  await guestPage.getByLabel("Search notes").fill("pinotage");
  await guestPage.getByRole("button", { name: /Pinotage/i }).click();
  await guestPage.getByRole("button", { name: "Lock guess" }).click();
  await expect(page.getByText("1 of 1 guesses locked")).toBeVisible();
  await expect(page.getByLabel("Search correct varietal")).toBeVisible();

  await page.getByLabel("Search correct varietal").fill("pinotage");
  await page.getByRole("button", { name: /Pinotage/i }).click();
  await page.getByRole("button", { name: "Reveal results" }).click();

  await expect(guestPage.getByText("Correct answer:")).toBeVisible();
  await expect(guestPage.getByText("Pinotage").first()).toBeVisible();
  await expect(page.locator(".score-row").filter({ hasText: guestName })).toContainText("1");
  await expect(page.locator(".history-round").first()).toContainText("Round 1");
  await expect(page.locator(".history-round").first()).toContainText("Guessed Pinotage");
  await expect(page.locator(".history-round").first()).toContainText("Correct");
});
