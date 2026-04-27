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

test("host reveals answer, leaderboard updates, and next round can start", async ({ page }) => {
  const code = await createTastingFromUi(page);
  const correct = await joinViaApi(page, code, `Correct ${code}`);
  const missed = await joinViaApi(page, code, `Missed ${code}`);

  await page.getByRole("button", { name: "Start first round" }).click();
  const roundId = await latestRoundId(page, code);
  await lockGuessViaApi(page, roundId, correct, "chardonnay");
  await lockGuessViaApi(page, roundId, missed, "pinotage");

  await expect(page.getByLabel("Search correct varietal")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reveal results" })).toBeDisabled();

  await page.getByLabel("Search correct varietal").fill("chardonnay");
  await expect(page.getByRole("button", { name: /Chardonnay/i })).toBeVisible();
  await page.getByRole("button", { name: /Chardonnay/i }).click();
  await expect(page.getByText("Correct answer selected: Chardonnay")).toBeVisible();
  await page.getByRole("button", { name: "Reveal results" }).click();

  await expect(page.locator(".history-round").first()).toContainText("Chardonnay");
  await expect(page.locator(".history-round").first()).toContainText(`Correct ${code}`);
  await expect(page.locator(".history-round").first()).toContainText("Correct");
  await expect(page.locator(".history-round").first()).toContainText(`Missed ${code}`);
  await expect(page.locator(".history-round").first()).toContainText("Correct answer was Chardonnay");

  const rows = page.locator(".score-row");
  await expect(rows.first()).toContainText(`Correct ${code}`);
  await expect(rows.first()).toContainText("1");
  await expect(rows.nth(1)).toContainText(`Missed ${code}`);
  await expect(rows.nth(1)).toContainText("0");

  await expect(page.getByRole("button", { name: "Start next round" })).toBeVisible();
  await page.getByRole("button", { name: "Start next round" }).click();
  await expect(page.getByRole("heading", { name: "Round 2" })).toBeVisible();
});
