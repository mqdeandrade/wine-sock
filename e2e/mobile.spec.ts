import { expect, test, type Browser, type Page } from "@playwright/test";

const mobileViewport = { width: 390, height: 844 };

interface JoinedParticipant {
  participant: {
    id: string;
    name: string;
  };
  sessionToken: string;
}

async function createTastingFromUi(page: Page) {
  await page.setViewportSize(mobileViewport);
  await page.goto("/");
  await page.getByRole("button", { name: "Create tasting" }).click();
  const code = (await page.locator(".code-pill span").innerText()).trim();
  return { code, joinLink: `http://localhost:5173/?code=${code}` };
}

async function joinViaApi(page: Page, code: string, name: string) {
  const response = await page.request.post(`/api/tastings/${code}/join`, {
    data: { name },
  });
  await expect(response).toBeOK();
  return (await response.json()) as JoinedParticipant;
}

async function joinInMobileBrowser(browser: Browser, joinLink: string, code: string, name: string) {
  const context = await browser.newContext({ viewport: mobileViewport });
  const page = await context.newPage();
  await page.goto(joinLink);
  await page.getByLabel("Your name").fill(name);
  await page.getByRole("button", { name: `Join ${code}` }).click();
  await expect(page.getByText(`Playing as ${name}`)).toBeVisible();
  return page;
}

test("attendee guessing and host answer reveal work at mobile viewport", async ({ browser, page }) => {
  const { code, joinLink } = await createTastingFromUi(page);
  const guestPage = await joinInMobileBrowser(browser, joinLink, code, `Mobile ${code}`);

  await page.getByRole("button", { name: "Start first round" }).click();
  await expect(guestPage.getByRole("heading", { name: "Pick one varietal" })).toBeVisible();

  await guestPage.getByLabel("Search notes").fill("pinotage");
  await guestPage.getByRole("button", { name: /Pinotage/i }).click();
  const selectedCardShadow = await guestPage
    .locator(".varietal.selected")
    .evaluate((element) => getComputedStyle(element).boxShadow);
  expect(selectedCardShadow).toContain("inset");
  await guestPage.getByRole("button", { name: "Lock guess" }).click();

  await expect(page.getByLabel("Search correct varietal")).toBeVisible();
  await page.getByLabel("Search correct varietal").fill("pinotage");
  await page.getByRole("button", { name: /Pinotage/i }).click();
  await page.getByRole("button", { name: "Reveal results" }).click();

  await expect(guestPage.getByText("Correct answer:")).toBeVisible();
  await expect(guestPage.getByText("Pinotage").first()).toBeVisible();
});

test("waiting list stays compact with many attendees at mobile viewport", async ({ page }) => {
  const { code } = await createTastingFromUi(page);
  for (const name of ["Ari", "Bea", "Cal", "Dee", "Eli", "Fox"]) {
    await joinViaApi(page, code, name);
  }

  await page.getByRole("button", { name: "Start first round" }).click();

  const waitingList = page.locator(".waiting-list");
  await expect(waitingList).toContainText("Ari");
  await expect(waitingList).toContainText("+2 more");
  await expect(waitingList.locator("b")).toHaveCount(5);
  const box = await waitingList.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeLessThanOrEqual(130);
});
