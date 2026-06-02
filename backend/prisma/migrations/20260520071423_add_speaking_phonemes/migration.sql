/*
  Warnings:

  - You are about to drop the column `scheduleDays` on the `classes` table. All the data in the column will be lost.
  - You are about to drop the column `scheduleTime` on the `classes` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "classes" DROP COLUMN "scheduleDays",
DROP COLUMN "scheduleTime";

-- AlterTable
ALTER TABLE "homeworks" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable (was created manually in prod, missing from migrations)
CREATE TABLE IF NOT EXISTS "speaking_results" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "transcribedText" TEXT,
    "score" DOUBLE PRECISION NOT NULL,
    "matchedWords" INTEGER NOT NULL,
    "totalWords" INTEGER NOT NULL,
    CONSTRAINT "speaking_results_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "speaking_results_sessionId_key" ON "speaking_results"("sessionId");

ALTER TABLE "speaking_results" ADD CONSTRAINT "speaking_results_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "homework_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "speaking_results" ADD COLUMN IF NOT EXISTS "phonemes" TEXT;

-- AlterTable
ALTER TABLE "words" ADD COLUMN     "phonemes" TEXT;
