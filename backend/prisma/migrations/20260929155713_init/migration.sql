/*
  Warnings:

  - The `country` column on the `Grievance` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "BricsCountry" AS ENUM ('RUSSIA', 'INDIA', 'CHINA', 'BRAZIL', 'SOUTH_AFRICA', 'EGYPT', 'ETHIOPIA', 'IRAN', 'SAUDI_ARABIA', 'UAE', 'INDONESIA');

-- CreateEnum
CREATE TYPE "BricsLanguage" AS ENUM ('RU', 'ZH', 'EN', 'PT', 'HI', 'BN', 'TA', 'TE', 'MR', 'GU', 'KN', 'ML', 'PA');

-- AlterTable
ALTER TABLE "DistrictDemographic" ADD COLUMN     "bricsCountry" "BricsCountry" NOT NULL DEFAULT 'INDIA',
ALTER COLUMN "country" DROP DEFAULT;

-- AlterTable
ALTER TABLE "GovernmentProject" ADD COLUMN     "bricsCountry" "BricsCountry" NOT NULL DEFAULT 'INDIA';

-- AlterTable
ALTER TABLE "Grievance" ADD COLUMN     "bricsLanguage" "BricsLanguage" NOT NULL DEFAULT 'HI',
ADD COLUMN     "bricsRegion" TEXT,
DROP COLUMN "country",
ADD COLUMN     "country" "BricsCountry" NOT NULL DEFAULT 'INDIA';

-- CreateTable
CREATE TABLE "BricsMacroIndicator" (
    "id" TEXT NOT NULL,
    "country" "BricsCountry" NOT NULL,
    "year" INTEGER NOT NULL,
    "gdpUsdBn" DOUBLE PRECISION NOT NULL,
    "gdpGrowthPct" DOUBLE PRECISION,
    "populationMn" DOUBLE PRECISION,
    "localPerUsd" DOUBLE PRECISION NOT NULL,
    "infraSpendUsdBn" DOUBLE PRECISION NOT NULL,
    "infraSpendPctGdp" DOUBLE PRECISION NOT NULL,
    "fdiInflowUsdBn" DOUBLE PRECISION,
    "fdiOutflowUsdBn" DOUBLE PRECISION,
    "tradeExportsUsdBn" DOUBLE PRECISION NOT NULL,
    "tradeImportsUsdBn" DOUBLE PRECISION NOT NULL,
    "tradeBalanceUsdBn" DOUBLE PRECISION NOT NULL,
    "currentAccountUsdBn" DOUBLE PRECISION,
    "surplusInfraAllocationPct" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "publicDemandIndex" DOUBLE PRECISION NOT NULL,
    "demandFulfilmentPct" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BricsMacroIndicator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BricsInvestmentFlow" (
    "id" TEXT NOT NULL,
    "investorCountry" "BricsCountry" NOT NULL,
    "recipientCountry" "BricsCountry" NOT NULL,
    "year" INTEGER NOT NULL,
    "sector" TEXT NOT NULL,
    "instrument" TEXT NOT NULL,
    "amountUsdBn" DOUBLE PRECISION NOT NULL,
    "projectCount" INTEGER NOT NULL DEFAULT 1,
    "infraSharePct" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "jobsCreatedK" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BricsInvestmentFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BricsTradeFlow" (
    "id" TEXT NOT NULL,
    "exporter" "BricsCountry" NOT NULL,
    "importer" "BricsCountry" NOT NULL,
    "year" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "valueUsdBn" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BricsTradeFlow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BricsMacroIndicator_year_idx" ON "BricsMacroIndicator"("year");

-- CreateIndex
CREATE INDEX "BricsMacroIndicator_country_idx" ON "BricsMacroIndicator"("country");

-- CreateIndex
CREATE UNIQUE INDEX "BricsMacroIndicator_country_year_key" ON "BricsMacroIndicator"("country", "year");

-- CreateIndex
CREATE INDEX "BricsInvestmentFlow_recipientCountry_year_idx" ON "BricsInvestmentFlow"("recipientCountry", "year");

-- CreateIndex
CREATE INDEX "BricsInvestmentFlow_investorCountry_year_idx" ON "BricsInvestmentFlow"("investorCountry", "year");

-- CreateIndex
CREATE UNIQUE INDEX "BricsInvestmentFlow_investorCountry_recipientCountry_year_s_key" ON "BricsInvestmentFlow"("investorCountry", "recipientCountry", "year", "sector", "instrument");

-- CreateIndex
CREATE INDEX "BricsTradeFlow_importer_year_idx" ON "BricsTradeFlow"("importer", "year");

-- CreateIndex
CREATE INDEX "BricsTradeFlow_exporter_year_idx" ON "BricsTradeFlow"("exporter", "year");

-- CreateIndex
CREATE UNIQUE INDEX "BricsTradeFlow_exporter_importer_year_category_key" ON "BricsTradeFlow"("exporter", "importer", "year", "category");

-- CreateIndex
CREATE INDEX "DistrictDemographic_bricsCountry_idx" ON "DistrictDemographic"("bricsCountry");

-- CreateIndex
CREATE INDEX "GovernmentProject_bricsCountry_idx" ON "GovernmentProject"("bricsCountry");

-- CreateIndex
CREATE INDEX "Grievance_country_state_district_idx" ON "Grievance"("country", "state", "district");

-- CreateIndex
CREATE INDEX "Grievance_bricsRegion_idx" ON "Grievance"("bricsRegion");
