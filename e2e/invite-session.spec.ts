import { expect, test } from "@playwright/test";

async function createTastingFromUi(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Create tasting" }).click();
  const codePill = page.locator(".code-pill");
  await expect(codePill).toContainText("Tap to copy link");
  const code = (await codePill.locator("span").innerText()).trim();
  return { code, codePill, joinLink: `http://localhost:5173/?code=${code}` };
}

test("copies join link from the session code", async ({ context, page }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: "http://localhost:5173",
  });
  const { code, codePill } = await createTastingFromUi(page);

  await codePill.click();

  await expect(page.getByText("Join link copied").first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(
    `http://localhost:5173/?code=${code}`,
  );
});

test("invite link opens tasting join prompt for a new attendee", async ({ browser, page }) => {
  const { code, joinLink } = await createTastingFromUi(page);
  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();

  await guestPage.goto(joinLink);

  await expect(guestPage.locator(".card").filter({ hasText: `Join ${code}` })).toBeVisible();
  await expect(guestPage.getByRole("heading", { name: "Join this tasting" })).toBeVisible();
  await expect(guestPage.getByRole("heading", { name: "Run the tasting" })).toHaveCount(0);
});

test("same browser restores attendee session from invite link", async ({ browser, page }) => {
  const { code, joinLink } = await createTastingFromUi(page);
  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();

  await guestPage.goto(joinLink);
  await guestPage.getByLabel("Your name").fill(`Ada ${code}`);
  await guestPage.getByRole("button", { name: `Join ${code}` }).click();
  await expect(guestPage.getByText(`Playing as Ada ${code}`)).toBeVisible();

  const returningPage = await guestContext.newPage();
  await returningPage.goto(joinLink);

  await expect(returningPage.getByText(`Playing as Ada ${code}`)).toBeVisible();
  await expect(returningPage.getByRole("heading", { name: "Join this tasting" })).toHaveCount(0);
});

test("host refresh restores host controls from local storage", async ({ page }) => {
  await createTastingFromUi(page);

  await page.reload();

  await expect(page.getByRole("heading", { name: "Run the tasting" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start first round" })).toBeVisible();
});

test("different browser opening invite link does not receive host controls", async ({ browser, page }) => {
  const { code, joinLink } = await createTastingFromUi(page);
  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();

  await guestPage.goto(joinLink);

  await expect(guestPage.locator(".card").filter({ hasText: `Join ${code}` })).toBeVisible();
  await expect(guestPage.getByRole("heading", { name: "Run the tasting" })).toHaveCount(0);
});
