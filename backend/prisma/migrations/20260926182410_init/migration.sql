-- CreateEnum
CREATE TYPE "SectorCategory" AS ENUM ('WATER_SUPPLY', 'RURAL_ROADS', 'POWER_GRID', 'HEALTHCARE', 'SANITATION', 'EDUCATION', 'FLOOD_DRAINAGE');

-- CreateEnum
CREATE TYPE "SeverityLevel" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "GrievanceStatus" AS ENUM ('REGISTERED', 'UNDER_VERIFICATION', 'ESCALATED_TO_PLANNING', 'IN_PROGRESS', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNED', 'SANCTIONED', 'IN_PROGRESS', 'COMPLETED', 'STALLED');

-- CreateEnum
CREATE TYPE "GapSeverity" AS ENUM ('CRITICAL_UNFUNDED', 'HIGH_DEFICIT', 'MODERATE_GAP', 'ALIGNED', 'WELL_FUNDED');

-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('WHATSAPP', 'VOICE_CALL', 'WEB_PORTAL', 'SMS');

-- CreateTable
CREATE TABLE "Grievance" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "citizenPhone" TEXT NOT NULL,
    "citizenName" TEXT NOT NULL,
    "channel" "ChannelType" NOT NULL DEFAULT 'WHATSAPP',
    "language" TEXT NOT NULL DEFAULT 'hi',
    "rawTranscript" TEXT NOT NULL,
    "translatedText" TEXT,
    "category" "SectorCategory" NOT NULL,
    "subCategory" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "block" TEXT,
    "villageWard" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "severity" "SeverityLevel" NOT NULL DEFAULT 'HIGH',
    "affectedPopulationEst" INTEGER NOT NULL DEFAULT 500,
    "status" "GrievanceStatus" NOT NULL DEFAULT 'REGISTERED',
    "urgencyScore" INTEGER NOT NULL DEFAULT 80,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.95,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "assignedDepartment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "districtId" TEXT,

    CONSTRAINT "Grievance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistrictDemographic" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "population" INTEGER NOT NULL,
    "ruralPercentage" DOUBLE PRECISION NOT NULL,
    "vulnerabilityIndex" INTEGER NOT NULL,
    "baselineWaterIndex" INTEGER NOT NULL,
    "baselineRoadIndex" INTEGER NOT NULL,
    "baselinePowerIndex" INTEGER NOT NULL,
    "baselineHealthIndex" INTEGER NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "totalComplaintsCount" INTEGER NOT NULL DEFAULT 0,
    "unresolvedCount" INTEGER NOT NULL DEFAULT 0,
    "criticalComplaintsCount" INTEGER NOT NULL DEFAULT 0,
    "activeProjectsCount" INTEGER NOT NULL DEFAULT 0,
    "sanctionedBudgetInCr" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DistrictDemographic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernmentProject" (
    "id" TEXT NOT NULL,
    "projectCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "schemeName" TEXT NOT NULL,
    "sector" "SectorCategory" NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "sanctionedBudgetInCr" DOUBLE PRECISION NOT NULL,
    "spentBudgetInCr" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "targetBeneficiaries" INTEGER NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startDate" TIMESTAMP(3) NOT NULL,
    "expectedCompletionDate" TIMESTAMP(3) NOT NULL,
    "actualCompletionDate" TIMESTAMP(3),
    "description" TEXT NOT NULL,
    "implementingAgency" TEXT NOT NULL,
    "impactMetricBeforeName" TEXT,
    "impactMetricBeforeVal" DOUBLE PRECISION,
    "impactMetricBeforeUnit" TEXT,
    "impactMetricAfterName" TEXT,
    "impactMetricAfterVal" DOUBLE PRECISION,
    "impactMetricAfterUnit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "districtId" TEXT,

    CONSTRAINT "GovernmentProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyGapInsight" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "sector" "SectorCategory" NOT NULL,
    "citizenDemandScore" INTEGER NOT NULL,
    "activeProjectBudgetInCr" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "activeProjectsCount" INTEGER NOT NULL DEFAULT 0,
    "totalComplaints" INTEGER NOT NULL DEFAULT 0,
    "criticalComplaints" INTEGER NOT NULL DEFAULT 0,
    "gapSeverity" "GapSeverity" NOT NULL DEFAULT 'CRITICAL_UNFUNDED',
    "affectedPopulation" INTEGER NOT NULL DEFAULT 100000,
    "primaryKeyProblem" TEXT NOT NULL,
    "aiRationale" TEXT NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "estimatedBudgetRequiredInCr" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "districtId" TEXT,

    CONSTRAINT "PolicyGapInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationSession" (
    "sessionId" TEXT NOT NULL,
    "channel" "ChannelType" NOT NULL DEFAULT 'WHATSAPP',
    "phone" TEXT NOT NULL,
    "citizenName" TEXT,
    "language" TEXT NOT NULL DEFAULT 'hi',
    "step" TEXT NOT NULL DEFAULT 'COLLECTING_PROBLEM',
    "extractedData" JSONB NOT NULL DEFAULT '{}',
    "missingFields" JSONB NOT NULL DEFAULT '[]',
    "history" JSONB NOT NULL DEFAULT '[]',
    "createdTicketId" TEXT,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationSession_pkey" PRIMARY KEY ("sessionId")
);

-- CreateTable
CREATE TABLE "GrievanceAuditLog" (
    "id" TEXT NOT NULL,
    "grievanceId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT,
    "actor" TEXT NOT NULL DEFAULT 'SYSTEM_AI',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrievanceAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Grievance_ticketNumber_key" ON "Grievance"("ticketNumber");

-- CreateIndex
CREATE INDEX "Grievance_district_category_idx" ON "Grievance"("district", "category");

-- CreateIndex
CREATE INDEX "Grievance_status_severity_idx" ON "Grievance"("status", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "DistrictDemographic_district_key" ON "DistrictDemographic"("district");

-- CreateIndex
CREATE INDEX "DistrictDemographic_state_country_idx" ON "DistrictDemographic"("state", "country");

-- CreateIndex
CREATE UNIQUE INDEX "GovernmentProject_projectCode_key" ON "GovernmentProject"("projectCode");

-- CreateIndex
CREATE INDEX "GovernmentProject_district_sector_idx" ON "GovernmentProject"("district", "sector");

-- CreateIndex
CREATE INDEX "GovernmentProject_status_idx" ON "GovernmentProject"("status");

-- CreateIndex
CREATE INDEX "PolicyGapInsight_district_sector_idx" ON "PolicyGapInsight"("district", "sector");

-- CreateIndex
CREATE INDEX "PolicyGapInsight_gapSeverity_idx" ON "PolicyGapInsight"("gapSeverity");

-- AddForeignKey
ALTER TABLE "Grievance" ADD CONSTRAINT "Grievance_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "DistrictDemographic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernmentProject" ADD CONSTRAINT "GovernmentProject_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "DistrictDemographic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyGapInsight" ADD CONSTRAINT "PolicyGapInsight_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "DistrictDemographic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrievanceAuditLog" ADD CONSTRAINT "GrievanceAuditLog_grievanceId_fkey" FOREIGN KEY ("grievanceId") REFERENCES "Grievance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
