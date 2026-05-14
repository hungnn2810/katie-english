-- Add name to homeworks, drop flat phonicsItems array
ALTER TABLE "homeworks" ADD COLUMN "name" TEXT;
ALTER TABLE "homeworks" DROP COLUMN IF EXISTS "phonicsItems";

-- Parts table: each part belongs to a PHONICS homework
CREATE TABLE "homework_parts" (
    "id"         SERIAL  NOT NULL,
    "homeworkId" INTEGER NOT NULL,
    "name"       TEXT    NOT NULL,
    "order"      INTEGER NOT NULL,
    CONSTRAINT "homework_parts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "homework_parts_homeworkId_order_key" UNIQUE ("homeworkId", "order")
);

-- Words table: each word belongs to a part
CREATE TABLE "homework_words" (
    "id"        SERIAL  NOT NULL,
    "partId"    INTEGER NOT NULL,
    "text"      TEXT    NOT NULL,
    "highlight" TEXT,
    "imageUrl"  TEXT,
    "order"     INTEGER NOT NULL,
    CONSTRAINT "homework_words_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "homework_words_partId_order_key" UNIQUE ("partId", "order")
);

-- Rewrite phonics_item_results: wordId replaces itemIndex + itemText
ALTER TABLE "phonics_item_results"
    DROP CONSTRAINT IF EXISTS "phonics_item_results_sessionId_itemIndex_key";
ALTER TABLE "phonics_item_results" DROP COLUMN IF EXISTS "itemIndex";
ALTER TABLE "phonics_item_results" DROP COLUMN IF EXISTS "itemText";
ALTER TABLE "phonics_item_results" ADD COLUMN "wordId" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "phonics_item_results" ALTER COLUMN "wordId" DROP DEFAULT;
ALTER TABLE "phonics_item_results"
    ADD CONSTRAINT "phonics_item_results_sessionId_wordId_key" UNIQUE ("sessionId", "wordId");

-- Foreign keys
ALTER TABLE "homework_parts" ADD CONSTRAINT "homework_parts_homeworkId_fkey"
    FOREIGN KEY ("homeworkId") REFERENCES "homeworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "homework_words" ADD CONSTRAINT "homework_words_partId_fkey"
    FOREIGN KEY ("partId") REFERENCES "homework_parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "phonics_item_results" ADD CONSTRAINT "phonics_item_results_wordId_fkey"
    FOREIGN KEY ("wordId") REFERENCES "homework_words"("id") ON DELETE CASCADE ON UPDATE CASCADE;
