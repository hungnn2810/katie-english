-- CreateEnum
CREATE TYPE "ReadingActivityType" AS ENUM ('MATCH', 'FILL_BLANK');

-- AlterEnum
ALTER TYPE "HomeworkType" ADD VALUE 'READING';

-- CreateTable
CREATE TABLE "reading_activities" (
    "id" SERIAL NOT NULL,
    "homeworkId" INTEGER NOT NULL,
    "type" "ReadingActivityType" NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "reading_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_pairs" (
    "id" SERIAL NOT NULL,
    "activityId" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "match_pairs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fill_blanks" (
    "id" SERIAL NOT NULL,
    "activityId" INTEGER NOT NULL,
    "sentence" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "fill_blanks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fill_blank_choices" (
    "id" SERIAL NOT NULL,
    "blankId" INTEGER NOT NULL,
    "word" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,

    CONSTRAINT "fill_blank_choices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_results" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "totalItems" INTEGER NOT NULL,
    "correctItems" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "reading_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reading_activities_homeworkId_order_key" ON "reading_activities"("homeworkId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "match_pairs_activityId_order_key" ON "match_pairs"("activityId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "fill_blanks_activityId_order_key" ON "fill_blanks"("activityId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "reading_results_sessionId_key" ON "reading_results"("sessionId");

-- AddForeignKey
ALTER TABLE "reading_activities" ADD CONSTRAINT "reading_activities_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "homeworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_pairs" ADD CONSTRAINT "match_pairs_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "reading_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fill_blanks" ADD CONSTRAINT "fill_blanks_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "reading_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fill_blank_choices" ADD CONSTRAINT "fill_blank_choices_blankId_fkey" FOREIGN KEY ("blankId") REFERENCES "fill_blanks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_results" ADD CONSTRAINT "reading_results_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "homework_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
