import type { BricsCountry } from "@prisma/client";
import { prisma } from "../config/prisma.config.js";
import { resolveBricsCountry, resolveCountryName } from "../utils/brics.js";
import { BRICS_COUNTRIES } from "../database/bricsDatasetSeed.js";

/**
 * BRICS investment / trade / demand-fulfilment analytics.
 *
 * Demand model (per country, per year):
 *   demandTotalCr = sum(activeProjectBudgetInCr + estimatedBudgetRequiredInCr)
 *   fundedCr      = sum(activeProjectBudgetInCr)            // already committed
 *   deficitCr     = sum(estimatedBudgetRequiredInCr)        // still unmet
 *   surplusUsdBn  = max(0, tradeBalance) * surplusInfraAllocationPct / 100
 *   surplusCr     = surplusUsdBn * localPerUsd * 100        // 1 USD bn = fx x 100 Cr
 *   fulfilableCr  = fundedCr + surplusCr
 *   fulfilmentPct = min(100, fulfilableCr / demandTotalCr * 100)
 *
 * All USD figures come from BricsMacroIndicator / BricsInvestmentFlow /
 * BricsTradeFlow (seeded by bricsDatasetSeed with published sources);
 * Cr figures come from live PolicyGapInsight / GovernmentProject rows.
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

const LATEST_SEED_YEAR = 2024;

function pairCountryFilter(country: BricsCountry) {
  return [
    { investorCountry: country },
    { recipientCountry: country },
  ];
}

export class BricsInvestmentService {
  /* =========================================================
     1. MACRO (GDP, trade balance, surplus, demand index)
     ========================================================= */
  static async getMacro(country?: string, year?: number) {
    const brics = resolveBricsCountry(country);
    const rows = await prisma.bricsMacroIndicator.findMany({
      where: {
        ...(brics ? { country: brics } : {}),
        ...(year ? { year } : {}),
      },
      orderBy: [{ year: "desc" }, { country: "asc" }],
    });

    const latest = year ?? LATEST_SEED_YEAR;
    return {
      year: latest,
      rows: rows.map((r) => ({
        ...r,
        countryName: resolveCountryName(r.country),
        // tradable surplus that may be channelled into infrastructure
        allocatableSurplusUsdBn:
          r.tradeBalanceUsdBn > 0
            ? round2(
                (r.tradeBalanceUsdBn * r.surplusInfraAllocationPct) / 100,
              )
            : 0,
        allocatableSurplusCr:
          r.tradeBalanceUsdBn > 0
            ? round2(
                (r.tradeBalanceUsdBn *
                  r.surplusInfraAllocationPct) /
                  100 *
                  r.localPerUsd *
                  100,
              )
            : 0,
      })),
    };
  }

  /* =========================================================
     2. CROSS-BORDER INVESTMENT FLOWS
     ========================================================= */
  static async getInvestmentFlows(opts: {
    country?: string;
    year?: number;
    sector?: string;
    instrument?: string;
    limit?: number;
  }) {
    const brics = resolveBricsCountry(opts.country);
    const where = {
      ...(brics ? { OR: pairCountryFilter(brics) } : {}),
      ...(opts.year ? { year: opts.year } : {}),
      ...(opts.sector ? { sector: opts.sector } : {}),
      ...(opts.instrument ? { instrument: opts.instrument } : {}),
    };

    const [flows, totals, byRecipient, byInvestor, bySector, byInstrument, byYear] =
      await Promise.all([
        prisma.bricsInvestmentFlow.findMany({
          where,
          orderBy: [{ year: "desc" }, { amountUsdBn: "desc" }],
          take: Math.min(opts.limit ?? 500, 2000),
        }),
        prisma.bricsInvestmentFlow.aggregate({
          where,
          _sum: { amountUsdBn: true, projectCount: true, jobsCreatedK: true },
          _count: { id: true },
        }),
        prisma.bricsInvestmentFlow.groupBy({
          by: ["recipientCountry"],
          where,
          _sum: { amountUsdBn: true, projectCount: true, jobsCreatedK: true },
          orderBy: { _sum: { amountUsdBn: "desc" } },
        }),
        prisma.bricsInvestmentFlow.groupBy({
          by: ["investorCountry"],
          where,
          _sum: { amountUsdBn: true, projectCount: true },
          orderBy: { _sum: { amountUsdBn: "desc" } },
        }),
        prisma.bricsInvestmentFlow.groupBy({
          by: ["sector"],
          where,
          _sum: { amountUsdBn: true, projectCount: true, jobsCreatedK: true },
          orderBy: { _sum: { amountUsdBn: "desc" } },
        }),
        prisma.bricsInvestmentFlow.groupBy({
          by: ["instrument"],
          where,
          _sum: { amountUsdBn: true, projectCount: true },
          orderBy: { _sum: { amountUsdBn: "desc" } },
        }),
        prisma.bricsInvestmentFlow.groupBy({
          by: ["year"],
          where,
          _sum: { amountUsdBn: true, projectCount: true },
          orderBy: { year: "asc" },
        }),
      ]);

    // Infrastructure-weighted view: how much of each flow actually
    // lands in physical infrastructure (roads, grids, pipes, fibre).
    const infraUsdBn = flows.reduce(
      (s, f) => s + (f.amountUsdBn * f.infraSharePct) / 100,
      0,
    );

    return {
      totalUsdBn: round2(totals._sum.amountUsdBn ?? 0),
      infraUsdBn: round2(infraUsdBn),
      projectCount: totals._sum.projectCount ?? 0,
      jobsCreatedK: round2(totals._sum.jobsCreatedK ?? 0),
      rowCount: totals._count.id,
      flows,
      byRecipient: byRecipient.map((g) => ({
        country: g.recipientCountry,
        name: resolveCountryName(g.recipientCountry),
        amountUsdBn: round2(g._sum.amountUsdBn ?? 0),
        projectCount: g._sum.projectCount ?? 0,
        jobsCreatedK: round2(g._sum.jobsCreatedK ?? 0),
      })),
      byInvestor: byInvestor.map((g) => ({
        country: g.investorCountry,
        name: resolveCountryName(g.investorCountry),
        amountUsdBn: round2(g._sum.amountUsdBn ?? 0),
        projectCount: g._sum.projectCount ?? 0,
      })),
      bySector: bySector.map((g) => ({
        sector: g.sector,
        amountUsdBn: round2(g._sum.amountUsdBn ?? 0),
        projectCount: g._sum.projectCount ?? 0,
        jobsCreatedK: round2(g._sum.jobsCreatedK ?? 0),
      })),
      byInstrument: byInstrument.map((g) => ({
        instrument: g.instrument,
        amountUsdBn: round2(g._sum.amountUsdBn ?? 0),
        projectCount: g._sum.projectCount ?? 0,
      })),
      byYear: byYear.map((g) => ({
        year: g.year,
        amountUsdBn: round2(g._sum.amountUsdBn ?? 0),
        projectCount: g._sum.projectCount ?? 0,
      })),
    };
  }

  /* =========================================================
     3. BILATERAL TRADE
     ========================================================= */
  static async getTrade(opts: {
    country?: string;
    year?: number;
    category?: string;
    limit?: number;
  }) {
    const brics = resolveBricsCountry(opts.country);
    const where = {
      ...(brics
        ? { OR: [{ exporter: brics }, { importer: brics }] }
        : {}),
      ...(opts.year ? { year: opts.year } : {}),
      ...(opts.category ? { category: opts.category } : {}),
    };

    const [flows, totals, byPartner, byCategory, byExporter, byYear] =
      await Promise.all([
        prisma.bricsTradeFlow.findMany({
          where,
          orderBy: [{ year: "desc" }, { valueUsdBn: "desc" }],
          take: Math.min(opts.limit ?? 500, 2000),
        }),
        prisma.bricsTradeFlow.aggregate({
          where,
          _sum: { valueUsdBn: true },
          _count: { id: true },
        }),
        prisma.bricsTradeFlow.groupBy({
          by: ["exporter", "importer"],
          where,
          _sum: { valueUsdBn: true },
          orderBy: { _sum: { valueUsdBn: "desc" } },
        }),
        prisma.bricsTradeFlow.groupBy({
          by: ["category"],
          where,
          _sum: { valueUsdBn: true },
          orderBy: { _sum: { valueUsdBn: "desc" } },
        }),
        prisma.bricsTradeFlow.groupBy({
          by: ["exporter"],
          where,
          _sum: { valueUsdBn: true },
          orderBy: { _sum: { valueUsdBn: "desc" } },
        }),
        prisma.bricsTradeFlow.groupBy({
          by: ["year"],
          where,
          _sum: { valueUsdBn: true },
          orderBy: { year: "asc" },
        }),
      ]);

    return {
      totalUsdBn: round2(totals._sum.valueUsdBn ?? 0),
      rowCount: totals._count.id,
      flows,
      byPartner: byPartner.map((g) => ({
        exporter: g.exporter,
        importer: g.importer,
        label: `${resolveCountryName(g.exporter)} → ${resolveCountryName(g.importer)}`,
        valueUsdBn: round2(g._sum.valueUsdBn ?? 0),
      })),
      byCategory: byCategory.map((g) => ({
        category: g.category,
        valueUsdBn: round2(g._sum.valueUsdBn ?? 0),
      })),
      byExporter: byExporter.map((g) => ({
        country: g.exporter,
        name: resolveCountryName(g.exporter),
        exportsUsdBn: round2(g._sum.valueUsdBn ?? 0),
      })),
      byYear: byYear.map((g) => ({
        year: g.year,
        valueUsdBn: round2(g._sum.valueUsdBn ?? 0),
      })),
    };
  }

  /* =========================================================
     4. HOW BRICS INVESTMENT BUILDS INFRASTRUCTURE
     ========================================================= */
  static async getInfrastructureImpact(opts: {
    country?: string;
    year?: number;
  }) {
    const brics = resolveBricsCountry(opts.country);
    const where = {
      ...(brics ? { OR: pairCountryFilter(brics) } : {}),
      ...(opts.year ? { year: opts.year } : {}),
    };

    const flows = await prisma.bricsInvestmentFlow.findMany({ where });
    if (flows.length === 0) {
      return {
        year: opts.year ?? LATEST_SEED_YEAR,
        inboundUsdBn: 0,
        outboundUsdBn: 0,
        infrastructureUsdBn: 0,
        jobsCreatedK: 0,
        projectCount: 0,
        bySector: [],
        topRecipients: [],
        investors: [],
        narrative: "No investment rows for this scope yet — run the BRICS dataset seed.",
      };
    }

    const inbound = flows.filter(
      (f) => !brics || f.recipientCountry === brics,
    );
    const outbound = flows.filter((f) => !brics || f.investorCountry === brics);

    const infraUsdBn = inbound.reduce(
      (s, f) => s + (f.amountUsdBn * f.infraSharePct) / 100,
      0,
    );
    const jobsK = inbound.reduce((s, f) => s + (f.jobsCreatedK ?? 0), 0);
    const projects = inbound.reduce((s, f) => s + f.projectCount, 0);

    const sectorMap = new Map<
      string,
      { sector: string; totalUsdBn: number; infraUsdBn: number; jobsK: number; projects: number }
    >();
    const recipientMap = new Map<string, { country: BricsCountry; totalUsdBn: number; infraUsdBn: number; jobsK: number; projects: number }>();
    const investorMap = new Map<string, { country: BricsCountry; totalUsdBn: number; infraUsdBn: number; projects: number }>();

    for (const f of inbound) {
      const infra = (f.amountUsdBn * f.infraSharePct) / 100;
      const s = sectorMap.get(f.sector) ?? {
        sector: f.sector,
        totalUsdBn: 0,
        infraUsdBn: 0,
        jobsK: 0,
        projects: 0,
      };
      s.totalUsdBn += f.amountUsdBn;
      s.infraUsdBn += infra;
      s.jobsK += f.jobsCreatedK ?? 0;
      s.projects += f.projectCount;
      sectorMap.set(f.sector, s);

      const r = recipientMap.get(f.recipientCountry) ?? {
        country: f.recipientCountry,
        totalUsdBn: 0,
        infraUsdBn: 0,
        jobsK: 0,
        projects: 0,
      };
      r.totalUsdBn += f.amountUsdBn;
      r.infraUsdBn += infra;
      r.jobsK += f.jobsCreatedK ?? 0;
      r.projects += f.projectCount;
      recipientMap.set(f.recipientCountry, r);

      const i = investorMap.get(f.investorCountry) ?? {
        country: f.investorCountry,
        totalUsdBn: 0,
        infraUsdBn: 0,
        projects: 0,
      };
      i.totalUsdBn += f.amountUsdBn;
      i.infraUsdBn += infra;
      i.projects += f.projectCount;
      investorMap.set(f.investorCountry, i);
    }

    const bySector = [...sectorMap.values()]
      .sort((a, b) => b.infraUsdBn - a.infraUsdBn)
      .map((s) => ({
        ...s,
        totalUsdBn: round2(s.totalUsdBn),
        infraUsdBn: round2(s.infraUsdBn),
        jobsK: round2(s.jobsK),
      }));

    const topRecipients = [...recipientMap.values()]
      .sort((a, b) => b.infraUsdBn - a.infraUsdBn)
      .slice(0, 8)
      .map((r) => ({
        ...r,
        name: resolveCountryName(r.country),
        totalUsdBn: round2(r.totalUsdBn),
        infraUsdBn: round2(r.infraUsdBn),
        jobsK: round2(r.jobsK),
      }));

    const investors = [...investorMap.values()]
      .sort((a, b) => b.infraUsdBn - a.infraUsdBn)
      .map((i) => ({
        ...i,
        name: resolveCountryName(i.country),
        totalUsdBn: round2(i.totalUsdBn),
        infraUsdBn: round2(i.infraUsdBn),
      }));

    const share =
      inbound.reduce((s, f) => s + f.amountUsdBn, 0) > 0
        ? (infraUsdBn / inbound.reduce((s, f) => s + f.amountUsdBn, 0)) * 100
        : 0;

    return {
      year: opts.year ?? LATEST_SEED_YEAR,
      scope: brics ? resolveCountryName(brics) : "BRICS+",
      inboundUsdBn: round2(inbound.reduce((s, f) => s + f.amountUsdBn, 0)),
      outboundUsdBn: round2(outbound.reduce((s, f) => s + f.amountUsdBn, 0)),
      infrastructureUsdBn: round2(infraUsdBn),
      infrastructureSharePct: round2(share),
      jobsCreatedK: round2(jobsK),
      projectCount: projects,
      bySector,
      topRecipients,
      investors,
      narrative: `${round2(infraUsdBn)} USD bn of BRICS investment reached physical infrastructure (roads, grids, water, digital) across ${projects} projects, supporting about ${Math.round(jobsK * 1000)} jobs. ${investors[0] ? `${investors[0].name} is the largest investor in this scope.` : ""}`,
    };
  }

  /* =========================================================
     5. CAN THE TRADE SURPLUS FULFIL PUBLIC DEMAND?
     ========================================================= */
  static async getDemandFulfilment(opts: { country?: string; year?: number }) {
    const brics = resolveBricsCountry(opts.country);
    const targets: BricsCountry[] = brics ? [brics] : [...BRICS_COUNTRIES];
    const year = opts.year ?? LATEST_SEED_YEAR;

    const entries = await Promise.all(
      targets.map((c) => countryDemandReport(c, year)),
    );

    const totals = entries.reduce(
      (acc, e) => ({
        demandTotalCr: acc.demandTotalCr + e.demandTotalCr,
        fundedCr: acc.fundedCr + e.fundedCr,
        deficitCr: acc.deficitCr + e.deficitCr,
        surplusCr: acc.surplusCr + e.surplusCr,
        fulfilableCr: acc.fulfilableCr + e.fulfilableCr,
        shortfallCr: acc.shortfallCr + e.shortfallCr,
      }),
      {
        demandTotalCr: 0,
        fundedCr: 0,
        deficitCr: 0,
        surplusCr: 0,
        fulfilableCr: 0,
        shortfallCr: 0,
      },
    );

    return {
      year,
      scope: brics ? resolveCountryName(brics) : "BRICS+",
      countries: entries.map((e) => ({
        ...e,
        demandTotalCr: round2(e.demandTotalCr),
        fundedCr: round2(e.fundedCr),
        deficitCr: round2(e.deficitCr),
        surplusCr: round2(e.surplusCr),
        fulfilableCr: round2(e.fulfilableCr),
        shortfallCr: round2(e.shortfallCr),
        surplusUsdBn: round2(e.surplusUsdBn),
        tradeBalanceUsdBn: round2(e.tradeBalanceUsdBn),
        sectorBreakdown: e.sectorBreakdown.map((s) => ({
          ...s,
          demandCr: round2(s.demandCr),
          fundedCr: round2(s.fundedCr),
          deficitCr: round2(s.deficitCr),
        })),
      })),
      totals: {
        demandTotalCr: round2(totals.demandTotalCr),
        fundedCr: round2(totals.fundedCr),
        deficitCr: round2(totals.deficitCr),
        surplusCr: round2(totals.surplusCr),
        fulfilableCr: round2(totals.fulfilableCr),
        shortfallCr: round2(totals.shortfallCr),
        fulfilmentPct:
          totals.demandTotalCr > 0
            ? round2(
                Math.min(100, (totals.fulfilableCr / totals.demandTotalCr) * 100),
              )
            : 0,
      },
    };
  }

  /* =========================================================
     6. ONE-CALL SUMMARY (dashboard header + investment page)
     ========================================================= */
  static async getSummary(country?: string, year?: number) {
    const y = year ?? LATEST_SEED_YEAR;
    const [macro, investment, impact, trade, demand] = await Promise.all([
      this.getMacro(country, y),
      this.getInvestmentFlows({ country, year: y }),
      this.getInfrastructureImpact({ country, year: y }),
      this.getTrade({ country, year: y }),
      this.getDemandFulfilment({ country, year: y }),
    ]);

    const macroRows = macro.rows;
    const totalGdp = macroRows.reduce((s, r) => s + r.gdpUsdBn, 0);
    const totalInfra = macroRows.reduce((s, r) => s + r.infraSpendUsdBn, 0);
    const surplusCount = macroRows.filter((r) => r.tradeBalanceUsdBn > 0).length;
    const deficitCount = macroRows.filter((r) => r.tradeBalanceUsdBn < 0).length;

    return {
      year: y,
      scope: demand.scope,
      macro: {
        count: macroRows.length,
        gdpUsdBn: round2(totalGdp),
        infraSpendUsdBn: round2(totalInfra),
        surplusCountries: surplusCount,
        deficitCountries: deficitCount,
        rows: macroRows,
      },
      investment: {
        totalUsdBn: investment.totalUsdBn,
        infraUsdBn: investment.infraUsdBn,
        projectCount: investment.projectCount,
        jobsCreatedK: investment.jobsCreatedK,
        byRecipient: investment.byRecipient,
        byInvestor: investment.byInvestor,
        bySector: investment.bySector,
        byInstrument: investment.byInstrument,
        byYear: investment.byYear,
      },
      impact,
      trade: {
        totalUsdBn: trade.totalUsdBn,
        byPartner: trade.byPartner.slice(0, 20),
        byCategory: trade.byCategory,
        byYear: trade.byYear,
      },
      demand,
    };
  }
}

