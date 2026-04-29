-- CreateTable
CREATE TABLE "phonemes" (
    "id" SERIAL NOT NULL,
    "symbol" TEXT NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "phonemes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "words" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "word_phonemes" (
    "id" SERIAL NOT NULL,
    "wordId" INTEGER NOT NULL,
    "phonemeId" INTEGER NOT NULL,
    "orderIndex" INTEGER NOT NULL,

    CONSTRAINT "word_phonemes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "phonemes_symbol_key" ON "phonemes"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "words_text_key" ON "words"("text");

-- CreateIndex
CREATE UNIQUE INDEX "word_phonemes_wordId_orderIndex_key" ON "word_phonemes"("wordId", "orderIndex");

-- AddForeignKey
ALTER TABLE "word_phonemes" ADD CONSTRAINT "word_phonemes_wordId_fkey"
    FOREIGN KEY ("wordId") REFERENCES "words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "word_phonemes" ADD CONSTRAINT "word_phonemes_phonemeId_fkey"
    FOREIGN KEY ("phonemeId") REFERENCES "phonemes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
