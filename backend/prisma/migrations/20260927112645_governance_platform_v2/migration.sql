/*
  Warnings:

  - You are about to drop the column `assignedDepartment` on the `Grievance` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[country,state,district]` on the table `DistrictDemographic` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "AiAnalysisType" AS ENUM ('POLICY_QUERY', 'GRIEVANCE_CLASSIFICATION', 'PLAN_GAP_ANALYSIS', 'PROJECT_IMPACT', 'DISTRICT_SUMMARY', 'EXECUTIVE_SUMMARY');

-- CreateEnum
CREATE TYPE "AiMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('EXECUTIVE_SUMMARY', 'GRIEVANCE_REPORT', 'PROJECT_REPORT', 'POLICY_GAP_REPORT', 'DISTRICT_REPORT', 'FINANCIAL_REPORT');

-- DropIndex
DROP INDEX "DistrictDemographic_district_key";

-- AlterTable
ALTER TABLE "ConversationSession" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "GovernmentProject" ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "progressPercentage" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Grievance" DROP COLUMN "assignedDepartment",
ADD COLUMN     "assignedDepartmentId" TEXT;

-- AlterTable
ALTER TABLE "GrievanceAuditLog" ADD COLUMN     "actorType" TEXT,
ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "PolicyGapInsight" ADD COLUMN     "analysisPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "analysisPeriodStart" TIMESTAMP(3),
ADD COLUMN     "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "generatedBy" TEXT,
ADD COLUMN     "reviewed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT;

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMilestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectExpenditure" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "amountInCr" DOUBLE PRECISION NOT NULL,
    "expenditureDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectExpenditure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyAiSession" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PolicyAiSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyAiMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "AiMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "evidence" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyAiMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAnalysis" (
    "id" TEXT NOT NULL,
    "type" "AiAnalysisType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "model" TEXT,
    "confidence" DOUBLE PRECISION,
    "sourceData" JSONB,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernanceReport" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reportType" "ReportType" NOT NULL,
    "country" TEXT,
    "state" TEXT,
    "district" TEXT,
    "parameters" JSONB,
    "generatedBy" TEXT,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovernanceReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE INDEX "Department_name_idx" ON "Department"("name");

-- CreateIndex
CREATE INDEX "ProjectMilestone_projectId_dueDate_idx" ON "ProjectMilestone"("projectId", "dueDate");

-- CreateIndex
CREATE INDEX "ProjectMilestone_projectId_completed_idx" ON "ProjectMilestone"("projectId", "completed");

-- CreateIndex
CREATE INDEX "ProjectExpenditure_projectId_expenditureDate_idx" ON "ProjectExpenditure"("projectId", "expenditureDate");

-- CreateIndex
CREATE INDEX "ProjectExpenditure_expenditureDate_idx" ON "ProjectExpenditure"("expenditureDate");

-- CreateIndex
CREATE INDEX "PolicyAiSession_userId_idx" ON "PolicyAiSession"("userId");

-- CreateIndex
CREATE INDEX "PolicyAiSession_updatedAt_idx" ON "PolicyAiSession"("updatedAt");

-- CreateIndex
CREATE INDEX "PolicyAiMessage_sessionId_createdAt_idx" ON "PolicyAiMessage"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "AiAnalysis_type_createdAt_idx" ON "AiAnalysis"("type", "createdAt");

-- CreateIndex
CREATE INDEX "AiAnalysis_sessionId_idx" ON "AiAnalysis"("sessionId");

-- CreateIndex
CREATE INDEX "GovernanceReport_reportType_createdAt_idx" ON "GovernanceReport"("reportType", "createdAt");

-- CreateIndex
CREATE INDEX "GovernanceReport_country_state_district_idx" ON "GovernanceReport"("country", "state", "district");

-- CreateIndex
CREATE INDEX "ConversationSession_phone_idx" ON "ConversationSession"("phone");

-- CreateIndex
CREATE INDEX "ConversationSession_lastActiveAt_idx" ON "ConversationSession"("lastActiveAt");

-- CreateIndex
CREATE INDEX "DistrictDemographic_country_district_idx" ON "DistrictDemographic"("country", "district");

-- CreateIndex
CREATE UNIQUE INDEX "DistrictDemographic_country_state_district_key" ON "DistrictDemographic"("country", "state", "district");

-- CreateIndex
CREATE INDEX "GovernmentProject_country_state_district_idx" ON "GovernmentProject"("country", "state", "district");

-- CreateIndex
CREATE INDEX "GovernmentProject_districtId_idx" ON "GovernmentProject"("districtId");

-- CreateIndex
CREATE INDEX "GovernmentProject_departmentId_idx" ON "GovernmentProject"("departmentId");

-- CreateIndex
CREATE INDEX "GovernmentProject_startDate_idx" ON "GovernmentProject"("startDate");

-- CreateIndex
CREATE INDEX "GovernmentProject_expectedCompletionDate_idx" ON "GovernmentProject"("expectedCompletionDate");

-- CreateIndex
CREATE INDEX "Grievance_country_state_district_idx" ON "Grievance"("country", "state", "district");

-- CreateIndex
CREATE INDEX "Grievance_districtId_idx" ON "Grievance"("districtId");

-- CreateIndex
CREATE INDEX "Grievance_createdAt_idx" ON "Grievance"("createdAt");

-- CreateIndex
CREATE INDEX "Grievance_assignedDepartmentId_idx" ON "Grievance"("assignedDepartmentId");

-- CreateIndex
CREATE INDEX "GrievanceAuditLog_grievanceId_createdAt_idx" ON "GrievanceAuditLog"("grievanceId", "createdAt");

-- CreateIndex
CREATE INDEX "GrievanceAuditLog_newStatus_idx" ON "GrievanceAuditLog"("newStatus");

-- CreateIndex
CREATE INDEX "PolicyGapInsight_country_state_district_idx" ON "PolicyGapInsight"("country", "state", "district");

-- CreateIndex
CREATE INDEX "PolicyGapInsight_districtId_idx" ON "PolicyGapInsight"("districtId");

-- CreateIndex
CREATE INDEX "PolicyGapInsight_reviewed_idx" ON "PolicyGapInsight"("reviewed");

-- CreateIndex
CREATE INDEX "PolicyGapInsight_createdAt_idx" ON "PolicyGapInsight"("createdAt");

-- AddForeignKey
ALTER TABLE "Grievance" ADD CONSTRAINT "Grievance_assignedDepartmentId_fkey" FOREIGN KEY ("assignedDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernmentProject" ADD CONSTRAINT "GovernmentProject_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "GovernmentProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectExpenditure" ADD CONSTRAINT "ProjectExpenditure_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "GovernmentProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyAiMessage" ADD CONSTRAINT "PolicyAiMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PolicyAiSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