/* =========================================================
   Per-country demand vs surplus calculation
   ========================================================= */
async function countryDemandReport(country: BricsCountry, year: number) {
  const countryName = resolveCountryName(country);

  const [macro, gapGroups, gapCount] = await Promise.all([
    prisma.bricsMacroIndicator.findUnique({
      where: { country_year: { country, year } },
    }),
    prisma.policyGapInsight.groupBy({
      by: ["sector"],
      where: { country: { equals: countryName, mode: "insensitive" } },
      _sum: {
        activeProjectBudgetInCr: true,
        estimatedBudgetRequiredInCr: true,
      },
      _count: { id: true },
    }),
    prisma.policyGapInsight.count({
      where: { country: { equals: countryName, mode: "insensitive" } },
    }),
  ]);

  const fx = macro?.localPerUsd ?? 0;

  // ---- Live demand from the gap engine ------------------------------
  const sectorBreakdown = gapGroups.map((g) => {
    const fundedCr = g._sum.activeProjectBudgetInCr ?? 0;
    const deficitCr = g._sum.estimatedBudgetRequiredInCr ?? 0;
    return {
      sector: g.sector,
      gapCount: g._count.id,
      demandCr: fundedCr + deficitCr,
      fundedCr,
      deficitCr,
    };
  });

  const fundedCr = sectorBreakdown.reduce((s, x) => s + x.fundedCr, 0);
  const deficitCr = sectorBreakdown.reduce((s, x) => s + x.deficitCr, 0);
  const demandTotalCr = fundedCr + deficitCr;

  // ---- Surplus available for infrastructure ------------------------
  const tradeBalanceUsdBn = macro?.tradeBalanceUsdBn ?? 0;
  const allocationPct = macro?.surplusInfraAllocationPct ?? 15;
  const surplusUsdBn =
    tradeBalanceUsdBn > 0 ? (tradeBalanceUsdBn * allocationPct) / 100 : 0;
  const surplusCr = surplusUsdBn * fx * 100; // 1 USD bn = fx x 100 Cr

  const fulfilableCr = fundedCr + surplusCr;
  const shortfallCr =
    demandTotalCr > 0 ? Math.max(0, demandTotalCr - fulfilableCr) : 0;

  const hasDistrictData = gapCount > 0;
  const fulfilmentPct =
    demandTotalCr > 0
      ? Math.min(100, (fulfilableCr / demandTotalCr) * 100)
      : (macro?.demandFulfilmentPct ?? 0);

  const deficitCoveredBySurplusCr =
    tradeBalanceUsdBn > 0 ? Math.min(deficitCr, surplusCr) : 0;
  const deficitCoverPct =
    deficitCr > 0 ? (deficitCoveredBySurplusCr / deficitCr) * 100 : 0;

  // ---- Why demand cannot be fulfilled ------------------------------
  const reasons: string[] = [];
  if (!hasDistrictData) {
    reasons.push(
      `No district-level gap data for ${countryName}; fulfilment uses the national baseline demand index (${macro?.demandFulfilmentPct ?? 0}%).`,
    );
  }
  if (tradeBalanceUsdBn <= 0) {
    reasons.push(
      `${countryName} runs a trade deficit of USD ${Math.abs(round2(tradeBalanceUsdBn))} bn in ${year} — there is no goods surplus to channel into public infrastructure.`,
    );
  } else if (surplusCr < deficitCr) {
    reasons.push(
      `Only ${allocationPct}% of the USD ${round2(tradeBalanceUsdBn)} bn trade surplus is earmarked for infrastructure (USD ${round2(surplusUsdBn)} bn ≈ ${round2(surplusCr)} Cr), covering ${round2(deficitCoverPct)}% of the ${round2(deficitCr)} Cr unfunded demand gap.`,
    );
  }
  if (tradeBalanceUsdBn > 0 && surplusCr >= deficitCr && hasDistrictData) {
    reasons.push(
      `Allocatable surplus (${round2(surplusCr)} Cr) exceeds the unfunded gap (${round2(deficitCr)} Cr) — remaining constraints are execution capacity and allocation policy, not funding.`,
    );
  }
  if (hasDistrictData && fundedCr > 0 && demandTotalCr > 0) {
    reasons.push(
      `${round2((fundedCr / demandTotalCr) * 100)}% of assessed demand is already covered by active project budgets; the rest depends on future surplus or borrowing.`,
    );
  }

  return {
    country,
    countryName,
    year,
    gdpUsdBn: macro?.gdpUsdBn ?? 0,
    localPerUsd: fx,
    tradeBalanceUsdBn,
    currentAccountUsdBn: macro?.currentAccountUsdBn ?? 0,
    surplusInfraAllocationPct: allocationPct,
    surplusUsdBn,
    surplusCr,
    demandTotalCr,
    fundedCr,
    deficitCr,
    fulfilableCr,
    shortfallCr,
    fulfilmentPct: round2(fulfilmentPct),
    baselineFulfilmentPct: macro?.demandFulfilmentPct ?? 0,
    publicDemandIndex: macro?.publicDemandIndex ?? 0,
    deficitCoverPct: round2(deficitCoverPct),
    hasDistrictData,
    gapCount,
    sectorBreakdown,
    reasons,
    source:
      macro?.source ??
      "World Bank WDI 2024; BCB BRICS Bulletin 2025 (no macro row for this year)",
  };
}
