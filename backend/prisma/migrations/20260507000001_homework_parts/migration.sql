-- CreateTable: homework_parts
CREATE TABLE "homework_parts" (
    "id" SERIAL NOT NULL,
    "homeworkId" INTEGER NOT NULL,
    "type" "HomeworkType" NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "phonicsItems" TEXT[] NOT NULL DEFAULT '{}',
    CONSTRAINT "homework_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: homework_part_words
CREATE TABLE "homework_part_words" (
    "id" SERIAL NOT NULL,
    "partId" INTEGER NOT NULL,
    "wordId" INTEGER NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    CONSTRAINT "homework_part_words_pkey" PRIMARY KEY ("id")
);

-- Migrate: one part per existing homework
INSERT INTO "homework_parts" ("homeworkId", "type", "orderIndex", "phonicsItems")
SELECT id, type, 0, "phonicsItems"
FROM "homeworks";

-- Migrate: homework_words → homework_part_words
INSERT INTO "homework_part_words" ("partId", "wordId", "orderIndex")
SELECT hp.id, hw."wordId", hw."orderIndex"
FROM "homework_words" hw
JOIN "homework_parts" hp ON hp."homeworkId" = hw."homeworkId" AND hp."orderIndex" = 0;

-- AddForeignKey
ALTER TABLE "homework_parts" ADD CONSTRAINT "homework_parts_homeworkId_fkey"
    FOREIGN KEY ("homeworkId") REFERENCES "homeworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "homework_part_words" ADD CONSTRAINT "homework_part_words_partId_fkey"
    FOREIGN KEY ("partId") REFERENCES "homework_parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "homework_part_words" ADD CONSTRAINT "homework_part_words_wordId_fkey"
    FOREIGN KEY ("wordId") REFERENCES "words"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "homework_parts_homeworkId_orderIndex_key" ON "homework_parts"("homeworkId", "orderIndex");
CREATE UNIQUE INDEX "homework_part_words_partId_orderIndex_key" ON "homework_part_words"("partId", "orderIndex");

-- Drop old columns and table
ALTER TABLE "homeworks" DROP COLUMN "type";
ALTER TABLE "homeworks" DROP COLUMN "phonicsItems";
DROP TABLE "homework_words";
