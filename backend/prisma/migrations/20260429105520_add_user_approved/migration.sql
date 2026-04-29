-- CreateEnum
CREATE TYPE "ClassStatus" AS ENUM ('PENDING', 'INPROGRESS', 'ENDED');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "ParentType" AS ENUM ('FATHER', 'MOTHER');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('TEACHER', 'STUDENT');

-- CreateTable
CREATE TABLE "classes" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "ClassStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" SERIAL NOT NULL,
    "fullname" TEXT NOT NULL,
    "sex" "Sex" NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "classId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_infos" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "type" "ParentType" NOT NULL,
    "studentId" INTEGER NOT NULL,

    CONSTRAINT "parent_infos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homeworks" (
    "id" SERIAL NOT NULL,
    "dayAssigned" TIMESTAMP(3) NOT NULL,
    "closedDatetime" TIMESTAMP(3) NOT NULL,
    "timeInSeconds" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homeworks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homework_words" (
    "id" SERIAL NOT NULL,
    "homeworkId" INTEGER NOT NULL,
    "wordId" INTEGER NOT NULL,
    "orderIndex" INTEGER NOT NULL,

    CONSTRAINT "homework_words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homework_sessions" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "homeworkId" INTEGER NOT NULL,
    "videoUrl" TEXT,
    "score" DOUBLE PRECISION,
    "completedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "homework_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homework_word_results" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "wordId" INTEGER NOT NULL,
    "transcribedText" TEXT,
    "score" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "homework_word_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "studentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "classes_code_key" ON "classes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "homework_words_homeworkId_orderIndex_key" ON "homework_words"("homeworkId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "homework_word_results_sessionId_wordId_key" ON "homework_word_results"("sessionId", "wordId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_studentId_key" ON "users"("studentId");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_infos" ADD CONSTRAINT "parent_infos_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homeworks" ADD CONSTRAINT "homeworks_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homework_words" ADD CONSTRAINT "homework_words_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "homeworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homework_words" ADD CONSTRAINT "homework_words_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "words"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homework_sessions" ADD CONSTRAINT "homework_sessions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homework_sessions" ADD CONSTRAINT "homework_sessions_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "homeworks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homework_word_results" ADD CONSTRAINT "homework_word_results_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "homework_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homework_word_results" ADD CONSTRAINT "homework_word_results_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "words"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;
