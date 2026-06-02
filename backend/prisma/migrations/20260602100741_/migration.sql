/*
  Warnings:

  - The values [SPELLING] on the enum `HomeworkType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `orderIndex` on the `homework_parts` table. All the data in the column will be lost.
  - You are about to drop the column `phonicsItems` on the `homework_parts` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `homework_parts` table. All the data in the column will be lost.
  - You are about to drop the column `homeworkId` on the `homework_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `classId` on the `homeworks` table. All the data in the column will be lost.
  - You are about to drop the column `closedDatetime` on the `homeworks` table. All the data in the column will be lost.
  - You are about to drop the column `dayAssigned` on the `homeworks` table. All the data in the column will be lost.
  - You are about to drop the `homework_part_words` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `homework_word_results` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[homeworkId,order]` on the table `homework_parts` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `homework_parts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `order` to the `homework_parts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `assignmentId` to the `homework_sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `homeworks` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "HomeworkType_new" AS ENUM ('PHONICS', 'SPEAKING', 'READING', 'VOCABULARY');
ALTER TABLE "homework_parts" ALTER COLUMN "type" TYPE "HomeworkType_new" USING ("type"::text::"HomeworkType_new");
ALTER TYPE "HomeworkType" RENAME TO "HomeworkType_old";
ALTER TYPE "HomeworkType_new" RENAME TO "HomeworkType";
DROP TYPE "HomeworkType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "homework_part_words" DROP CONSTRAINT "homework_part_words_partId_fkey";

-- DropForeignKey
ALTER TABLE "homework_part_words" DROP CONSTRAINT "homework_part_words_wordId_fkey";

-- DropForeignKey
ALTER TABLE "homework_sessions" DROP CONSTRAINT "homework_sessions_homeworkId_fkey";

-- DropForeignKey
ALTER TABLE "homework_word_results" DROP CONSTRAINT "homework_word_results_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "homework_word_results" DROP CONSTRAINT "homework_word_results_wordId_fkey";

-- DropForeignKey
ALTER TABLE "homeworks" DROP CONSTRAINT "homeworks_classId_fkey";

-- DropIndex
DROP INDEX "homework_parts_homeworkId_orderIndex_key";

-- AlterTable
ALTER TABLE "homework_parts" DROP COLUMN "orderIndex",
DROP COLUMN "phonicsItems",
DROP COLUMN "type",
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "order" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "homework_sessions" DROP COLUMN "homeworkId",
ADD COLUMN     "assignmentId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "homeworks" DROP COLUMN "classId",
DROP COLUMN "closedDatetime",
DROP COLUMN "dayAssigned",
ADD COLUMN     "name" TEXT,
ADD COLUMN     "speakingPictureUrl" TEXT,
ADD COLUMN     "speakingText" TEXT,
ADD COLUMN     "type" "HomeworkType" NOT NULL;

-- DropTable
DROP TABLE "homework_part_words";

-- DropTable
DROP TABLE "homework_word_results";

-- CreateTable
CREATE TABLE "homework_words" (
    "id" SERIAL NOT NULL,
    "partId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "highlight" TEXT,
    "imageUrl" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "homework_words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homework_assignments" (
    "id" SERIAL NOT NULL,
    "homeworkId" INTEGER NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "homework_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homework_assignment_classes" (
    "id" SERIAL NOT NULL,
    "assignmentId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,

    CONSTRAINT "homework_assignment_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phonics_item_results" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "wordId" INTEGER,
    "vocabItemId" INTEGER,
    "transcribedText" TEXT,
    "score" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "phonics_item_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vocab_items" (
    "id" SERIAL NOT NULL,
    "homeworkId" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "phonemes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vocab_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "homework_words_partId_order_key" ON "homework_words"("partId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "homework_assignment_classes_assignmentId_classId_key" ON "homework_assignment_classes"("assignmentId", "classId");

-- CreateIndex
CREATE INDEX "vocab_items_homeworkId_idx" ON "vocab_items"("homeworkId");

-- CreateIndex
CREATE UNIQUE INDEX "homework_parts_homeworkId_order_key" ON "homework_parts"("homeworkId", "order");

-- AddForeignKey
ALTER TABLE "homework_words" ADD CONSTRAINT "homework_words_partId_fkey" FOREIGN KEY ("partId") REFERENCES "homework_parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homework_assignments" ADD CONSTRAINT "homework_assignments_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "homeworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homework_assignment_classes" ADD CONSTRAINT "homework_assignment_classes_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "homework_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homework_assignment_classes" ADD CONSTRAINT "homework_assignment_classes_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homework_sessions" ADD CONSTRAINT "homework_sessions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "homework_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phonics_item_results" ADD CONSTRAINT "phonics_item_results_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "homework_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phonics_item_results" ADD CONSTRAINT "phonics_item_results_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "homework_words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phonics_item_results" ADD CONSTRAINT "phonics_item_results_vocabItemId_fkey" FOREIGN KEY ("vocabItemId") REFERENCES "vocab_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocab_items" ADD CONSTRAINT "vocab_items_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "homeworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
