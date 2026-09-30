import { prisma } from "../config/prisma.config.js";
import type { BricsCountry } from "@prisma/client";
import {
  GrievanceStatus,
  SectorCategory,
  SeverityLevel,
} from "../types/index.js";
import {
  resolveBricsCountry,
  resolveBricsLanguage,
  resolveCountryName,
} from "../utils/brics.js";

const DAY_MS = 86_400_000;

const pctChange = (current: number, previous: number): number => {
  if (previous > 0) return Math.round(((current - previous) / previous) * 1000) / 10;
  if (current > 0) return 100;
  return 0;
};

const SECTOR_COLORS: Record<string, string> = {
  WATER_SUPPLY: "#3B82F6",
  RURAL_ROADS: "#10B981",
  POWER_GRID: "#F59E0B",
  HEALTHCARE: "#EF4444",
  SANITATION: "#8B5CF6",
  EDUCATION: "#06B6D4",
  FLOOD_DRAINAGE: "#64748B",
};

const SECTOR_LABELS: Record<string, string> = {
  WATER_SUPPLY: "Water Supply",
  RURAL_ROADS: "Rural Roads",
  POWER_GRID: "Power Grid",
  HEALTHCARE: "Healthcare",
  SANITATION: "Sanitation",
  EDUCATION: "Education",
  FLOOD_DRAINAGE: "Flood & Drainage",
};

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export class DbService {
  /**
   * 1. Live Summary Metrics (country-scoped) with real period-over-period deltas
   */
  public static async getSummaryMetrics(country?: string) {
    const brics = resolveBricsCountry(country) as BricsCountry | undefined;

    const grievanceWhere = brics ? { country: brics } : {};
    const districtWhere = brics ? { bricsCountry: brics } : {};
    const projectWhere = brics ? { bricsCountry: brics } : {};
    const gapWhere = brics
      ? { country: { equals: resolveCountryName(brics), mode: "insensitive" as const } }
      : {};

    const totalComplaints = await prisma.grievance.count({ where: grievanceWhere });
    const resolvedComplaints = await prisma.grievance.count({
      where: { ...grievanceWhere, status: "RESOLVED" },
    });
    const criticalComplaints = await prisma.grievance.count({
      where: { ...grievanceWhere, severity: "CRITICAL" },
    });

    const resolutionRate =
      totalComplaints > 0
        ? Math.round((resolvedComplaints / totalComplaints) * 100)
        : 0;

    const projectBudgetAgg = await prisma.governmentProject.aggregate({
      _sum: { sanctionedBudgetInCr: true, spentBudgetInCr: true },
      _count: { id: true },
      where: projectWhere,
    });

    const planGapDeficitAgg = await prisma.policyGapInsight.aggregate({
      _sum: { estimatedBudgetRequiredInCr: true },
      where: gapWhere,
    });

    const populationAgg = await prisma.districtDemographic.aggregate({
      _sum: { population: true },
      _count: { id: true },
      where: districtWhere,
    });

    // Sector breakdown from database
    const sectorGroups = await prisma.grievance.groupBy({
      by: ["category", "severity"],
      _count: { id: true },
      where: grievanceWhere,
    });

    const sectorStats: Record<string, { count: number; critical: number }> = {};
    for (const group of sectorGroups) {
      if (!sectorStats[group.category]) {
        sectorStats[group.category] = { count: 0, critical: 0 };
      }
      sectorStats[group.category].count += group._count.id;
      if (group.severity === "CRITICAL" || group.severity === "HIGH") {
        sectorStats[group.category].critical += group._count.id;
      }
    }

    // ---- Real period-over-period deltas (last 30d vs previous 30d) ----
    const now = Date.now();
    const recentStart = new Date(now - 30 * DAY_MS);
    const prevStart = new Date(now - 60 * DAY_MS);

    const [recentComplaints, prevComplaints, recentResolved, prevResolved] =
      await Promise.all([
        prisma.grievance.count({
          where: { ...grievanceWhere, createdAt: { gte: recentStart } },
        }),
        prisma.grievance.count({
          where: { ...grievanceWhere, createdAt: { gte: prevStart, lt: recentStart } },
        }),
        prisma.grievance.count({
          where: {
            ...grievanceWhere,
            status: "RESOLVED",
            createdAt: { gte: recentStart },
          },
        }),
        prisma.grievance.count({
          where: {
            ...grievanceWhere,
            status: "RESOLVED",
            createdAt: { gte: prevStart, lt: recentStart },
          },
        }),
      ]);

    const [recentSpendAgg, prevSpendAgg] = await Promise.all([
      prisma.projectExpenditure.aggregate({
        _sum: { amountInCr: true },
        where: {
          expenditureDate: { gte: recentStart },
          ...(brics ? { project: { bricsCountry: brics } } : {}),
        },
      }),
      prisma.projectExpenditure.aggregate({
        _sum: { amountInCr: true },
        where: {
          expenditureDate: { gte: prevStart, lt: recentStart },
          ...(brics ? { project: { bricsCountry: brics } } : {}),
        },
      }),
    ]);

    const recentRate =
      recentComplaints > 0 ? (recentResolved / recentComplaints) * 100 : 0;
    const prevRate =
      prevComplaints > 0 ? (prevResolved / prevComplaints) * 100 : 0;

    const round1 = (n: number) => Math.round(n * 10) / 10;

    return {
      totalComplaints,
      resolvedComplaints,
      criticalComplaints,
      resolutionRate,
      totalSanctionedBudgetCr: projectBudgetAgg._sum.sanctionedBudgetInCr || 0,
      totalSpentBudgetCr: projectBudgetAgg._sum.spentBudgetInCr || 0,
      unfundedPolicyDeficitCr:
        planGapDeficitAgg._sum.estimatedBudgetRequiredInCr || 0,
      totalPopulationCovered: populationAgg._sum.population || 0,
      activeProjectsCount: projectBudgetAgg._count.id || 0,
      monitoredDistrictsCount: populationAgg._count.id || 0,
      sectorStats,
      periodDeltas: {
        grievancesPct: pctChange(recentComplaints, prevComplaints),
        investmentPct: pctChange(
          recentSpendAgg._sum.amountInCr || 0,
          prevSpendAgg._sum.amountInCr || 0,
        ),
        resolutionRateDelta: round1(recentRate - prevRate),
      },
    };
  }

  /**
   * 2. Geographic Map Data (country-scoped)
   */
  public static async getMapData(country?: string, state?: string) {
    const brics = resolveBricsCountry(country) as BricsCountry | undefined;
    const where: any = {};
    if (brics) where.bricsCountry = brics;
    if (state) where.state = { equals: state, mode: "insensitive" };

    const districts = await prisma.districtDemographic.findMany({
      where,
      include: { planGaps: true },
    });

    return districts.map((d) => {
      const topGap = d.planGaps[0];
      return {
        id: d.id,
        country: d.country,
        bricsCountry: d.bricsCountry,
        state: d.state,
        district: d.district,
        population: d.population,
        ruralPercentage: d.ruralPercentage,
        vulnerabilityIndex: d.vulnerabilityIndex,
        baselineWaterIndex: d.baselineWaterIndex,
        baselineRoadIndex: d.baselineRoadIndex,
        baselinePowerIndex: d.baselinePowerIndex,
        baselineHealthIndex: d.baselineHealthIndex,
        coordinates: { lat: d.latitude, lng: d.longitude },
        totalComplaintsCount: d.totalComplaintsCount,
        unresolvedCount: d.unresolvedCount,
        criticalComplaintsCount: d.criticalComplaintsCount,
        activeProjectsCount: d.activeProjectsCount,
        sanctionedBudgetInCr: d.sanctionedBudgetInCr,
        topGapSector: topGap?.sector || "WATER_SUPPLY",
        topGapScore: topGap?.citizenDemandScore || 50,
        unfundedDeficitInCr: topGap?.estimatedBudgetRequiredInCr || 0,
        gapSeverity: topGap?.gapSeverity || "ALIGNED",
      };
    });
  }

  /**
   * 3. Ranked Hotspots (country-scoped)
   */
  public static async getHotspots(country?: string) {
    const brics = resolveBricsCountry(country) as BricsCountry | undefined;
    const districts = await prisma.districtDemographic.findMany({
      where: brics ? { bricsCountry: brics } : {},
      include: { planGaps: true },
    });

    return districts
      .map((d) => {
        const topGap = d.planGaps[0];
        const compositeRiskScore = Math.round(
          d.vulnerabilityIndex * 0.4 +
            (d.totalComplaintsCount > 0
              ? Math.min(100, d.totalComplaintsCount * 15)
              : 30) *
              0.3 +
            (topGap?.citizenDemandScore || 40) * 0.3,
        );

        return {
          id: d.id,
          district: d.district,
          state: d.state,
          country: d.country,
          bricsCountry: d.bricsCountry,
          population: d.population,
          vulnerabilityIndex: d.vulnerabilityIndex,
          compositeRiskScore,
          criticalComplaints: d.criticalComplaintsCount,
          totalComplaints: d.totalComplaintsCount,
          activeProjects: d.activeProjectsCount,
          sanctionedBudgetInCr: d.sanctionedBudgetInCr,
          coordinates: { lat: d.latitude, lng: d.longitude },
          primaryGrievanceSector: topGap?.sector || "WATER_SUPPLY",
          keyIssue:
            topGap?.primaryKeyProblem ||
            "Infrastructure modernization required.",
        };
      })
      .sort((a, b) => b.compositeRiskScore - a.compositeRiskScore);
  }

  /**
   * 4. Plan Gaps (country-scoped)
   */
  public static async getPlanGaps(filters?: {
    state?: string;
    district?: string;
    sector?: SectorCategory;
    country?: string;
  }) {
    const where: any = {};
    if (filters?.state)
      where.state = { equals: filters.state, mode: "insensitive" };
    if (filters?.district)
      where.district = { equals: filters.district, mode: "insensitive" };
    if (filters?.sector) where.sector = filters.sector;
    const countryName = resolveCountryName(filters?.country);
    if (countryName)
      where.country = { equals: countryName, mode: "insensitive" };

    return await prisma.policyGapInsight.findMany({
      where,
      orderBy: { citizenDemandScore: "desc" },
    });
  }

  /**
   * 5. Grievances (country-scoped)
   */
  public static async getGrievances(filters?: {
    category?: SectorCategory;
    severity?: SeverityLevel;
    status?: GrievanceStatus;
    state?: string;
    district?: string;
    search?: string;
    country?: string;
  }) {
    const where: any = {};
    const brics = resolveBricsCountry(filters?.country) as BricsCountry | undefined;
    if (brics) where.country = brics;
    if (filters?.state)
      where.state = { equals: filters.state, mode: "insensitive" };
    if (filters?.district)
      where.district = { equals: filters.district, mode: "insensitive" };
    if (filters?.category) where.category = filters.category;
    if (filters?.severity) where.severity = filters.severity;
    if (filters?.status) where.status = filters.status;

    if (filters?.search) {
      const q = filters.search.trim();
      where.OR = [
        { ticketNumber: { contains: q, mode: "insensitive" } },
        { citizenName: { contains: q, mode: "insensitive" } },
        { district: { contains: q, mode: "insensitive" } },
        { villageWard: { contains: q, mode: "insensitive" } },
        { rawTranscript: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    const rows = await prisma.grievance.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { assignedDepartment: true },
    });

    return rows.map((g) => ({
      id: g.id,
      ticketNumber: g.ticketNumber,
      citizenPhone: g.citizenPhone,
      citizenName: g.citizenName,
      channel: g.channel as any,
      language: g.language,
      rawTranscript: g.rawTranscript,
      translatedText: g.translatedText || undefined,
      category: g.category as any,
      subCategory: g.subCategory,
      description: g.description,
      location: {
        country: resolveCountryName(g.country) || g.country,
        state: g.state,
        district: g.district,
        block: g.block || undefined,
        villageWard: g.villageWard || undefined,
        coordinates:
          g.latitude && g.longitude
            ? { lat: g.latitude, lng: g.longitude }
            : undefined,
      },
      severity: g.severity as any,
      affectedPopulationEst: g.affectedPopulationEst,
      status: g.status as any,
      urgencyScore: g.urgencyScore,
      confidenceScore: g.confidenceScore,
      verified: g.verified,
      assignedDepartment: g.assignedDepartment?.name || undefined,
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
      resolvedAt: g.resolvedAt ? g.resolvedAt.toISOString() : undefined,
    }));
  }

  /**
   * 6. Create Grievance directly in PostgreSQL
   */
  public static async createGrievance(data: any) {
    const districtRecord = await prisma.districtDemographic.findFirst({
      where: {
        district: { equals: data.location.district, mode: "insensitive" },
      },
    });

    const brics = (resolveBricsCountry(data.location?.country) ??
      districtRecord?.bricsCountry ??
      "INDIA") as BricsCountry;

    let assignedDepartmentId: string | undefined;
    if (data.assignedDepartment) {
      const dept = await prisma.department.findFirst({
        where: {
          OR: [
            { name: { equals: data.assignedDepartment, mode: "insensitive" } },
            { code: { equals: data.assignedDepartment, mode: "insensitive" } },
          ],
        },
      });
      assignedDepartmentId = dept?.id;
    }

    const created = await prisma.grievance.create({
      data: {
        ticketNumber: data.ticketNumber,
        citizenPhone: data.citizenPhone,
        citizenName: data.citizenName,
        channel: data.channel,
        language: data.language || "en",
        bricsLanguage: resolveBricsLanguage(data.language) as any,
        rawTranscript: data.rawTranscript,
        translatedText: data.translatedText,
        category: data.category,
        subCategory: data.subCategory,
        description: data.description,
        country: brics,
        state:
          data.location.state ||
          districtRecord?.state ||
          "N/A",
        district: data.location.district,
        block: data.location.block,
        villageWard: data.location.villageWard,
        latitude: data.location.coordinates?.lat,
        longitude: data.location.coordinates?.lng,
        severity: data.severity,
        affectedPopulationEst: data.affectedPopulationEst || 650,
        status: data.status || "REGISTERED",
        urgencyScore: data.urgencyScore || 80,
        confidenceScore: data.confidenceScore || 0.95,
        verified: data.verified !== undefined ? data.verified : true,
        assignedDepartmentId,
        districtId: districtRecord?.id,
      },
    });

    // Increment complaint count in districtDemographic
    if (districtRecord) {
      await prisma.districtDemographic.update({
        where: { id: districtRecord.id },
        data: {
          totalComplaintsCount: { increment: 1 },
          unresolvedCount: { increment: 1 },
          criticalComplaintsCount:
            data.severity === "CRITICAL" || data.severity === "HIGH"
              ? { increment: 1 }
              : undefined,
        },
      });
    }

    return created;
  }

  /**
   * 7. Update Grievance Status in PostgreSQL
   */
  public static async updateGrievanceStatus(
    id: string,
    status: GrievanceStatus,
  ) {
    const existing = await prisma.grievance.findFirst({
      where: { OR: [{ id }, { ticketNumber: id }] },
    });

    if (!existing) return null;

    const updated = await prisma.grievance.update({
      where: { id: existing.id },
      data: {
        status,
        resolvedAt: status === "RESOLVED" ? new Date() : null,
      },
    });

    if (status === "RESOLVED" && existing.status !== "RESOLVED") {
      if (existing.districtId) {
        await prisma.districtDemographic.update({
          where: { id: existing.districtId },
          data: {
            unresolvedCount: { decrement: 1 },
            ...(existing.severity === "CRITICAL" || existing.severity === "HIGH"
              ? { criticalComplaintsCount: { decrement: 1 } }
              : {}),
          },
        });
      }
    }

    return updated;
  }

  /**
   * 8. Government Projects (country-scoped)
   */
  public static async getProjects(filters?: {
    state?: string;
    district?: string;
    sector?: SectorCategory;
    status?: string;
    country?: string;
  }) {
    const where: any = {};
    if (filters?.state)
      where.state = { equals: filters.state, mode: "insensitive" };
    if (filters?.district)
      where.district = { equals: filters.district, mode: "insensitive" };
    if (filters?.sector) where.sector = filters.sector;
    if (filters?.status) where.status = filters.status;
    const brics = resolveBricsCountry(filters?.country) as BricsCountry | undefined;
    if (brics) where.bricsCountry = brics;

    const rows = await prisma.governmentProject.findMany({
      where,
      orderBy: { sanctionedBudgetInCr: "desc" },
    });

    return rows.map((p) => ({
      id: p.id,
      projectCode: p.projectCode,
      title: p.title,
      schemeName: p.schemeName,
      sector: p.sector as any,
      country: resolveCountryName(p.bricsCountry) || p.country,
      bricsCountry: p.bricsCountry,
      state: p.state,
      district: p.district,
      sanctionedBudgetInCr: p.sanctionedBudgetInCr,
      spentBudgetInCr: p.spentBudgetInCr,
      targetBeneficiaries: p.targetBeneficiaries,
      status: p.status as any,
      startDate: p.startDate.toISOString(),
      expectedCompletionDate: p.expectedCompletionDate.toISOString(),
      actualCompletionDate: p.actualCompletionDate
        ? p.actualCompletionDate.toISOString()
        : undefined,
      description: p.description,
      implementingAgency: p.implementingAgency,
      impactMetricBefore: p.impactMetricBeforeName
        ? {
            metricName: p.impactMetricBeforeName,
            value: p.impactMetricBeforeVal || 0,
            unit: p.impactMetricBeforeUnit || "",
          }
        : undefined,
      impactMetricAfter: p.impactMetricAfterName
        ? {
            metricName: p.impactMetricAfterName,
            value: p.impactMetricAfterVal || 0,
            unit: p.impactMetricAfterUnit || "",
          }
        : undefined,
    }));
  }

  /**
   * 8b. Real trend series for the dashboard — computed from PostgreSQL:
   *   - pipeline: grievances received vs resolved per ISO week (last 12 weeks)
   *   - annualTrend: monthly complaints + actual project expenditure (last 12 months)
   *   - sectorComposition: share of citizen requests per sector
   */
  public static async getTrends(country?: string) {
    const brics = resolveBricsCountry(country) as BricsCountry | undefined;
    const grievanceWhere = brics ? { country: brics } : {};
    const expenditureWhere = {
      ...(brics ? { project: { bricsCountry: brics } } : {}),
    };

    const now = Date.now();
    const twelveMonthsAgo = new Date(now - 365 * DAY_MS);

    const [grievances, expenditures, sectorGroups] = await Promise.all([
      prisma.grievance.findMany({
        where: { ...grievanceWhere, createdAt: { gte: twelveMonthsAgo } },
        select: { createdAt: true, resolvedAt: true, status: true, category: true },
      }),
      prisma.projectExpenditure.findMany({
        where: {
          expenditureDate: { gte: twelveMonthsAgo },
          ...expenditureWhere,
        },
        select: { amountInCr: true, expenditureDate: true },
      }),
      prisma.grievance.groupBy({
        by: ["category"],
        _count: { id: true },
        where: grievanceWhere,
      }),
    ]);

    // ---- Weekly pipeline (last 12 ISO weeks, Monday buckets) ----
    const currentMonday = new Date(now);
    currentMonday.setHours(0, 0, 0, 0);
    const weekday = (currentMonday.getDay() + 6) % 7; // Mon=0
    currentMonday.setDate(currentMonday.getDate() - weekday);

    const weeks: { start: Date; end: Date; label: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const start = new Date(currentMonday);
      start.setDate(start.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      weeks.push({
        start,
        end,
        label: `W${12 - i}`,
      });
    }

    const weekly = weeks.map((w) => {
      const received = grievances.filter(
        (g) => g.createdAt >= w.start && g.createdAt < w.end,
      ).length;
      const resolved = grievances.filter(
        (g) =>
          (g.status === "RESOLVED" || g.resolvedAt) &&
          g.resolvedAt &&
          g.resolvedAt >= w.start &&
          g.resolvedAt < w.end,
      ).length;
      return { label: w.label, grievances: received, resolved };
    });

    // Planning benchmark: rolling 4-week average of incoming demand
    const pipeline = weekly.map((w, i) => {
      const slice = weekly.slice(Math.max(0, i - 3), i + 1);
      const avg =
        slice.reduce((s, x) => s + x.grievances, 0) / (slice.length || 1);
      return { ...w, target: Math.round(avg * 10) / 10 };
    });

    // ---- Monthly trend (last 12 calendar months) ----
    const monthlyBuckets = new Map<
      string,
      { complaints: number; budget: number }
    >();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyBuckets.set(key, { complaints: 0, budget: 0 });
    }

    for (const g of grievances) {
      const key = `${g.createdAt.getFullYear()}-${String(g.createdAt.getMonth() + 1).padStart(2, "0")}`;
      const bucket = monthlyBuckets.get(key);
      if (bucket) bucket.complaints += 1;
    }

    for (const e of expenditures) {
      const key = `${e.expenditureDate.getFullYear()}-${String(e.expenditureDate.getMonth() + 1).padStart(2, "0")}`;
      const bucket = monthlyBuckets.get(key);
      if (bucket) bucket.budget += e.amountInCr;
    }

    const annualTrend = Array.from(monthlyBuckets.entries()).map(
      ([key, value]) => {
        const [year, month] = key.split("-").map(Number);
        return {
          month: `${MONTH_LABELS[month - 1]} ${String(year).slice(2)}`,
          complaints: value.complaints,
          budget: Math.round(value.budget * 10) / 10,
        };
      },
    );

    // ---- Sector composition (share of all citizen requests) ----
    const totalGrievances = sectorGroups.reduce(
      (s, g) => s + g._count.id,
      0,
    );
    const sectorComposition = sectorGroups
      .map((g) => ({
        name: SECTOR_LABELS[g.category] || g.category,
        category: g.category,
        count: g._count.id,
        value:
          totalGrievances > 0
            ? Math.round((g._count.id / totalGrievances) * 100)
            : 0,
        color: SECTOR_COLORS[g.category] || "#94A3B8",
      }))
      .sort((a, b) => b.count - a.count);

    return { pipeline, annualTrend, sectorComposition };
  }

  /**
   * 9. Conversation Session in PostgreSQL
   */
  public static async getSession(sessionId: string) {
    return await prisma.conversationSession.findUnique({
      where: { sessionId },
    });
  }

  public static async saveSession(data: any) {
    return await prisma.conversationSession.upsert({
      where: { sessionId: data.sessionId },
      update: {
        channel: data.channel,
        phone: data.phone,
        citizenName: data.citizenName,
        language: data.language,
        step: data.step,
        extractedData: data.extractedData || {},
        missingFields: data.missingFields || [],
        history: data.history || [],
        createdTicketId: data.createdTicketId,
        lastActiveAt: new Date(),
      },
      create: {
        sessionId: data.sessionId,
        channel: data.channel,
        phone: data.phone,
        citizenName: data.citizenName,
        language: data.language,
        step: data.step,
        extractedData: data.extractedData || {},
        missingFields: data.missingFields || [],
        history: data.history || [],
        createdTicketId: data.createdTicketId,
        lastActiveAt: new Date(),
      },
    });
  }
}
