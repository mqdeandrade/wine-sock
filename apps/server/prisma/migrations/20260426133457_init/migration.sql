-- CreateEnum
CREATE TYPE "TastingStatus" AS ENUM ('LOBBY', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('GUESSING', 'AWAITING_ANSWER', 'REVEALED');

-- CreateEnum
CREATE TYPE "VarietalColor" AS ENUM ('RED', 'WHITE', 'ROSE', 'SPARKLING', 'DESSERT');

-- CreateTable
CREATE TABLE "Tasting" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "hostTokenHash" TEXT NOT NULL,
    "status" "TastingStatus" NOT NULL DEFAULT 'LOBBY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Tasting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "tastingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sessionTokenHash" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL,
    "tastingId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'GUESSING',
    "correctVarietalId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guessingClosedAt" TIMESTAMP(3),
    "revealedAt" TIMESTAMP(3),

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guess" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "varietalId" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isCorrect" BOOLEAN,

    CONSTRAINT "Guess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Varietal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" "VarietalColor" NOT NULL,
    "notes" TEXT NOT NULL,
    "commonDescriptors" TEXT[],
    "typicalRegions" TEXT[],
    "aliases" TEXT[],

    CONSTRAINT "Varietal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tasting_code_key" ON "Tasting"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_tastingId_name_key" ON "Participant"("tastingId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Round_tastingId_roundNumber_key" ON "Round"("tastingId", "roundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Guess_roundId_participantId_key" ON "Guess"("roundId", "participantId");

-- CreateIndex
CREATE UNIQUE INDEX "Varietal_name_key" ON "Varietal"("name");

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_tastingId_fkey" FOREIGN KEY ("tastingId") REFERENCES "Tasting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_tastingId_fkey" FOREIGN KEY ("tastingId") REFERENCES "Tasting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_correctVarietalId_fkey" FOREIGN KEY ("correctVarietalId") REFERENCES "Varietal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guess" ADD CONSTRAINT "Guess_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guess" ADD CONSTRAINT "Guess_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guess" ADD CONSTRAINT "Guess_varietalId_fkey" FOREIGN KEY ("varietalId") REFERENCES "Varietal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
