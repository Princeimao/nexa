import { prisma } from '../config/prisma.config.js';
import {
  INITIAL_DISTRICTS,
  INITIAL_GRIEVANCES,
  INITIAL_PLAN_GAPS,
  INITIAL_PROJECTS,
} from './seed.js';
import {
  resolveBricsCountry,
  resolveBricsLanguage,
} from '../utils/brics.js';
import { seedBricsDataset } from './bricsDatasetSeed.js';

const DAY_MS = 86_400_000;

const slugCode = (name: string) =>
  name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 24);

/**
 * Split a project's actual disbursement evenly across the months
 * between its start and completion (capped at today) so monthly
 * investment trends are derived from real project records.
 */
async function seedExpenditures(projectId: string, spent: number, start: Date, end: Date) {
  await prisma.projectExpenditure.deleteMany({ where: { projectId } });
  if (spent <= 0) return;

  const startMs = start.getTime();
  const endMs = Math.min(end.getTime(), Date.now());
  if (endMs <= startMs) {
    await prisma.projectExpenditure.create({
      data: {
        projectId,
        amountInCr: Math.round(spent * 100) / 100,
        expenditureDate: new Date(startMs),
        description: 'Recorded disbursement',
        source: 'Project expenditure ledger',
      },
    });
    return;
  }

  const monthCount = Math.max(
    1,
    Math.round((endMs - startMs) / (30.44 * DAY_MS)),
  );
  const base = Math.round((spent / monthCount) * 100) / 100;
  let allocated = 0;

  for (let i = 0; i < monthCount; i++) {
    const isLast = i === monthCount - 1;
    const amount = isLast
      ? Math.round((spent - allocated) * 100) / 100
      : base;
    allocated += amount;

    const date = new Date(startMs + i * 30.44 * DAY_MS);
    await prisma.projectExpenditure.create({
      data: {
        projectId,
        amountInCr: amount,
        expenditureDate: date,
        description: 'Scheduled monthly disbursement',
        source: 'Project expenditure ledger',
      },
    });
  }
}

