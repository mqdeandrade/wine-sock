import cors from "cors";
import express from "express";
import type { Server } from "socket.io";
import { z } from "zod";
import {
  RoundStatus as PrismaRoundStatus,
  TastingStatus as PrismaTastingStatus,
} from "@prisma/client";
import { prisma } from "./db/prisma.js";
import {
  assertRoundCanAcceptGuess,
  assertRoundCanReveal,
  canJoinTasting,
  nextRoundNumber,
  shouldCloseGuessing,
} from "./domain/rounds.js";
import { createSessionToken, createTastingCode, hashToken } from "./domain/tokens.js";
import { asyncHandler, errorHandler, HttpError } from "./api/errors.js";
import { emitTastingUpdate } from "./api/realtime.js";
import { tastingInclude, toTastingSummary, toVarietalSummary } from "./api/mappers.js";

const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

const createTastingSchema = z.object({
  hostName: z.string().trim().min(1).max(60).optional(),
});

const joinTastingSchema = z.object({
  name: z.string().trim().min(1).max(60),
});

const hostActionSchema = z.object({
  hostToken: z.string().min(1),
});

const guessSchema = z.object({
  participantId: z.string().min(1),
  sessionToken: z.string().min(1),
  varietalId: z.string().min(1),
});

const revealSchema = hostActionSchema.extend({
  correctVarietalId: z.string().min(1),
});

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

function routeParam(value: string | string[] | undefined, name: string) {
  if (typeof value !== "string" || value.length === 0) {
    throw new HttpError(400, `Missing route parameter: ${name}.`);
  }

  return value;
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

async function getTastingByCode(code: string) {
  const tasting = await prisma.tasting.findUnique({
    where: { code: normalizeCode(code) },
    include: tastingInclude,
  });

  if (!tasting) {
    throw new HttpError(404, "Tasting not found.");
  }

  return tasting;
}

async function assertHost(tastingId: string, hostToken: string) {
  const tasting = await prisma.tasting.findUnique({
    where: { id: tastingId },
    select: { id: true, code: true, hostTokenHash: true, status: true },
  });

  if (!tasting) {
    throw new HttpError(404, "Tasting not found.");
  }

  if (tasting.hostTokenHash !== hashToken(hostToken)) {
    throw new HttpError(403, "Invalid host token.");
  }

  return tasting;
}

async function createUniqueTasting(hostToken: string) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      return await prisma.tasting.create({
        data: {
          code: createTastingCode(),
          hostTokenHash: hashToken(hostToken),
        },
        include: tastingInclude,
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
    }
  }

  throw new HttpError(500, "Unable to generate a unique tasting code.");
}

