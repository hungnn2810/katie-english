-- CreateEnum
CREATE TYPE "TuitionStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');

-- AlterEnum
ALTER TYPE "HomeworkType" ADD VALUE 'LISTEN';

-- CreateTable
CREATE TABLE "tuition_configs" (
    "id" SERIAL NOT NULL,
    "classId" INTEGER NOT NULL,
    "pricePerSession" INTEGER NOT NULL,
    "bookFee" INTEGER,
    "dueDayOfMonth" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tuition_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tuition_records" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "tuitionAmount" INTEGER NOT NULL,
    "bookFee" INTEGER NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "TuitionStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "paidBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tuition_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tuition_notification_logs" (
    "id" SERIAL NOT NULL,
    "tuitionRecordId" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "zaloResponse" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tuition_notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tuition_configs_classId_key" ON "tuition_configs"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "tuition_records_studentId_classId_month_year_key" ON "tuition_records"("studentId", "classId", "month", "year");

-- AddForeignKey
ALTER TABLE "tuition_configs" ADD CONSTRAINT "tuition_configs_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tuition_records" ADD CONSTRAINT "tuition_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tuition_records" ADD CONSTRAINT "tuition_records_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tuition_notification_logs" ADD CONSTRAINT "tuition_notification_logs_tuitionRecordId_fkey" FOREIGN KEY ("tuitionRecordId") REFERENCES "tuition_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
