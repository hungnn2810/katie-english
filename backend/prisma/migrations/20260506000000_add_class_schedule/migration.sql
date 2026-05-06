ALTER TABLE "classes" ADD COLUMN "scheduleDays" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "classes" ADD COLUMN "scheduleTime" TEXT;