export async function seedDatabase() {
  console.log('[Prisma Seeder] Starting PostgreSQL database seeding...');

  try {
    // 1. Seed District Demographics
    for (const d of INITIAL_DISTRICTS) {
      const bricsCountry = resolveBricsCountry(d.country) ?? 'INDIA';
      await prisma.districtDemographic.upsert({
        where: {
          country_state_district: {
            country: d.country,
            state: d.state,
            district: d.district,
          },
        },
        update: {
          country: d.country,
          bricsCountry,
          state: d.state,
          population: d.population,
          ruralPercentage: d.ruralPercentage,
          vulnerabilityIndex: d.vulnerabilityIndex,
          baselineWaterIndex: d.baselineWaterIndex,
          baselineRoadIndex: d.baselineRoadIndex,
          baselinePowerIndex: d.baselinePowerIndex,
          baselineHealthIndex: d.baselineHealthIndex,
          latitude: d.coordinates.lat,
          longitude: d.coordinates.lng,
          activeProjectsCount: d.activeProjectsCount,
          sanctionedBudgetInCr: d.sanctionedBudgetInCr,
        },
        create: {
          id: d.id,
          country: d.country,
          bricsCountry,
          state: d.state,
          district: d.district,
          population: d.population,
          ruralPercentage: d.ruralPercentage,
          vulnerabilityIndex: d.vulnerabilityIndex,
          baselineWaterIndex: d.baselineWaterIndex,
          baselineRoadIndex: d.baselineRoadIndex,
          baselinePowerIndex: d.baselinePowerIndex,
          baselineHealthIndex: d.baselineHealthIndex,
          latitude: d.coordinates.lat,
          longitude: d.coordinates.lng,
          activeProjectsCount: d.activeProjectsCount,
          sanctionedBudgetInCr: d.sanctionedBudgetInCr,
        },
      });
    }
    console.log(`[Prisma Seeder] ✓ Seeded ${INITIAL_DISTRICTS.length} Districts`);

    // 2. Seed Projects (+ real monthly expenditure ledger)
    for (const p of INITIAL_PROJECTS) {
      const districtRecord = await prisma.districtDemographic.findUnique({
        where: {
          country_state_district: {
            country: p.country,
            state: p.state,
            district: p.district,
          },
        },
      });
      const bricsCountry = resolveBricsCountry(p.country) ?? 'INDIA';

      const project = await prisma.governmentProject.upsert({
        where: { projectCode: p.projectCode },
        update: {
          title: p.title,
          schemeName: p.schemeName,
          sector: p.sector,
          country: p.country,
          bricsCountry,
          state: p.state,
          district: p.district,
          sanctionedBudgetInCr: p.sanctionedBudgetInCr,
          spentBudgetInCr: p.spentBudgetInCr,
          targetBeneficiaries: p.targetBeneficiaries,
          status: p.status,
          startDate: new Date(p.startDate),
          expectedCompletionDate: new Date(p.expectedCompletionDate),
          actualCompletionDate: p.actualCompletionDate ? new Date(p.actualCompletionDate) : null,
          description: p.description,
          implementingAgency: p.implementingAgency,
          impactMetricBeforeName: p.impactMetricBefore?.metricName,
          impactMetricBeforeVal: p.impactMetricBefore?.value,
          impactMetricBeforeUnit: p.impactMetricBefore?.unit,
          impactMetricAfterName: p.impactMetricAfter?.metricName,
          impactMetricAfterVal: p.impactMetricAfter?.value,
          impactMetricAfterUnit: p.impactMetricAfter?.unit,
          districtId: districtRecord?.id,
        },
        create: {
          id: p.id,
          projectCode: p.projectCode,
          title: p.title,
          schemeName: p.schemeName,
          sector: p.sector,
          country: p.country,
          bricsCountry,
          state: p.state,
          district: p.district,
          sanctionedBudgetInCr: p.sanctionedBudgetInCr,
          spentBudgetInCr: p.spentBudgetInCr,
          targetBeneficiaries: p.targetBeneficiaries,
          status: p.status,
          startDate: new Date(p.startDate),
          expectedCompletionDate: new Date(p.expectedCompletionDate),
          actualCompletionDate: p.actualCompletionDate ? new Date(p.actualCompletionDate) : null,
          description: p.description,
          implementingAgency: p.implementingAgency,
          impactMetricBeforeName: p.impactMetricBefore?.metricName,
          impactMetricBeforeVal: p.impactMetricBefore?.value,
          impactMetricBeforeUnit: p.impactMetricBefore?.unit,
          impactMetricAfterName: p.impactMetricAfter?.metricName,
          impactMetricAfterVal: p.impactMetricAfter?.value,
          impactMetricAfterUnit: p.impactMetricAfter?.unit,
          districtId: districtRecord?.id,
        },
      });

      const completion = p.actualCompletionDate
        ? new Date(p.actualCompletionDate)
        : new Date(p.expectedCompletionDate);
      await seedExpenditures(
        project.id,
        p.spentBudgetInCr,
        new Date(p.startDate),
        completion,
      );
    }
    console.log(`[Prisma Seeder] ✓ Seeded ${INITIAL_PROJECTS.length} Projects with expenditure ledgers`);

    // 3. Seed Departments referenced by grievances
    const departmentIds = new Map<string, string>();
    for (const g of INITIAL_GRIEVANCES) {
      if (!g.assignedDepartment || departmentIds.has(g.assignedDepartment)) continue;
      const code = slugCode(g.assignedDepartment);
      const dept = await prisma.department.upsert({
        where: { code },
        update: { name: g.assignedDepartment },
        create: { name: g.assignedDepartment, code },
      });
      departmentIds.set(g.assignedDepartment, dept.id);
    }
    console.log(`[Prisma Seeder] ✓ Seeded ${departmentIds.size} Departments`);

    // 4. Seed Grievances
    for (const g of INITIAL_GRIEVANCES) {
      const districtRecord = await prisma.districtDemographic.findUnique({
        where: {
          country_state_district: {
            country: g.location.country,
            state: g.location.state,
            district: g.location.district,
          },
        },
      });

      await prisma.grievance.upsert({
        where: { ticketNumber: g.ticketNumber },
        update: {
          citizenPhone: g.citizenPhone,
          citizenName: g.citizenName,
          channel: g.channel,
          language: g.language,
          bricsLanguage: resolveBricsLanguage(g.language) as any,
          rawTranscript: g.rawTranscript,
          translatedText: g.translatedText,
          category: g.category,
          subCategory: g.subCategory,
          description: g.description,
          country: resolveBricsCountry(g.location.country) ?? 'INDIA',
          state: g.location.state,
          district: g.location.district,
          block: g.location.block,
          villageWard: g.location.villageWard,
          latitude: g.location.coordinates?.lat,
          longitude: g.location.coordinates?.lng,
          severity: g.severity,
          affectedPopulationEst: g.affectedPopulationEst,
          status: g.status,
          urgencyScore: g.urgencyScore,
          confidenceScore: g.confidenceScore,
          verified: g.verified,
          assignedDepartmentId: g.assignedDepartment
            ? departmentIds.get(g.assignedDepartment) ?? null
            : null,
          districtId: districtRecord?.id,
        },
        create: {
          id: g.id,
          ticketNumber: g.ticketNumber,
          citizenPhone: g.citizenPhone,
          citizenName: g.citizenName,
          channel: g.channel,
          language: g.language,
          bricsLanguage: resolveBricsLanguage(g.language) as any,
          rawTranscript: g.rawTranscript,
          translatedText: g.translatedText,
          category: g.category,
          subCategory: g.subCategory,
          description: g.description,
          country: resolveBricsCountry(g.location.country) ?? 'INDIA',
          state: g.location.state,
          district: g.location.district,
          block: g.location.block,
          villageWard: g.location.villageWard,
          latitude: g.location.coordinates?.lat,
          longitude: g.location.coordinates?.lng,
          severity: g.severity,
          affectedPopulationEst: g.affectedPopulationEst,
          status: g.status,
          urgencyScore: g.urgencyScore,
          confidenceScore: g.confidenceScore,
          verified: g.verified,
          assignedDepartmentId: g.assignedDepartment
            ? departmentIds.get(g.assignedDepartment) ?? null
            : null,
          districtId: districtRecord?.id,
        },
      });
    }
    console.log(`[Prisma Seeder] ✓ Seeded ${INITIAL_GRIEVANCES.length} Grievances`);

    // 5. Seed Plan Gaps
    for (const gap of INITIAL_PLAN_GAPS) {
      const districtRecord = await prisma.districtDemographic.findUnique({
        where: {
          country_state_district: {
            country: gap.country,
            state: gap.state,
            district: gap.district,
          },
        },
      });

      await prisma.policyGapInsight.upsert({
        where: { id: gap.id },
        update: {
          country: gap.country,
          state: gap.state,
          district: gap.district,
          sector: gap.sector,
          citizenDemandScore: gap.citizenDemandScore,
          activeProjectBudgetInCr: gap.activeProjectBudgetInCr,
          activeProjectsCount: gap.activeProjectsCount,
          totalComplaints: gap.totalComplaints,
          criticalComplaints: gap.criticalComplaints,
          gapSeverity: gap.gapSeverity,
          affectedPopulation: gap.affectedPopulation,
          primaryKeyProblem: gap.primaryKeyProblem,
          aiRationale: gap.aiRationale,
          recommendedAction: gap.recommendedAction,
          estimatedBudgetRequiredInCr: gap.estimatedBudgetRequiredInCr,
          districtId: districtRecord?.id,
        },
        create: {
          id: gap.id,
          country: gap.country,
          state: gap.state,
          district: gap.district,
          sector: gap.sector,
          citizenDemandScore: gap.citizenDemandScore,
          activeProjectBudgetInCr: gap.activeProjectBudgetInCr,
          activeProjectsCount: gap.activeProjectsCount,
          totalComplaints: gap.totalComplaints,
          criticalComplaints: gap.criticalComplaints,
          gapSeverity: gap.gapSeverity,
          affectedPopulation: gap.affectedPopulation,
          primaryKeyProblem: gap.primaryKeyProblem,
          aiRationale: gap.aiRationale,
          recommendedAction: gap.recommendedAction,
          estimatedBudgetRequiredInCr: gap.estimatedBudgetRequiredInCr,
          districtId: districtRecord?.id,
        },
      });
    }
    console.log(`[Prisma Seeder] ✓ Seeded ${INITIAL_PLAN_GAPS.length} Plan Gaps`);

    // 6. Recalculate district complaint & project counts in PostgreSQL
    const districts = await prisma.districtDemographic.findMany();
    for (const dist of districts) {
      const totalComplaints = await prisma.grievance.count({
        where: { district: dist.district },
      });
      const unresolved = await prisma.grievance.count({
        where: { district: dist.district, status: { not: 'RESOLVED' } },
      });
      const critical = await prisma.grievance.count({
        where: {
          district: dist.district,
          severity: { in: ['CRITICAL', 'HIGH'] },
        },
      });
      const projects = await prisma.governmentProject.findMany({
        where: { district: dist.district },
      });
      const budget = projects.reduce((acc, p) => acc + p.sanctionedBudgetInCr, 0);

      await prisma.districtDemographic.update({
        where: { id: dist.id },
        data: {
          totalComplaintsCount: totalComplaints,
          unresolvedCount: unresolved,
          criticalComplaintsCount: critical,
          activeProjectsCount: projects.length,
          sanctionedBudgetInCr: budget,
        },
      });
    }

    console.log('[Prisma Seeder] ✅ All PostgreSQL tables successfully populated and synchronized!');

    // 7. BRICS macro / investment / trade dataset (deterministic, sourced)
    try {
      await seedBricsDataset();
    } catch (err: any) {
      console.warn('[Prisma Seeder] BRICS dataset skipped:', err.message);
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Prisma Seeder Error]:', err);
    throw err;
  }
}
