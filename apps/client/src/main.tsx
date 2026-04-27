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

const apiBaseUrl = import.meta.env.VITE_API_URL ?? undefined;
const waitingListVisibleLimit = 4;

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

function outstandingGuessers(tasting: TastingSummary, round: RoundSummary | null) {
  if (!round || round.status !== "guessing") {
    return [];
  }

  const guessedParticipantIds = new Set(round.guesses.map((guess) => guess.participantId));
  return tasting.participants.filter((entry) => !guessedParticipantIds.has(entry.id));
}

function varietalName(varietals: VarietalSummary[], varietalId: string | null) {
  return varietals.find((varietal) => varietal.id === varietalId)?.name ?? "Unknown";
}

function matchesVarietalSearch(varietal: VarietalSummary, searchTerm: string) {
  const search = searchTerm.trim().toLowerCase();
  if (!search) {
    return true;
  }

  return `${varietal.name} ${varietal.notes} ${varietal.commonDescriptors.join(" ")} ${varietal.typicalRegions.join(" ")}`
    .toLowerCase()
    .includes(search);
}

function buildJoinLink(code: string) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("code", code);
  return url.toString();
}

function initialJoinCode() {
  return new URLSearchParams(window.location.search).get("code")?.trim().toUpperCase() ?? "";
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function App() {
  const [inviteCode] = useState(initialJoinCode);
  const [varietals, setVarietals] = useState<VarietalSummary[]>([]);
  const [tasting, setTasting] = useState<TastingSummary | null>(null);
  const [hostToken, setHostToken] = useState<string | null>(null);
  const [participant, setParticipant] = useState<ParticipantSession | null>(null);
  const [joinCode, setJoinCode] = useState(inviteCode);
  const [historyCode, setHistoryCode] = useState("");
  const [name, setName] = useState("");
  const [selectedVarietalId, setSelectedVarietalId] = useState("");
  const [answerVarietalId, setAnswerVarietalId] = useState("");
  const [filter, setFilter] = useState("");
  const [answerFilter, setAnswerFilter] = useState("");
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(Boolean(inviteCode));
  const [inviteFailed, setInviteFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const round = latestRound(tasting);
  const isHost = Boolean(tasting && hostToken);
  const waitingFor = tasting ? outstandingGuessers(tasting, round) : [];
  const visibleWaitingFor = waitingFor.slice(0, waitingListVisibleLimit);
  const hiddenWaitingForCount = Math.max(waitingFor.length - visibleWaitingFor.length, 0);
  const hasLockedGuess = Boolean(
    participant && round?.guesses.some((guess) => guess.participantId === participant.id),
  );
  const filteredVarietals = varietals.filter((varietal) => matchesVarietalSearch(varietal, filter));
  const answerVarietals = varietals.filter((varietal) => matchesVarietalSearch(varietal, answerFilter));

  useEffect(() => {
    fetchVarietals()
      .then(({ varietals: fetchedVarietals }) => setVarietals(fetchedVarietals))
      .catch((caughtError: unknown) => setError((caughtError as Error).message));
  }, []);

  useEffect(() => {
    if (!inviteCode) {
      return;
    }

    void handleOpenInvite();
  }, [inviteCode]);

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

  function setCurrentTastingUrl(code: string) {
    window.history.replaceState(null, "", buildJoinLink(code));
  }

  async function openTastingFromCode(code: string) {
    const normalizedCode = code.trim().toUpperCase();
    const fetched = await fetchTasting(normalizedCode);
    setHostToken(localStorage.getItem(hostStorageKey(normalizedCode)));
    setParticipant(loadParticipantSession(normalizedCode));
    setJoinCode(normalizedCode);
    setHistoryCode(normalizedCode);
    setTasting(fetched.tasting);
    setCurrentTastingUrl(normalizedCode);
  }

  async function handleOpenInvite() {
    if (!inviteCode) {
      return;
    }

    setInviteLoading(true);
    setInviteFailed(false);
    setError(null);

    try {
      await openTastingFromCode(inviteCode);
    } catch (caughtError) {
      setInviteFailed(true);
      setError((caughtError as Error).message);
    } finally {
      setInviteLoading(false);
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
      setHistoryCode(created.tasting.code);
      setCurrentTastingUrl(created.tasting.code);
    });
  }

  async function handleCopyJoinLink() {
    if (!tasting) {
      return;
    }

    const joinLink = buildJoinLink(tasting.code);

    await run(async () => {
      await copyTextToClipboard(joinLink);
      setCopyStatus("Join link copied");
      window.setTimeout(() => setCopyStatus(null), 2200);
    });
  }

  async function handleJoinTasting() {
    await run(async () => {
      const code = joinCode.trim().toUpperCase();
      const joined = await joinTasting(code, name);
      const session = saveParticipantSession(code, joined);
      const fetched = await fetchTasting(code);
      setHostToken(null);
      setParticipant(session);
      setTasting(fetched.tasting);
      setCurrentTastingUrl(code);
    });
  }

  async function handleLoadTasting() {
    await run(async () => {
      const code = historyCode.trim().toUpperCase();
      await openTastingFromCode(code);
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
      setAnswerFilter("");
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
        {tasting && (
          <button className="code-pill" type="button" onClick={handleCopyJoinLink}>
            <span>{tasting.code}</span>
            <small>{copyStatus ?? "Tap to copy link"}</small>
          </button>
        )}
      </section>

      {error && <div className="error">{error}</div>}
      {copyStatus && <div className="notice">{copyStatus}</div>}

      {!tasting && inviteCode ? (
        <section className="grid">
          <article className="card feature-card">
            <p className="eyebrow">Invite link</p>
            <h2>{inviteLoading ? "Opening tasting" : "Could not open tasting"}</h2>
            <p>
              {inviteLoading
                ? `Loading tasting ${inviteCode}.`
                : "Check that the tasting exists and that the API server is reachable."}
            </p>
            {!inviteLoading && (
              <button className="primary" disabled={busy} onClick={handleOpenInvite}>
                Try again
              </button>
            )}
          </article>

          {inviteFailed && (
            <article className="card">
              <p className="eyebrow">Manual join</p>
              <h2>Use the code</h2>
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
          )}
        </section>
      ) : !tasting ? (
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
              {waitingFor.length > 0 && (
                <div className="waiting-list">
                  <span>Waiting for</span>
                  <div>
                    {visibleWaitingFor.map((entry) => (
                      <b key={entry.id}>{entry.name}</b>
                    ))}
                    {hiddenWaitingForCount > 0 && <b>+{hiddenWaitingForCount} more</b>}
                  </div>
                </div>
              )}
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
              filteredAnswerVarietals={answerVarietals}
              answerFilter={answerFilter}
              answerVarietalId={answerVarietalId}
              busy={busy}
              onAnswerFilterChange={setAnswerFilter}
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

          {!isHost && !participant && tasting.status !== "completed" && (
            <article className="card">
              <p className="eyebrow">Join {tasting.code}</p>
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

          {!isHost && !participant && tasting.status === "completed" && (
            <article className="card">
              <p className="eyebrow">Invite closed</p>
              <h2>This tasting has ended</h2>
              <p>New attendees can only join while the tasting is still running.</p>
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
  filteredAnswerVarietals: VarietalSummary[];
  answerFilter: string;
  answerVarietalId: string;
  busy: boolean;
  onAnswerFilterChange: (value: string) => void;
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
  filteredAnswerVarietals,
  answerFilter,
  answerVarietalId,
  busy,
  onAnswerFilterChange,
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
      <h2>Run the tasting</h2>
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
            Search correct varietal
            <input
              placeholder="Try pinotage, pepper, lemon..."
              value={answerFilter}
              onChange={(event) => onAnswerFilterChange(event.target.value)}
            />
          </label>
          <div className="answer-picker">
            {filteredAnswerVarietals.map((varietal) => (
              <button
                className={answerVarietalId === varietal.id ? "answer-option selected" : "answer-option"}
                key={varietal.id}
                type="button"
                onClick={() => onAnswerChange(varietal.id)}
              >
                <span>
                  <strong>{varietal.name}</strong>
                  <small>{varietal.color}</small>
                </span>
                <em>{varietal.notes}</em>
              </button>
            ))}
            {filteredAnswerVarietals.length === 0 && (
              <p className="empty-state">No varietals match that search.</p>
            )}
          </div>
          {answerVarietalId && (
            <p className="selected-answer">
              Correct answer selected: <strong>{varietalName(varietals, answerVarietalId)}</strong>
            </p>
          )}
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
      <h2>{canGuess ? "Pick one varietal" : "Your status"}</h2>
      {round?.status === "revealed" && (
        <p className="result-line">
          Correct answer: <strong>{varietalName(allVarietals, round.correctVarietalId)}</strong>
        </p>
      )}
      {hasLockedGuess && round?.status !== "revealed" && <p>Guess locked. Waiting for others.</p>}
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
  const roundsNewestFirst = [...tasting.rounds].reverse();

  return (
    <article className="card">
      <p className="eyebrow">History</p>
      {tasting.rounds.length === 0 ? (
        <p>No rounds yet.</p>
      ) : (
        <div className="history-list">
          {roundsNewestFirst.map((round, index) => {
            const correctVarietal = varietalName(varietals, round.correctVarietalId);
            return (
              <details className="history-round" key={round.id} open={index === 0}>
                <summary>
                  <span>
                    <strong>Round {round.roundNumber}</strong>
                    <small>
                      {round.status === "revealed" ? correctVarietal : round.status.replace("_", " ")}
                    </small>
                  </span>
                  <b>{round.status === "revealed" ? `${round.guesses.length} guesses` : "In progress"}</b>
                </summary>
                {round.status === "revealed" &&
                  tasting.participants.map((participant) => {
                    const guess = round.guesses.find((entry) => entry.participantId === participant.id);
                    const guessedVarietal = guess ? varietalName(varietals, guess.varietalId) : null;
                    return (
                      <div className="guess-row" key={`${round.id}-${participant.id}`}>
                        <div>
                          <strong>{participant.name}</strong>
                          {guess ? (
                            <>
                              <p>
                                Guessed <b>{guessedVarietal}</b>
                              </p>
                              {!guess.isCorrect && (
                                <p>
                                  Correct answer was <b>{correctVarietal}</b>
                                </p>
                              )}
                            </>
                          ) : (
                            <p>No guess for this round.</p>
                          )}
                        </div>
                        <strong className={guess?.isCorrect ? "result-correct" : "result-missed"}>
                          {guess ? (guess.isCorrect ? "Correct" : "Missed") : "No guess"}
                        </strong>
                      </div>
                    );
                  })}
              </details>
            );
          })}
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