export function createApp(io: Server) {
  const app = express();

  app.use(cors({ origin: clientOrigin }));
  app.use(express.json());

  app.get("/api/health", (_request, response) => {
    response.json({ ok: true, service: "wine-sock" });
  });

  app.get(
    "/api/varietals",
    asyncHandler(async (_request, response) => {
      const varietals = await prisma.varietal.findMany({ orderBy: { name: "asc" } });
      response.json({ varietals: varietals.map(toVarietalSummary) });
    }),
  );

  app.post(
    "/api/tastings",
    asyncHandler(async (request, response) => {
      createTastingSchema.parse(request.body);
      const hostToken = createSessionToken();
      const tasting = await createUniqueTasting(hostToken);

      response.status(201).json({
        tasting: toTastingSummary(tasting),
        hostToken,
      });
    }),
  );

  app.get(
    "/api/tastings/:code",
    asyncHandler(async (request, response) => {
      const tasting = await getTastingByCode(routeParam(request.params.code, "code"));
      response.json({ tasting: toTastingSummary(tasting) });
    }),
  );

  app.get(
    "/api/tastings/:code/results",
    asyncHandler(async (request, response) => {
      const tasting = await getTastingByCode(routeParam(request.params.code, "code"));
      response.json({ tasting: toTastingSummary(tasting) });
    }),
  );

  app.post(
    "/api/tastings/:code/join",
    asyncHandler(async (request, response) => {
      const { name } = joinTastingSchema.parse(request.body);
      const code = routeParam(request.params.code, "code");
      const tasting = await prisma.tasting.findUnique({
        where: { code: normalizeCode(code) },
      });

      if (!tasting) {
        throw new HttpError(404, "Tasting not found.");
      }

      if (!canJoinTasting(tasting.status.toLowerCase() as "lobby" | "active" | "completed")) {
        throw new HttpError(409, "This tasting has already ended.");
      }

      const sessionToken = createSessionToken();

      try {
        const participant = await prisma.participant.create({
          data: {
            tastingId: tasting.id,
            name,
            sessionTokenHash: hashToken(sessionToken),
          },
        });

        await emitTastingUpdate(io, tasting.id);
        response.status(201).json({ participant, sessionToken });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new HttpError(409, "That name is already taken in this tasting.");
        }

        throw error;
      }
    }),
  );

  app.post(
    "/api/tastings/:id/rounds",
    asyncHandler(async (request, response) => {
      const { hostToken } = hostActionSchema.parse(request.body);
      const tastingId = routeParam(request.params.id, "id");

      const round = await prisma.$transaction(async (tx) => {
        const tasting = await tx.tasting.findUnique({
          where: { id: tastingId },
        });

        if (!tasting) {
          throw new HttpError(404, "Tasting not found.");
        }

        const rounds = await tx.round.findMany({
          where: { tastingId: tasting.id },
          select: { roundNumber: true, status: true },
        });

        if (tasting.hostTokenHash !== hashToken(hostToken)) {
          throw new HttpError(403, "Invalid host token.");
        }

        if (tasting.status === PrismaTastingStatus.COMPLETED) {
          throw new HttpError(409, "This tasting has already ended.");
        }

        const unfinishedRound = rounds.find(
          (existingRound) => existingRound.status !== PrismaRoundStatus.REVEALED,
        );

        if (unfinishedRound) {
          throw new HttpError(409, "Reveal the current round before starting another.");
        }

        const createdRound = await tx.round.create({
          data: {
            tastingId: tasting.id,
            roundNumber: nextRoundNumber(rounds.map((existingRound) => existingRound.roundNumber)),
          },
        });

        await tx.tasting.update({
          where: { id: tasting.id },
          data: {
            status: PrismaTastingStatus.ACTIVE,
            startedAt: tasting.startedAt ?? new Date(),
          },
        });

        return createdRound;
      });

      await emitTastingUpdate(io, tastingId);
      response.status(201).json({ round });
    }),
  );

  app.post(
    "/api/rounds/:id/guesses",
    asyncHandler(async (request, response) => {
      const { participantId, sessionToken, varietalId } = guessSchema.parse(request.body);
      const roundId = routeParam(request.params.id, "id");

      const result = await prisma.$transaction(async (tx) => {
        const round = await tx.round.findUnique({
          where: { id: roundId },
        });

        if (!round) {
          throw new HttpError(404, "Round not found.");
        }

        assertRoundCanAcceptGuess(round.status.toLowerCase() as "guessing" | "awaiting_answer" | "revealed");

        const tasting = await tx.tasting.findUnique({
          where: { id: round.tastingId },
          include: { participants: true },
        });

        if (!tasting) {
          throw new HttpError(404, "Tasting not found.");
        }

        if (tasting.status !== PrismaTastingStatus.ACTIVE) {
          throw new HttpError(409, "Tasting is not active.");
        }

        const participant = tasting.participants.find(
          (existingParticipant) => existingParticipant.id === participantId,
        );

        if (!participant || participant.sessionTokenHash !== hashToken(sessionToken)) {
          throw new HttpError(403, "Invalid participant token.");
        }

        const varietal = await tx.varietal.findUnique({ where: { id: varietalId } });
        if (!varietal) {
          throw new HttpError(404, "Varietal not found.");
        }

        try {
          const guess = await tx.guess.create({
            data: {
              roundId: round.id,
              participantId,
              varietalId,
            },
          });

          const existingGuesses = await tx.guess.findMany({ where: { roundId: round.id } });
          const allGuesses = [...existingGuesses, guess];
          const shouldClose = shouldCloseGuessing(
            tasting.participants
              .filter((existingParticipant) => existingParticipant.joinedAt <= round.startedAt)
              .map((existingParticipant) => existingParticipant.id),
            allGuesses,
          );

          if (shouldClose) {
            await tx.round.update({
              where: { id: round.id },
              data: {
                status: PrismaRoundStatus.AWAITING_ANSWER,
                guessingClosedAt: new Date(),
              },
            });
          }

          return { guess, tastingId: round.tastingId, guessingClosed: shouldClose };
        } catch (error) {
          if (isUniqueConstraintError(error)) {
            throw new HttpError(409, "You have already locked a guess for this round.");
          }

          throw error;
        }
      });

      await emitTastingUpdate(io, result.tastingId);
      response.status(201).json(result);
    }),
  );

  app.post(
    "/api/rounds/:id/close",
    asyncHandler(async (request, response) => {
      const { hostToken } = hostActionSchema.parse(request.body);
      const roundId = routeParam(request.params.id, "id");

      const round = await prisma.round.findUnique({
        where: { id: roundId },
      });

      if (!round) {
        throw new HttpError(404, "Round not found.");
      }

      await assertHost(round.tastingId, hostToken);
      assertRoundCanAcceptGuess(round.status.toLowerCase() as "guessing" | "awaiting_answer" | "revealed");

      const updatedRound = await prisma.round.update({
        where: { id: round.id },
        data: {
          status: PrismaRoundStatus.AWAITING_ANSWER,
          guessingClosedAt: new Date(),
        },
      });

      await emitTastingUpdate(io, round.tastingId);
      response.json({ round: updatedRound });
    }),
  );

  app.post(
    "/api/rounds/:id/reveal",
    asyncHandler(async (request, response) => {
      const { hostToken, correctVarietalId } = revealSchema.parse(request.body);
      const roundId = routeParam(request.params.id, "id");

      const result = await prisma.$transaction(async (tx) => {
        const round = await tx.round.findUnique({
          where: { id: roundId },
        });

        if (!round) {
          throw new HttpError(404, "Round not found.");
        }

        const tasting = await tx.tasting.findUnique({ where: { id: round.tastingId } });
        if (!tasting) {
          throw new HttpError(404, "Tasting not found.");
        }

        if (tasting.hostTokenHash !== hashToken(hostToken)) {
          throw new HttpError(403, "Invalid host token.");
        }

        assertRoundCanReveal(round.status.toLowerCase() as "guessing" | "awaiting_answer" | "revealed");

        const varietal = await tx.varietal.findUnique({ where: { id: correctVarietalId } });
        if (!varietal) {
          throw new HttpError(404, "Varietal not found.");
        }

        await tx.guess.updateMany({
          where: { roundId: round.id },
          data: { isCorrect: false },
        });
        await tx.guess.updateMany({
          where: { roundId: round.id, varietalId: correctVarietalId },
          data: { isCorrect: true },
        });

        const updatedRound = await tx.round.update({
          where: { id: round.id },
          data: {
            status: PrismaRoundStatus.REVEALED,
            correctVarietalId,
            revealedAt: new Date(),
          },
        });

        return { round: updatedRound, tastingId: round.tastingId };
      });

      await emitTastingUpdate(io, result.tastingId);
      response.json({ round: result.round });
    }),
  );

  app.post(
    "/api/tastings/:id/end",
    asyncHandler(async (request, response) => {
      const { hostToken } = hostActionSchema.parse(request.body);
      const tasting = await assertHost(routeParam(request.params.id, "id"), hostToken);

      if (tasting.status === PrismaTastingStatus.COMPLETED) {
        throw new HttpError(409, "This tasting has already ended.");
      }

      const updatedTasting = await prisma.tasting.update({
        where: { id: tasting.id },
        data: {
          status: PrismaTastingStatus.COMPLETED,
          completedAt: new Date(),
        },
        include: tastingInclude,
      });

      await emitTastingUpdate(io, tasting.id);
      response.json({ tasting: toTastingSummary(updatedTasting) });
    }),
  );

  app.use(errorHandler);

  return app;
}
