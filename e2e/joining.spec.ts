import { expect, test, type Browser, type Page } from "@playwright/test";

async function createTastingFromUi(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Create tasting" }).click();
  const codePill = page.locator(".code-pill");
  await expect(codePill).toContainText("Tap to copy link");
  const code = (await codePill.locator("span").innerText()).trim();
  return { code, joinLink: `http://localhost:5173/?code=${code}` };
}

async function joinAs(browser: Browser, joinLink: string, code: string, name: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(joinLink);
  await page.getByLabel("Your name").fill(name);
  await page.getByRole("button", { name: `Join ${code}` }).click();
  await expect(page.getByText(`Playing as ${name}`)).toBeVisible();
  return { context, page };
}

test("attendee can join lobby with code and name", async ({ browser, page }) => {
  const { code, joinLink } = await createTastingFromUi(page);
  const name = `Lobby ${code}`;

  await joinAs(browser, joinLink, code, name);

  await expect(page.getByText(name)).toBeVisible();
});

test("duplicate attendee name is rejected", async ({ browser, page }) => {
  const { code, joinLink } = await createTastingFromUi(page);
  const name = `Duplicate ${code}`;
  await joinAs(browser, joinLink, code, name);

  const duplicateContext = await browser.newContext();
  const duplicatePage = await duplicateContext.newPage();
  await duplicatePage.goto(joinLink);
  await duplicatePage.getByLabel("Your name").fill(name);
  await duplicatePage.getByRole("button", { name: `Join ${code}` }).click();

  await expect(duplicatePage.getByText("That name is already taken in this tasting.")).toBeVisible();
});

test("attendee can join after tasting has started and appears in leaderboard", async ({ browser, page }) => {
  const { code, joinLink } = await createTastingFromUi(page);
  const name = `Late ${code}`;

  await page.getByRole("button", { name: "Start first round" }).click();
  await expect(page.getByRole("heading", { name: "Round 1" })).toBeVisible();

  await joinAs(browser, joinLink, code, name);

  await expect(page.locator(".score-row").filter({ hasText: name })).toBeVisible();
  await expect(page.locator(".waiting-list").filter({ hasText: name })).toBeVisible();
});

test("attendee cannot join after tasting is completed", async ({ browser, page }) => {
  const { joinLink } = await createTastingFromUi(page);

  await page.getByRole("button", { name: "End tasting" }).click();
  await expect(page.getByText("completed")).toBeVisible();

  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  await guestPage.goto(joinLink);

  await expect(guestPage.getByRole("heading", { name: "This tasting has ended" })).toBeVisible();
  await expect(guestPage.getByRole("heading", { name: "Join this tasting" })).toHaveCount(0);
});
