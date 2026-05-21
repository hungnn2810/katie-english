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

-- AlterTable
ALTER TABLE "speaking_results" ADD COLUMN     "phonemes" TEXT;

-- AlterTable
ALTER TABLE "words" ADD COLUMN     "phonemes" TEXT;
