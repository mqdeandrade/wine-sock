ALTER TABLE "Guess" ADD COLUMN "rating" INTEGER;

ALTER TABLE "Guess"
  ADD CONSTRAINT "Guess_rating_check" CHECK ("rating" IS NULL OR ("rating" >= 1 AND "rating" <= 10));
