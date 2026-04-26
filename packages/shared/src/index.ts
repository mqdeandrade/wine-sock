export type TastingStatus = "lobby" | "active" | "completed";
export type RoundStatus = "guessing" | "awaiting_answer" | "revealed";

export type VarietalColor = "red" | "white" | "rose" | "sparkling" | "dessert";

export interface VarietalSummary {
  id: string;
  name: string;
  color: VarietalColor;
  notes: string;
  commonDescriptors: string[];
  typicalRegions: string[];
}

export interface ParticipantSummary {
  id: string;
  name: string;
  joinedAt: string;
}

export interface GuessSummary {
  participantId: string;
  varietalId: string | null;
  lockedAt: string;
  isCorrect: boolean | null;
}

export interface RoundSummary {
  id: string;
  roundNumber: number;
  status: RoundStatus;
  correctVarietalId: string | null;
  startedAt: string;
  guessingClosedAt: string | null;
  revealedAt: string | null;
  guesses: GuessSummary[];
}

export interface LeaderboardEntry {
  participantId: string;
  name: string;
  score: number;
}

export interface TastingSummary {
  id: string;
  code: string;
  status: TastingStatus;
  participants: ParticipantSummary[];
  rounds: RoundSummary[];
  leaderboard: LeaderboardEntry[];
}
