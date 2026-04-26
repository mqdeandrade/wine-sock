import { describe, expect, it } from "vitest";
import {
  canJoinTasting,
  nextRoundNumber,
  scoreGuesses,
  shouldCloseGuessing,
} from "./rounds.js";

describe("round domain helpers", () => {
  it("only allows joining during the lobby", () => {
    expect(canJoinTasting("lobby")).toBe(true);
    expect(canJoinTasting("active")).toBe(false);
    expect(canJoinTasting("completed")).toBe(false);
  });

  it("calculates the next round number", () => {
    expect(nextRoundNumber([])).toBe(1);
    expect(nextRoundNumber([1, 2, 4])).toBe(5);
  });

  it("closes guessing only once every participant has guessed", () => {
    expect(
      shouldCloseGuessing(
        ["alice", "ben"],
        [{ participantId: "alice", varietalId: "riesling" }],
      ),
    ).toBe(false);

    expect(
      shouldCloseGuessing(
        ["alice", "ben"],
        [
          { participantId: "alice", varietalId: "riesling" },
          { participantId: "ben", varietalId: "chardonnay" },
        ],
      ),
    ).toBe(true);
  });

  it("scores guesses with one point for the correct varietal", () => {
    expect(
      scoreGuesses(
        [
          { participantId: "alice", varietalId: "riesling" },
          { participantId: "ben", varietalId: "chardonnay" },
        ],
        "riesling",
      ),
    ).toEqual([
      { participantId: "alice", varietalId: "riesling", isCorrect: true, points: 1 },
      { participantId: "ben", varietalId: "chardonnay", isCorrect: false, points: 0 },
    ]);
  });
});
