-- Drop old result tables first (no deps after sessions gone)
DROP TABLE IF EXISTS "homework_word_results";
DROP TABLE IF EXISTS "phonics_item_results";
DROP TABLE IF EXISTS "speaking_results";
DROP TABLE IF EXISTS "homework_sessions";
DROP TABLE IF EXISTS "homework_part_words";
DROP TABLE IF EXISTS "homework_parts";
DROP TABLE IF EXISTS "homeworks";

-- Recreate HomeworkType enum with only PHONICS and SPEAKING
DROP TYPE IF EXISTS "HomeworkType";
CREATE TYPE "HomeworkType" AS ENUM ('PHONICS', 'SPEAKING');

-- Homework template (reusable, no class or date)
CREATE TABLE "homeworks" (
    "id" SERIAL NOT NULL,
    "type" "HomeworkType" NOT NULL,
    "phonicsItems" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "speakingPictureUrl" TEXT,
    "speakingText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "homeworks_pkey" PRIMARY KEY ("id")
);

-- Assignment: links a homework to one or more classes with a deadline
CREATE TABLE "homework_assignments" (
    "id" SERIAL NOT NULL,
    "homeworkId" INTEGER NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "homework_assignments_pkey" PRIMARY KEY ("id")
);

-- Junction: which classes are in each assignment
CREATE TABLE "homework_assignment_classes" (
    "id" SERIAL NOT NULL,
    "assignmentId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    CONSTRAINT "homework_assignment_classes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "homework_assignment_classes_assignmentId_classId_key" UNIQUE ("assignmentId", "classId")
);

-- Student session against an assignment
CREATE TABLE "homework_sessions" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "assignmentId" INTEGER NOT NULL,
    "videoUrl" TEXT,
    "score" DOUBLE PRECISION,
    "completedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "homework_sessions_pkey" PRIMARY KEY ("id")
);

-- One speaking result per session
CREATE TABLE "speaking_results" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "transcribedText" TEXT,
    "score" DOUBLE PRECISION NOT NULL,
    "matchedWords" INTEGER NOT NULL,
    "totalWords" INTEGER NOT NULL,
    CONSTRAINT "speaking_results_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "speaking_results_sessionId_key" UNIQUE ("sessionId")
);

-- One phonics result per item index per session
CREATE TABLE "phonics_item_results" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "itemIndex" INTEGER NOT NULL,
    "itemText" TEXT NOT NULL,
    "transcribedText" TEXT,
    "score" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "phonics_item_results_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "phonics_item_results_sessionId_itemIndex_key" UNIQUE ("sessionId", "itemIndex")
);

-- Foreign keys
ALTER TABLE "homework_assignments" ADD CONSTRAINT "homework_assignments_homeworkId_fkey"
    FOREIGN KEY ("homeworkId") REFERENCES "homeworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "homework_assignment_classes" ADD CONSTRAINT "homework_assignment_classes_assignmentId_fkey"
    FOREIGN KEY ("assignmentId") REFERENCES "homework_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "homework_assignment_classes" ADD CONSTRAINT "homework_assignment_classes_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "homework_sessions" ADD CONSTRAINT "homework_sessions_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "homework_sessions" ADD CONSTRAINT "homework_sessions_assignmentId_fkey"
    FOREIGN KEY ("assignmentId") REFERENCES "homework_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "speaking_results" ADD CONSTRAINT "speaking_results_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "homework_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "phonics_item_results" ADD CONSTRAINT "phonics_item_results_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "homework_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
