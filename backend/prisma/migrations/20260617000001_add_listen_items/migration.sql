-- CreateTable
CREATE TABLE "listen_items" (
    "id" SERIAL NOT NULL,
    "homeworkId" INTEGER NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "keywords" TEXT NOT NULL,
    "expectedText" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listen_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listen_item_results" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "listenItemId" INTEGER NOT NULL,
    "itemOrder" INTEGER NOT NULL DEFAULT 0,
    "transcript" TEXT NOT NULL DEFAULT '',
    "semanticScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pronScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "compositeScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bfaFeedback" TEXT,

    CONSTRAINT "listen_item_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "listen_items_homeworkId_idx" ON "listen_items"("homeworkId");

-- AddForeignKey
ALTER TABLE "listen_items" ADD CONSTRAINT "listen_items_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "homeworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listen_item_results" ADD CONSTRAINT "listen_item_results_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "homework_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listen_item_results" ADD CONSTRAINT "listen_item_results_listenItemId_fkey" FOREIGN KEY ("listenItemId") REFERENCES "listen_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
