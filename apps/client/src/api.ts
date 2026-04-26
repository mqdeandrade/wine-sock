import type { TastingSummary, VarietalSummary } from "@wine-sock/shared";

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "";

interface ApiErrorBody {
  error?: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let body: ApiErrorBody = {};
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = {};
    }

    throw new Error(body.error ?? "Request failed.");
  }

  return response.json() as Promise<T>;
}

export interface CreateTastingResponse {
  tasting: TastingSummary;
  hostToken: string;
}

export interface JoinTastingResponse {
  participant: {
    id: string;
    name: string;
    tastingId: string;
    joinedAt: string;
  };
  sessionToken: string;
}

export function fetchVarietals() {
  return request<{ varietals: VarietalSummary[] }>("/api/varietals");
}

export function createTasting() {
  return request<CreateTastingResponse>("/api/tastings", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function fetchTasting(code: string) {
  return request<{ tasting: TastingSummary }>(`/api/tastings/${code.trim().toUpperCase()}`);
}

export function joinTasting(code: string, name: string) {
  return request<JoinTastingResponse>(`/api/tastings/${code.trim().toUpperCase()}/join`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function startRound(tastingId: string, hostToken: string) {
  return request<{ round: unknown }>(`/api/tastings/${tastingId}/rounds`, {
    method: "POST",
    body: JSON.stringify({ hostToken }),
  });
}

export function lockGuess(
  roundId: string,
  participantId: string,
  sessionToken: string,
  varietalId: string,
) {
  return request<{ guessingClosed: boolean }>(`/api/rounds/${roundId}/guesses`, {
    method: "POST",
    body: JSON.stringify({ participantId, sessionToken, varietalId }),
  });
}

export function closeGuessing(roundId: string, hostToken: string) {
  return request<{ round: unknown }>(`/api/rounds/${roundId}/close`, {
    method: "POST",
    body: JSON.stringify({ hostToken }),
  });
}

export function revealRound(roundId: string, hostToken: string, correctVarietalId: string) {
  return request<{ round: unknown }>(`/api/rounds/${roundId}/reveal`, {
    method: "POST",
    body: JSON.stringify({ hostToken, correctVarietalId }),
  });
}

export function endTasting(tastingId: string, hostToken: string) {
  return request<{ tasting: TastingSummary }>(`/api/tastings/${tastingId}/end`, {
    method: "POST",
    body: JSON.stringify({ hostToken }),
  });
}
