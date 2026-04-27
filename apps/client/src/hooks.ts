import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { TastingSummary, VarietalSummary } from "@wine-sock/shared";
import { fetchVarietals } from "./api";

const apiBaseUrl = import.meta.env.VITE_API_URL ?? undefined;

export function useAsyncAction() {
  const [pendingActions, setPendingActions] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setPendingActions((count) => count + 1);
    setError(null);
    try {
      await action();
    } catch (caughtError) {
      setError((caughtError as Error).message);
    } finally {
      setPendingActions((count) => Math.max(0, count - 1));
    }
  }

  return {
    busy: pendingActions > 0,
    error,
    run,
    setError,
  };
}

export function useVarietals() {
  const [varietals, setVarietals] = useState<VarietalSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVarietals()
      .then(({ varietals: fetchedVarietals }) => setVarietals(fetchedVarietals))
      .catch((caughtError: unknown) => setError((caughtError as Error).message));
  }, []);

  return { varietals, error };
}

export function useTastingSocket(
  tastingCode: string | null,
  onTastingUpdated: (updatedTasting: TastingSummary) => void,
) {
  useEffect(() => {
    if (!tastingCode) {
      return;
    }

    const socket: Socket = io(apiBaseUrl);
    socket.emit("tasting:join", { code: tastingCode });
    socket.on("tasting:updated", onTastingUpdated);

    return () => {
      socket.disconnect();
    };
  }, [tastingCode, onTastingUpdated]);
}
