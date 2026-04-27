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

test("history is newest first, collapsible, and shows correct/missed/no-guess details", async ({ page }) => {
  const code = await createTastingFromUi(page);
  const alice = await joinViaApi(page, code, `Alice ${code}`);
  const ben = await joinViaApi(page, code, `Ben ${code}`);

  await page.getByRole("button", { name: "Start first round" }).click();
  await expect(page.getByRole("heading", { name: "Round 1" })).toBeVisible();
  const roundOneId = await latestRoundId(page, code);
  await lockGuessViaApi(page, roundOneId, alice, "cabernet-franc");
  await lockGuessViaApi(page, roundOneId, ben, "chardonnay");
  await revealCurrentRound(page, "Cabernet Franc");

  await page.getByRole("button", { name: "Start next round" }).click();
  await expect(page.getByRole("heading", { name: "Round 2" })).toBeVisible();
  const cara = await joinViaApi(page, code, `Cara ${code}`);
  const roundTwoId = await latestRoundId(page, code);
  await lockGuessViaApi(page, roundTwoId, alice, "chardonnay");
  await lockGuessViaApi(page, roundTwoId, ben, "chardonnay");
  await lockGuessViaApi(page, roundTwoId, cara, "chardonnay");
  await revealCurrentRound(page, "Chardonnay");

  const rounds = page.locator(".history-round");
  await expect(rounds.nth(0)).toContainText("Round 2");
  await expect(rounds.nth(1)).toContainText("Round 1");
  await expect(rounds.nth(0)).toHaveAttribute("open", "");
  await expect(rounds.nth(1)).not.toHaveAttribute("open", "");

  await rounds.nth(1).locator("summary").click();
  await expect(rounds.nth(1)).toHaveAttribute("open", "");
  await expect(rounds.nth(1)).toContainText(`Alice ${code}`);
  await expect(rounds.nth(1)).toContainText("Guessed Cabernet Franc");
  await expect(rounds.nth(1)).toContainText("Correct");
  await expect(rounds.nth(1)).toContainText(`Ben ${code}`);
  await expect(rounds.nth(1)).toContainText("Guessed Chardonnay");
  await expect(rounds.nth(1)).toContainText("Correct answer was Cabernet Franc");
  await expect(rounds.nth(1)).toContainText("Missed");
  await expect(rounds.nth(1)).toContainText(`Cara ${code}`);
  await expect(rounds.nth(1)).toContainText("No guess for this round.");
  await expect(rounds.nth(1)).toContainText("No guess");
});
