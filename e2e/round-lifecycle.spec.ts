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

async function lockGuessViaApi(
  page: Page,
  roundId: string,
  joined: JoinedParticipant,
  varietalId = "pinotage",
) {
  const response = await page.request.post(`/api/rounds/${roundId}/guesses`, {
    data: {
      participantId: joined.participant.id,
      sessionToken: joined.sessionToken,
      varietalId,
    },
  });
  await expect(response).toBeOK();
}

test("host can start first round", async ({ page }) => {
  await createTastingFromUi(page);

  await page.getByRole("button", { name: "Start first round" }).click();

  await expect(page.getByRole("heading", { name: "Round 1" })).toBeVisible();
  await expect(page.getByRole("button", { name: "End guessing early" })).toBeVisible();
});

test("attendee can search varietals and lock one guess", async ({ browser, page }) => {
  const { code, joinLink } = await createTastingFromUi(page);
  await page.getByRole("button", { name: "Start first round" }).click();

  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  await guestPage.goto(joinLink);
  await guestPage.getByLabel("Your name").fill(`Search ${code}`);
  await guestPage.getByRole("button", { name: `Join ${code}` }).click();

  await expect(guestPage.getByRole("heading", { name: "Pick one varietal" })).toBeVisible();
  await guestPage.getByLabel("Search notes").fill("coffee");
  await expect(guestPage.getByRole("button", { name: /Pinotage/i })).toBeVisible();
  await guestPage.getByLabel("Search notes").fill("Stellenbosch");
  await expect(guestPage.getByRole("button", { name: /Cabernet Sauvignon/i })).toBeVisible();
  await guestPage.getByLabel("Search notes").fill("pinotage");
  await guestPage.getByRole("button", { name: /Pinotage/i }).click();
  await guestPage.getByRole("button", { name: "Lock guess" }).click();

  await expect(guestPage.getByText("Guess locked. Waiting for others.")).toBeVisible();
  await expect(guestPage.getByRole("button", { name: "Lock guess" })).toHaveCount(0);
});

test("outstanding guessers update and collapse after threshold", async ({ page }) => {
  const { code } = await createTastingFromUi(page);
  const joined = [];
  for (const name of ["Anna", "Ben", "Carla", "Dev", "Emma", "Felix"]) {
    joined.push(await joinViaApi(page, code, `${name} ${code}`));
  }

  await page.getByRole("button", { name: "Start first round" }).click();
  await expect(page.locator(".waiting-list")).toContainText(`Anna ${code}`);
  await expect(page.locator(".waiting-list")).toContainText("+2 more");

  const roundId = await latestRoundId(page, code);
  await lockGuessViaApi(page, roundId, joined[0]);

  await expect(page.locator(".waiting-list")).not.toContainText(`Anna ${code}`);
  await expect(page.locator(".waiting-list")).toContainText(`Ben ${code}`);
  await expect(page.locator(".waiting-list")).toContainText("+1 more");
});

test("round automatically awaits host answer when everyone has guessed", async ({ page }) => {
  const { code } = await createTastingFromUi(page);
  const joined = await joinViaApi(page, code, `Solo ${code}`);

  await page.getByRole("button", { name: "Start first round" }).click();
  const roundId = await latestRoundId(page, code);
  await lockGuessViaApi(page, roundId, joined);

  await expect(page.getByLabel("Search correct varietal")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reveal results" })).toBeDisabled();
});

test("host can end guessing early and missing attendees show no guess", async ({ page }) => {
  const { code } = await createTastingFromUi(page);
  await joinViaApi(page, code, `No Guess ${code}`);

  await page.getByRole("button", { name: "Start first round" }).click();
  await page.getByRole("button", { name: "End guessing early" }).click();
  await page.getByLabel("Search correct varietal").fill("cabernet franc");
  await page.getByRole("button", { name: /Cabernet Franc/i }).click();
  await page.getByRole("button", { name: "Reveal results" }).click();

  await expect(page.getByText("No guess for this round.")).toBeVisible();
  await expect(page.getByText("No guess").last()).toBeVisible();
});
