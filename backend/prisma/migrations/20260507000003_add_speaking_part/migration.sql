-- AlterTable: add speaking fields to homework_parts
ALTER TABLE "homework_parts" ADD COLUMN "speakingPictureUrl" TEXT;
ALTER TABLE "homework_parts" ADD COLUMN "speakingText" TEXT;

-- CreateTable: speaking_results
CREATE TABLE "speaking_results" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "partId" INTEGER NOT NULL,
    "transcribedText" TEXT,
    "score" DOUBLE PRECISION NOT NULL,
    "matchedWords" INTEGER NOT NULL,
    "totalWords" INTEGER NOT NULL,

    CONSTRAINT "speaking_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "speaking_results_sessionId_partId_key" ON "speaking_results"("sessionId", "partId");

-- AddForeignKey
ALTER TABLE "speaking_results" ADD CONSTRAINT "speaking_results_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "homework_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "speaking_results" ADD CONSTRAINT "speaking_results_partId_fkey"
    FOREIGN KEY ("partId") REFERENCES "homework_parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
