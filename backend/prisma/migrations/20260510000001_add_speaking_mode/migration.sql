-- CreateEnum
CREATE TYPE "SpeakingMode" AS ENUM ('FREE_SPEAK', 'SCRIPT_MATCH');

-- AlterTable
ALTER TABLE "homeworks" ADD COLUMN "speakingMode" "SpeakingMode";
