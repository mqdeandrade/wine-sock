import type { RoundStatus } from "@wine-sock/shared";

export interface GuessForScoring {
  participantId: string;
  varietalId: string;
}

export interface ScoredGuess extends GuessForScoring {
  isCorrect: boolean;
  points: 0 | 1;
}

export interface GuessRating {
  rating: number | null;
}

export function canJoinTasting(status: "lobby" | "active" | "completed") {
  return status !== "completed";
}

export function nextRoundNumber(existingRoundNumbers: number[]) {
  return existingRoundNumbers.length === 0 ? 1 : Math.max(...existingRoundNumbers) + 1;
}

export function shouldCloseGuessing(
  participantIds: string[],
  guesses: GuessForScoring[],
) {
  if (participantIds.length === 0) {
    return false;
  }

  const guessedParticipantIds = new Set(guesses.map((guess) => guess.participantId));
  return participantIds.every((participantId) => guessedParticipantIds.has(participantId));
}

export function scoreGuesses(
  guesses: GuessForScoring[],
  correctVarietalId: string,
): ScoredGuess[] {
  return guesses.map((guess) => {
    const isCorrect = guess.varietalId === correctVarietalId;
    return {
      ...guess,
      isCorrect,
      points: isCorrect ? 1 : 0,
    };
  });
}

export function averageRating(guesses: GuessRating[]) {
  const ratings = guesses
    .map((guess) => guess.rating)
    .filter((rating): rating is number => rating !== null);

  if (ratings.length === 0) {
    return null;
  }

  return ratings.reduce((total, rating) => total + rating, 0) / ratings.length;
}

export function assertRoundCanAcceptGuess(status: RoundStatus) {
  if (status !== "guessing") {
    throw new Error("Round is not accepting guesses.");
  }
}

export function assertRoundCanReveal(status: RoundStatus) {
  if (status !== "awaiting_answer") {
    throw new Error("Round must be awaiting the host answer before reveal.");
  }
}
