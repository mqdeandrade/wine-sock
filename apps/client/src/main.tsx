import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { io, type Socket } from "socket.io-client";
import type { RoundSummary, TastingSummary, VarietalSummary } from "@wine-sock/shared";
import {
  closeGuessing,
  createTasting,
  endTasting,
  fetchTasting,
  fetchVarietals,
  joinTasting,
  lockGuess,
  revealRound,
  startRound,
  type JoinTastingResponse,
} from "./api";
import "./styles.css";

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

interface ParticipantSession {
  id: string;
  name: string;
  sessionToken: string;
}

function participantStorageKey(code: string) {
  return `wine-sock:participant:${code}`;
}

function hostStorageKey(code: string) {
  return `wine-sock:host:${code}`;
}

function loadParticipantSession(code: string): ParticipantSession | null {
  const raw = localStorage.getItem(participantStorageKey(code));
  return raw ? (JSON.parse(raw) as ParticipantSession) : null;
}

function saveParticipantSession(code: string, joined: JoinTastingResponse) {
  const session = {
    id: joined.participant.id,
    name: joined.participant.name,
    sessionToken: joined.sessionToken,
  };
  localStorage.setItem(participantStorageKey(code), JSON.stringify(session));
  return session;
}

function latestRound(tasting: TastingSummary | null) {
  return tasting?.rounds.at(-1) ?? null;
}

function guessCount(round: RoundSummary | null) {
  return round?.guesses.length ?? 0;
}

function varietalName(varietals: VarietalSummary[], varietalId: string | null) {
  return varietals.find((varietal) => varietal.id === varietalId)?.name ?? "Unknown";
}

