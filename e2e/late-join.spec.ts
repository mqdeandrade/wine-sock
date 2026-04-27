import { expect, test, type Browser, type Page } from "@playwright/test";

interface JoinedParticipant {
  participant: {
    id: string;
    name: string;
  };
  sessionToken: string;
}

async function createTastingFromUi(page: Page) {
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

async function latestRoundId(page: Page, code: string) {
  const response = await page.request.get(`/api/tastings/${code}`);
  await expect(response).toBeOK();
  const body = await response.json();
  return body.tasting.rounds.at(-1).id as string;
}

async function lockGuessViaApi(page: Page, roundId: string, joined: JoinedParticipant, varietalId: string) {
  const response = await page.request.post(`/api/rounds/${roundId}/guesses`, {
    data: {
      participantId: joined.participant.id,
      sessionToken: joined.sessionToken,
      varietalId,
    },
  });
  await expect(response).toBeOK();
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

async function revealCurrentRound(page: Page, correctVarietal: string) {
  await page.getByLabel("Search correct varietal").fill(correctVarietal);
  await page.getByRole("button", { name: new RegExp(correctVarietal, "i") }).click();
  await page.getByRole("button", { name: "Reveal results" }).click();
}

test("active round waits for late joiner and lets them guess", async ({ browser, page }) => {
  const { code, joinLink } = await createTastingFromUi(page);
  const original = await joinViaApi(page, code, `Original ${code}`);

  await page.getByRole("button", { name: "Start first round" }).click();
  await expect(page.getByRole("heading", { name: "Round 1" })).toBeVisible();
  const roundId = await latestRoundId(page, code);

  const lateName = `Late ${code}`;
  const latePage = await joinInBrowser(browser, joinLink, code, lateName);
  await expect(page.locator(".waiting-list")).toContainText(lateName);

  await lockGuessViaApi(page, roundId, original, "chardonnay");
  await expect(page.getByLabel("Search correct varietal")).toHaveCount(0);
  await expect(page.locator(".waiting-list")).toContainText(lateName);

  await latePage.getByLabel("Search notes").fill("pinotage");
  await latePage.getByRole("button", { name: /Pinotage/i }).click();
  await latePage.getByRole("button", { name: "Lock guess" }).click();

  await expect(page.getByLabel("Search correct varietal")).toBeVisible();
});

test("late joiner shows no guess for already revealed earlier rounds", async ({ browser, page }) => {
  const { code, joinLink } = await createTastingFromUi(page);
  const original = await joinViaApi(page, code, `Original ${code}`);

  await page.getByRole("button", { name: "Start first round" }).click();
  await expect(page.getByRole("heading", { name: "Round 1" })).toBeVisible();
  const roundOneId = await latestRoundId(page, code);
  await lockGuessViaApi(page, roundOneId, original, "cabernet-franc");
  await revealCurrentRound(page, "Cabernet Franc");

  await page.getByRole("button", { name: "Start next round" }).click();
  const lateName = `Late History ${code}`;
  const latePage = await joinInBrowser(browser, joinLink, code, lateName);
  await latePage.getByLabel("Search notes").fill("chardonnay");
  await latePage.getByRole("button", { name: /Chardonnay/i }).click();
  await latePage.getByRole("button", { name: "Lock guess" }).click();

  const roundOne = page.locator(".history-round").filter({ hasText: "Round 1" });
  await roundOne.locator("summary").click();
  await expect(roundOne).toContainText(lateName);
  await expect(roundOne).toContainText("No guess for this round.");
});
