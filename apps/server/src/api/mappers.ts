import {
  RoundStatus as PrismaRoundStatus,
  TastingStatus as PrismaTastingStatus,
  VarietalColor as PrismaVarietalColor,
  type Guess,
  type Participant,
  type Prisma,
  type Round,
  type Varietal,
} from "@prisma/client";
import type {
  GuessSummary,
  LeaderboardEntry,
  RoundSummary,
  TastingStatus,
  TastingSummary,
  VarietalColor,
  VarietalSummary,
} from "@wine-sock/shared";

export const tastingInclude = {
  participants: { orderBy: { joinedAt: "asc" } },
  rounds: {
    orderBy: { roundNumber: "asc" },
    include: {
      guesses: { orderBy: { lockedAt: "asc" } },
    },
  },
} satisfies Prisma.TastingInclude;

type TastingWithRelations = Prisma.TastingGetPayload<{ include: typeof tastingInclude }>;

const tastingStatusMap = {
  [PrismaTastingStatus.LOBBY]: "lobby",
  [PrismaTastingStatus.ACTIVE]: "active",
  [PrismaTastingStatus.COMPLETED]: "completed",
} satisfies Record<PrismaTastingStatus, TastingStatus>;

const roundStatusMap = {
  [PrismaRoundStatus.GUESSING]: "guessing",
  [PrismaRoundStatus.AWAITING_ANSWER]: "awaiting_answer",
  [PrismaRoundStatus.REVEALED]: "revealed",
} as const;

const varietalColorMap = {
  [PrismaVarietalColor.RED]: "red",
  [PrismaVarietalColor.WHITE]: "white",
  [PrismaVarietalColor.ROSE]: "rose",
  [PrismaVarietalColor.SPARKLING]: "sparkling",
  [PrismaVarietalColor.DESSERT]: "dessert",
} satisfies Record<PrismaVarietalColor, VarietalColor>;

export function toVarietalSummary(varietal: Varietal): VarietalSummary {
  return {
    id: varietal.id,
    name: varietal.name,
    color: varietalColorMap[varietal.color],
    notes: varietal.notes,
    commonDescriptors: varietal.commonDescriptors,
    typicalRegions: varietal.typicalRegions,
  };
}

function toGuessSummary(guess: Guess, shouldReveal: boolean): GuessSummary {
  return {
    participantId: guess.participantId,
    varietalId: shouldReveal ? guess.varietalId : null,
    lockedAt: guess.lockedAt.toISOString(),
    isCorrect: shouldReveal ? guess.isCorrect : null,
  };
}

function toRoundSummary(round: Round & { guesses: Guess[] }): RoundSummary {
  const status = roundStatusMap[round.status];
  const shouldReveal = status === "revealed";

  return {
    id: round.id,
    roundNumber: round.roundNumber,
    status,
    correctVarietalId: shouldReveal ? round.correctVarietalId : null,
    startedAt: round.startedAt.toISOString(),
    guessingClosedAt: round.guessingClosedAt?.toISOString() ?? null,
    revealedAt: round.revealedAt?.toISOString() ?? null,
    guesses: round.guesses.map((guess) => toGuessSummary(guess, shouldReveal)),
  };
}

function buildLeaderboard(
  participants: Participant[],
  rounds: Array<Round & { guesses: Guess[] }>,
): LeaderboardEntry[] {
  const scores = new Map(participants.map((participant) => [participant.id, 0]));

  for (const round of rounds) {
    if (round.status !== PrismaRoundStatus.REVEALED) {
      continue;
    }

    for (const guess of round.guesses) {
      if (guess.isCorrect) {
        scores.set(guess.participantId, (scores.get(guess.participantId) ?? 0) + 1);
      }
    }
  }

  return participants
    .map((participant) => ({
      participantId: participant.id,
      name: participant.name,
      score: scores.get(participant.id) ?? 0,
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

export function toTastingSummary(tasting: TastingWithRelations): TastingSummary {
  return {
    id: tasting.id,
    code: tasting.code,
    status: tastingStatusMap[tasting.status],
    participants: tasting.participants.map((participant) => ({
      id: participant.id,
      name: participant.name,
      joinedAt: participant.joinedAt.toISOString(),
    })),
    rounds: tasting.rounds.map(toRoundSummary),
    leaderboard: buildLeaderboard(tasting.participants, tasting.rounds),
  };
}
