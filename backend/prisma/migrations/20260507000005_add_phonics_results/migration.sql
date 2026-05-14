-- CreateTable: phonics_item_results
CREATE TABLE "phonics_item_results" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "partId" INTEGER NOT NULL,
    "itemIndex" INTEGER NOT NULL,
    "itemText" TEXT NOT NULL,
    "transcribedText" TEXT,
    "score" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "phonics_item_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "phonics_item_results_sessionId_partId_itemIndex_key" ON "phonics_item_results"("sessionId", "partId", "itemIndex");

-- AddForeignKey
ALTER TABLE "phonics_item_results" ADD CONSTRAINT "phonics_item_results_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "homework_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phonics_item_results" ADD CONSTRAINT "phonics_item_results_partId_fkey"
    FOREIGN KEY ("partId") REFERENCES "homework_parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