function App() {
  const [varietals, setVarietals] = useState<VarietalSummary[]>([]);
  const [tasting, setTasting] = useState<TastingSummary | null>(null);
  const [hostToken, setHostToken] = useState<string | null>(null);
  const [participant, setParticipant] = useState<ParticipantSession | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [historyCode, setHistoryCode] = useState("");
  const [name, setName] = useState("");
  const [selectedVarietalId, setSelectedVarietalId] = useState("");
  const [answerVarietalId, setAnswerVarietalId] = useState("");
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const round = latestRound(tasting);
  const isHost = Boolean(tasting && hostToken);
  const hasLockedGuess = Boolean(
    participant && round?.guesses.some((guess) => guess.participantId === participant.id),
  );
  const filteredVarietals = varietals.filter((varietal) => {
    const search = filter.trim().toLowerCase();
    if (!search) {
      return true;
    }

    return `${varietal.name} ${varietal.notes} ${varietal.commonDescriptors.join(" ")}`
      .toLowerCase()
      .includes(search);
  });

  useEffect(() => {
    fetchVarietals()
      .then(({ varietals: fetchedVarietals }) => setVarietals(fetchedVarietals))
      .catch((caughtError: unknown) => setError((caughtError as Error).message));
  }, []);

  useEffect(() => {
    if (!tasting) {
      return;
    }

    const socket: Socket = io(apiBaseUrl);
    socket.emit("tasting:join", { code: tasting.code });
    socket.on("tasting:updated", (updatedTasting: TastingSummary) => {
      setTasting(updatedTasting);
    });

    return () => {
      socket.disconnect();
    };
  }, [tasting?.code]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (caughtError) {
      setError((caughtError as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateTasting() {
    await run(async () => {
      const created = await createTasting();
      localStorage.setItem(hostStorageKey(created.tasting.code), created.hostToken);
      setHostToken(created.hostToken);
      setParticipant(null);
      setTasting(created.tasting);
      setJoinCode(created.tasting.code);
    });
  }

  async function handleJoinTasting() {
    await run(async () => {
      const code = joinCode.trim().toUpperCase();
      const joined = await joinTasting(code, name);
      const session = saveParticipantSession(code, joined);
      const fetched = await fetchTasting(code);
      setHostToken(localStorage.getItem(hostStorageKey(code)));
      setParticipant(session);
      setTasting(fetched.tasting);
    });
  }

  async function handleLoadTasting() {
    await run(async () => {
      const code = historyCode.trim().toUpperCase();
      const fetched = await fetchTasting(code);
      setHostToken(localStorage.getItem(hostStorageKey(code)));
      setParticipant(loadParticipantSession(code));
      setTasting(fetched.tasting);
      setJoinCode(code);
    });
  }

  async function handleStartRound() {
    if (!tasting || !hostToken) {
      return;
    }

    await run(async () => {
      await startRound(tasting.id, hostToken);
      setSelectedVarietalId("");
      setAnswerVarietalId("");
    });
  }

  async function handleLockGuess() {
    if (!round || !participant || !selectedVarietalId) {
      return;
    }

    await run(async () => {
      await lockGuess(round.id, participant.id, participant.sessionToken, selectedVarietalId);
    });
  }

  async function handleCloseGuessing() {
    if (!round || !hostToken) {
      return;
    }

    await run(async () => {
      await closeGuessing(round.id, hostToken);
    });
  }

  async function handleRevealRound() {
    if (!round || !hostToken || !answerVarietalId) {
      return;
    }

    await run(async () => {
      await revealRound(round.id, hostToken, answerVarietalId);
    });
  }

  async function handleEndTasting() {
    if (!tasting || !hostToken) {
      return;
    }

    await run(async () => {
      await endTasting(tasting.id, hostToken);
    });
  }

  return (
    <main className="shell">
      <section className="masthead">
        <div>
          <p className="eyebrow">Blind tasting control room</p>
          <h1>Wine Sock</h1>
        </div>
        {tasting && <span className="code-pill">{tasting.code}</span>}
      </section>

      {error && <div className="error">{error}</div>}

      {!tasting ? (
        <section className="grid">
          <article className="card feature-card">
            <p className="eyebrow">Host</p>
            <h2>Create a tasting</h2>
            <p>Start in the lobby, share the code, then run each sock-covered bottle round.</p>
            <button className="primary" disabled={busy} onClick={handleCreateTasting}>
              Create tasting
            </button>
          </article>

          <article className="card">
            <p className="eyebrow">Attendee</p>
            <h2>Join a tasting</h2>
            <label>
              Tasting code
              <input value={joinCode} onChange={(event) => setJoinCode(event.target.value)} />
            </label>
            <label>
              Your name
              <input value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <button className="primary" disabled={busy || !joinCode || !name} onClick={handleJoinTasting}>
              Join
            </button>
          </article>

          <article className="card">
            <p className="eyebrow">Results</p>
            <h2>Open by code</h2>
            <label>
              Tasting code
              <input value={historyCode} onChange={(event) => setHistoryCode(event.target.value)} />
            </label>
            <button className="secondary" disabled={busy || !historyCode} onClick={handleLoadTasting}>
              View tasting
            </button>
          </article>
        </section>
      ) : (
        <section className="workspace">
          <section className="card status-card">
            <div>
              <p className="eyebrow">{tasting.status}</p>
              <h2>{round ? `Round ${round.roundNumber}` : "Lobby"}</h2>
              <p>
                {round
                  ? `${guessCount(round)} of ${tasting.participants.length} guesses locked`
                  : `${tasting.participants.length} attendees joined`}
              </p>
            </div>
            <button
              className="ghost"
              onClick={() => {
                setTasting(null);
                setHostToken(null);
                setParticipant(null);
              }}
            >
              Leave view
            </button>
          </section>

          {isHost && (
            <HostPanel
              tasting={tasting}
              round={round}
              varietals={varietals}
              answerVarietalId={answerVarietalId}
              busy={busy}
              onAnswerChange={setAnswerVarietalId}
              onStartRound={handleStartRound}
              onCloseGuessing={handleCloseGuessing}
              onRevealRound={handleRevealRound}
              onEndTasting={handleEndTasting}
            />
          )}

          {participant && (
            <ParticipantPanel
              participant={participant}
              tasting={tasting}
              round={round}
              varietals={filteredVarietals}
              allVarietals={varietals}
              filter={filter}
              selectedVarietalId={selectedVarietalId}
              hasLockedGuess={hasLockedGuess}
              busy={busy}
              onFilterChange={setFilter}
              onSelectVarietal={setSelectedVarietalId}
              onLockGuess={handleLockGuess}
            />
          )}

          {!isHost && !participant && tasting.status === "lobby" && (
            <article className="card">
              <h2>Join this tasting</h2>
              <label>
                Your name
                <input value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <button className="primary" disabled={busy || !name} onClick={handleJoinTasting}>
                Join {tasting.code}
              </button>
            </article>
          )}

          <Leaderboard tasting={tasting} />
          <RoundHistory tasting={tasting} varietals={varietals} />
        </section>
      )}
    </main>
  );
}

interface HostPanelProps {
  tasting: TastingSummary;
  round: RoundSummary | null;
  varietals: VarietalSummary[];
  answerVarietalId: string;
  busy: boolean;
  onAnswerChange: (value: string) => void;
  onStartRound: () => void;
  onCloseGuessing: () => void;
  onRevealRound: () => void;
  onEndTasting: () => void;
}

function HostPanel({
  tasting,
  round,
  varietals,
  answerVarietalId,
  busy,
  onAnswerChange,
  onStartRound,
  onCloseGuessing,
  onRevealRound,
  onEndTasting,
}: HostPanelProps) {
  const canStartRound = tasting.status !== "completed" && (!round || round.status === "revealed");

  return (
    <article className="card host-card">
      <p className="eyebrow">Host controls</p>
      <h2>Run the table</h2>
      {canStartRound && (
        <button className="primary" disabled={busy} onClick={onStartRound}>
          {round ? "Start next round" : "Start first round"}
        </button>
      )}
      {round?.status === "guessing" && (
        <button className="secondary" disabled={busy} onClick={onCloseGuessing}>
          End guessing early
        </button>
      )}
      {round?.status === "awaiting_answer" && (
        <div className="answer-box">
          <label>
            Correct varietal
            <select value={answerVarietalId} onChange={(event) => onAnswerChange(event.target.value)}>
              <option value="">Choose the revealed bottle</option>
              {varietals.map((varietal) => (
                <option key={varietal.id} value={varietal.id}>
                  {varietal.name}
                </option>
              ))}
            </select>
          </label>
          <button className="primary" disabled={busy || !answerVarietalId} onClick={onRevealRound}>
            Reveal results
          </button>
        </div>
      )}
      {tasting.status !== "completed" && (
        <button className="danger" disabled={busy} onClick={onEndTasting}>
          End tasting
        </button>
      )}
    </article>
  );
}

interface ParticipantPanelProps {
  participant: ParticipantSession;
  tasting: TastingSummary;
  round: RoundSummary | null;
  varietals: VarietalSummary[];
  allVarietals: VarietalSummary[];
  filter: string;
  selectedVarietalId: string;
  hasLockedGuess: boolean;
  busy: boolean;
  onFilterChange: (value: string) => void;
  onSelectVarietal: (value: string) => void;
  onLockGuess: () => void;
}

function ParticipantPanel({
  participant,
  tasting,
  round,
  varietals,
  allVarietals,
  filter,
  selectedVarietalId,
  hasLockedGuess,
  busy,
  onFilterChange,
  onSelectVarietal,
  onLockGuess,
}: ParticipantPanelProps) {
  const canGuess = tasting.status === "active" && round?.status === "guessing" && !hasLockedGuess;

  return (
    <article className="card">
      <p className="eyebrow">Playing as {participant.name}</p>
      <h2>{canGuess ? "Pick one varietal" : "Your table state"}</h2>
      {round?.status === "revealed" && (
        <p className="result-line">
          Correct answer: <strong>{varietalName(allVarietals, round.correctVarietalId)}</strong>
        </p>
      )}
      {hasLockedGuess && round?.status !== "revealed" && <p>Your guess is locked. Waiting for the table.</p>}
      {canGuess && (
        <>
          <label>
            Search notes
            <input
              placeholder="Try pepper, lemon, rose, cassis..."
              value={filter}
              onChange={(event) => onFilterChange(event.target.value)}
            />
          </label>
          <div className="varietal-list">
            {varietals.map((varietal) => (
              <button
                className={selectedVarietalId === varietal.id ? "varietal selected" : "varietal"}
                key={varietal.id}
                onClick={() => onSelectVarietal(varietal.id)}
              >
                <span>
                  <strong>{varietal.name}</strong>
                  <small>{varietal.color}</small>
                </span>
                <em>{varietal.notes}</em>
              </button>
            ))}
          </div>
          <button className="primary sticky-action" disabled={busy || !selectedVarietalId} onClick={onLockGuess}>
            Lock guess
          </button>
        </>
      )}
    </article>
  );
}

function Leaderboard({ tasting }: { tasting: TastingSummary }) {
  return (
    <article className="card">
      <p className="eyebrow">Leaderboard</p>
      <div className="score-list">
        {tasting.leaderboard.map((entry, index) => (
          <div className="score-row" key={entry.participantId}>
            <span>{index + 1}</span>
            <strong>{entry.name}</strong>
            <b>{entry.score}</b>
          </div>
        ))}
      </div>
    </article>
  );
}

function RoundHistory({
  tasting,
  varietals,
}: {
  tasting: TastingSummary;
  varietals: VarietalSummary[];
}) {
  return (
    <article className="card">
      <p className="eyebrow">History</p>
      {tasting.rounds.length === 0 ? (
        <p>No rounds yet.</p>
      ) : (
        <div className="history-list">
          {tasting.rounds.map((round) => (
            <section className="history-round" key={round.id}>
              <h3>Round {round.roundNumber}</h3>
              <p>
                {round.status === "revealed"
                  ? varietalName(varietals, round.correctVarietalId)
                  : round.status.replace("_", " ")}
              </p>
              {round.status === "revealed" &&
                round.guesses.map((guess) => {
                  const participant = tasting.participants.find((entry) => entry.id === guess.participantId);
                  return (
                    <div className="guess-row" key={`${round.id}-${guess.participantId}`}>
                      <span>{participant?.name ?? "Unknown"}</span>
                      <strong>{guess.isCorrect ? "Correct" : "Missed"}</strong>
                    </div>
                  );
                })}
            </section>
          ))}
        </div>
      )}
    </article>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
