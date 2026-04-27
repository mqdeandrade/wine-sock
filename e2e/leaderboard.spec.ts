import { expect, test, type Page } from "@playwright/test";

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
  return (await page.locator(".code-pill span").innerText()).trim();
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

async function revealCurrentRound(page: Page, correctVarietal: string) {
  await expect(page.getByLabel("Search correct varietal")).toBeVisible();
  await page.getByLabel("Search correct varietal").fill(correctVarietal);
  await page.getByRole("button", { name: new RegExp(correctVarietal, "i") }).click();
  await page.getByRole("button", { name: "Reveal results" }).click();
}

test("leaderboard is top-aligned, sorted by score, and includes zero-score participants", async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 700 });
  const code = await createTastingFromUi(page);
  const alpha = await joinViaApi(page, code, `Alpha ${code}`);
  const bravo = await joinViaApi(page, code, `Bravo ${code}`);
  const charlie = await joinViaApi(page, code, `Charlie ${code}`);

  await page.getByRole("button", { name: "Start first round" }).click();
  await expect(page.getByRole("heading", { name: "Round 1" })).toBeVisible();
  const roundOneId = await latestRoundId(page, code);
  await lockGuessViaApi(page, roundOneId, alpha, "chardonnay");
  await lockGuessViaApi(page, roundOneId, bravo, "pinotage");
  await lockGuessViaApi(page, roundOneId, charlie, "pinotage");
  await revealCurrentRound(page, "Chardonnay");

  await page.getByRole("button", { name: "Start next round" }).click();
  await expect(page.getByRole("heading", { name: "Round 2" })).toBeVisible();
  const roundTwoId = await latestRoundId(page, code);
  await lockGuessViaApi(page, roundTwoId, alpha, "pinotage");
  await lockGuessViaApi(page, roundTwoId, bravo, "pinotage");
  await lockGuessViaApi(page, roundTwoId, charlie, "chardonnay");
  await revealCurrentRound(page, "Pinotage");

  const rows = page.locator(".score-row");
  await expect(rows.nth(0)).toContainText(`Alpha ${code}`);
  await expect(rows.nth(0)).toContainText("2");
  await expect(rows.nth(1)).toContainText(`Bravo ${code}`);
  await expect(rows.nth(1)).toContainText("1");
  await expect(rows.nth(2)).toContainText(`Charlie ${code}`);
  await expect(rows.nth(2)).toContainText("0");

  const leaderboardBox = await page.locator(".card").filter({ hasText: "Leaderboard" }).boundingBox();
  const historyBox = await page.locator(".card").filter({ hasText: "History" }).boundingBox();
  expect(leaderboardBox).not.toBeNull();
  expect(historyBox).not.toBeNull();
  expect(Math.abs(leaderboardBox!.y - historyBox!.y)).toBeLessThanOrEqual(2);
});
