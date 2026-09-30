import { DbService } from "../database/dbService.js";
import {
  EvidenceCard,
  PolicyAiQueryRequest,
  PolicyAiQueryResponse,
  SectorCategory,
} from "../types/index.js";
import { getCountryInfo } from "../utils/brics.js";
import { LlmService } from "./llmService.js";

const SECTOR_KEYWORDS: Record<SectorCategory, string[]> = {
  WATER_SUPPLY: ["water", "drinking", "handpump", "borewell", "pipeline", "jal", "supply"],
  RURAL_ROADS: ["road", "highway", "pmgsy", "connectivity", "bridge", "causeway"],
  POWER_GRID: ["power", "electricity", "electric", "grid", "outage", "transformer", "solar"],
  HEALTHCARE: ["health", "hospital", "clinic", "doctor", "medical", "ambulance", "disease"],
  SANITATION: ["sanitation", "toilet", "sewage", "sewer", "drain", "waste", "swachh"],
  EDUCATION: ["school", "education", "teacher", "classroom", "student", "literacy"],
  FLOOD_DRAINAGE: ["flood", "drainage", "embankment", "rain", "monsoon", "waterlogging"],
};

const formatCr = (value: number, symbol: string): string =>
  `${symbol}${value.toLocaleString("en-US", { maximumFractionDigits: 1 })} Cr`;

const percentOf = (part: number, total: number): number =>
  total > 0 ? Math.round((part / total) * 100) : 0;

export class PolicyAiService {
  public static async analyzeQuery(
    req: PolicyAiQueryRequest,
  ): Promise<PolicyAiQueryResponse> {
    const q = req.query.toLowerCase().trim();
    const currency = getCountryInfo(req.country).currencySymbol;
    const countryLabel = req.country
      ? getCountryInfo(req.country).name
      : "All BRICS";

    // ---- 1. Load live, country-scoped facts from PostgreSQL ----
    const [districts, gaps, grievances, projects, summary, hotspots, trends] =
      await Promise.all([
        DbService.getMapData(req.country),
        DbService.getPlanGaps({
          country: req.country,
          state: req.filterState,
          district: req.filterDistrict,
          sector: req.filterSector,
        }),
        DbService.getGrievances({
          country: req.country,
          state: req.filterState,
          district: req.filterDistrict,
        }),
        DbService.getProjects({ country: req.country }),
        DbService.getSummaryMetrics(req.country),
        DbService.getHotspots(req.country),
        DbService.getTrends(req.country),
      ]);

    // ---- 2. Dynamic routing against real data (no hardcoded locations) ----
    const mentionedDistrict =
      districts.find((d) => q.includes(d.district.toLowerCase())) ||
      (req.filterDistrict
        ? districts.find(
            (d) => d.district.toLowerCase() === req.filterDistrict!.toLowerCase(),
          )
        : undefined);

    const mentionedDistrictGaps = mentionedDistrict
      ? gaps.filter(
          (g) => g.district.toLowerCase() === mentionedDistrict.district.toLowerCase(),
        )
      : [];

    let detectedSector: SectorCategory | undefined = req.filterSector;
    if (!detectedSector) {
      for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS)) {
        if (keywords.some((k) => q.includes(k))) {
          detectedSector = sector as SectorCategory;
          break;
        }
      }
    }
    if (!detectedSector && mentionedDistrictGaps.length > 0) {
      detectedSector = mentionedDistrictGaps[0].sector;
    }

    // ---- 3. Grounded context package for the LLM ----
    const groundedContext = {
      country: countryLabel,
      summary,
      topHotspotDistricts: hotspots.slice(0, 5),
      criticalPlanGaps: gaps.slice(0, 5),
      activeProjects: projects.slice(0, 10),
      recentGrievances: grievances.slice(0, 10),
      trends,
      ...(mentionedDistrict ? { focusedDistrict: mentionedDistrict } : {}),
      ...(detectedSector ? { focusedSector: detectedSector } : {}),
    };

    const llmAnswer = await LlmService.generatePolicyAnswer(
      req.query,
      groundedContext,
    );

    const scopeNote = req.country
      ? `${countryLabel}`
      : "all monitored BRICS regions";

    // ---- 4. District-level diagnosis (real numbers only) ----
    if (mentionedDistrict) {
      const d = mentionedDistrict;
      const districtGrievances = grievances.filter(
        (g) => g.location.district.toLowerCase() === d.district.toLowerCase(),
      );
      const critical = districtGrievances.filter(
        (g) => g.severity === "CRITICAL" || g.severity === "HIGH",
      ).length;
      const districtProjects = projects.filter(
        (p) => p.district.toLowerCase() === d.district.toLowerCase(),
      );
      const sanctioned = districtProjects.reduce(
        (s, p) => s + p.sanctionedBudgetInCr,
        0,
      );
      const spent = districtProjects.reduce(
        (s, p) => s + p.spentBudgetInCr,
        0,
      );
      const topGap = mentionedDistrictGaps[0];
      const sectorBreakdown = new Map<string, number>();
      for (const g of districtGrievances) {
        sectorBreakdown.set(g.category, (sectorBreakdown.get(g.category) ?? 0) + 1);
      }
      const topSector = [...sectorBreakdown.entries()].sort((a, b) => b[1] - a[1])[0];

      const evidenceCards: EvidenceCard[] = [
        {
          title: `${d.district} Citizen Request Volume`,
          type: "STATISTIC",
          keyMetric: `${districtGrievances.length} requests | ${percentOf(critical, districtGrievances.length)}% critical/high`,
          context: topSector
            ? `${topSector[1]} of ${districtGrievances.length} requests concern ${topSector[0].replace(/_/g, " ").toLowerCase()}.`
            : "No registered citizen requests in the current dataset for this district.",
          source: "Nexa citizen ingestion feed (PostgreSQL)",
        },
        {
          title: `${d.district} Demographic Vulnerability`,
          type: "DEMOGRAPHIC",
          keyMetric: `${d.vulnerabilityIndex}/100 risk index`,
          context: `${d.population.toLocaleString()} residents, ${d.ruralPercentage}% rural; water ${d.baselineWaterIndex}, roads ${d.baselineRoadIndex}, power ${d.baselinePowerIndex}, health ${d.baselineHealthIndex} (baseline indices).`,
          source: "District demographic registry",
        },
        {
          title: "Active Public Investment",
          type: "PROJECT",
          keyMetric: `${districtProjects.length} projects | ${formatCr(sanctioned, currency)} sanctioned`,
          context:
            spent > 0
              ? `${formatCr(spent, currency)} disbursed to date (${percentOf(spent, sanctioned)}% of sanctioned).`
              : "No disbursement recorded yet against these projects.",
          source: "Government project & expenditure tracker",
        },
      ];

      if (topGap) {
        evidenceCards.push({
          title: `${topGap.sector.replace(/_/g, " ")} Plan Gap`,
          type: "GAP_ANALYSIS",
          keyMetric: `Deficit ${formatCr(topGap.estimatedBudgetRequiredInCr, currency)} | demand ${topGap.citizenDemandScore}/100`,
          context: `${topGap.primaryKeyProblem} Active scheme budget: ${formatCr(topGap.activeProjectBudgetInCr, currency)}.`,
          source: "Policy gap engine (FY plan analysis)",
        });
      }

      const actions = mentionedDistrictGaps.map((g) => g.recommendedAction).filter(Boolean);

      return {
        intent: "DISTRICT_SECTOR_DIAGNOSIS",
        confidence: 0.97,
        groundedFacts: {
          district: d.district,
          sector: detectedSector ?? topGap?.sector ?? topSector?.[0],
          totalGrievances: districtGrievances.length,
          criticalGrievances: critical,
          sanctionedBudgetInCr: sanctioned,
          unfundedDeficitInCr: topGap?.estimatedBudgetRequiredInCr ?? 0,
          vulnerabilityIndex: d.vulnerabilityIndex,
        },
        evidenceCards,
        answer:
          llmAnswer ||
          `### Executive Diagnosis: ${d.district} (${d.state}, ${d.country})

Grounded in **${districtGrievances.length} registered citizen requests**, live demographic indices and public investment records:

1. **Citizen pressure** — ${districtGrievances.length} requests logged, ${critical} rated critical/high. ${
            topSector
              ? `The dominant theme is **${topSector[0].replace(/_/g, " ").toLowerCase()}** (${topSector[1]} requests).`
              : "No sector concentration detectable yet from the current request volume."
          }
2. **Vulnerability** — index **${d.vulnerabilityIndex}/100** across ${d.population.toLocaleString()} residents (${d.ruralPercentage}% rural).
3. **Investment position** — ${districtProjects.length} active project(s), ${formatCr(sanctioned, currency)} sanctioned, ${formatCr(spent, currency)} disbursed.
${
  topGap
    ? `4. **Plan gap** — ${topGap.sector.replace(/_/g, " ").toLowerCase()} shortfall of **${formatCr(topGap.estimatedBudgetRequiredInCr, currency)}** (demand score ${topGap.citizenDemandScore}/100): ${topGap.primaryKeyProblem}`
    : ""
}

${actions.length ? `**Recommended actions (from the gap engine):**\n${actions.map((a) => `- ${a}`).join("\n")}` : "No funded gap records exist for this district yet — the gap engine has not flagged a specific allocation shortfall."}`,
        suggestedFollowUps: [
          `How do other districts in ${d.state} compare on ${topSector ? topSector[0].replace(/_/g, " ").toLowerCase() : "vulnerability"}?`,
          `What is the disbursement status of the ${districtProjects.length} project(s) in ${d.district}?`,
          detectedSector
            ? `Which districts face the largest ${detectedSector.replace(/_/g, " ").toLowerCase()} deficit?`
            : "Which district has the highest unfunded plan gap?",
        ],
        recommendedPolicyActions:
          actions.length > 0
            ? actions.slice(0, 3)
            : [
                `Commission a fresh sector gap assessment for ${d.district}`,
                `Accelerate disbursement against ${formatCr(sanctioned - spent, currency)} of sanctioned but unspent budget`,
              ],
      };
    }

    // ---- 5. Sector priority analysis (real numbers only) ----
    if (detectedSector) {
      const sectorLabel = detectedSector.replace(/_/g, " ");
      const stat = summary.sectorStats[detectedSector] ?? { count: 0, critical: 0 };
      const sectorGaps = gaps.filter((g) => g.sector === detectedSector);
      const sectorDeficit = sectorGaps.reduce(
        (s, g) => s + g.estimatedBudgetRequiredInCr,
        0,
      );
      const sectorHotspots = hotspots.filter(
        (h) => h.primaryGrievanceSector === detectedSector,
      );
      const sectorProjects = projects.filter((p) => p.sector === detectedSector);
      const sectorBudget = sectorProjects.reduce(
        (s, p) => s + p.sanctionedBudgetInCr,
        0,
      );

      const evidenceCards: EvidenceCard[] = [
        {
          title: `${sectorLabel} — Citizen Demand`,
          type: "STATISTIC",
          keyMetric: `${stat.count} requests | ${stat.critical} critical/high`,
          context: `Across ${scopeNote}; ${percentOf(stat.count, summary.totalComplaints)}% of all registered citizen requests.`,
          source: "Nexa grievance analytics",
        },
        {
          title: `${sectorLabel} — Investment Position`,
          type: "PROJECT",
          keyMetric: `${formatCr(sectorBudget, currency)} across ${sectorProjects.length} projects`,
          context: `${formatCr(summary.totalSpentBudgetCr, currency)} total disbursed across all sectors in scope.`,
          source: "Government project tracker",
        },
        {
          title: `${sectorLabel} — Unfunded Plan Gap`,
          type: "GAP_ANALYSIS",
          keyMetric: `${formatCr(sectorDeficit, currency)} estimated shortfall`,
          context:
            sectorGaps.length > 0
              ? `${sectorGaps.length} district-level gap(s); worst: ${sectorGaps[0].district} (${formatCr(sectorGaps[0].estimatedBudgetRequiredInCr, currency)}).`
              : "No unfunded gap recorded for this sector in the current plan.",
          source: "Policy gap engine",
        },
      ];

      if (sectorHotspots.length > 0) {
        evidenceCards.push({
          title: `${sectorLabel} Hotspots`,
          type: "TREND",
          keyMetric: sectorHotspots
            .slice(0, 3)
            .map((h) => `${h.district} (${h.compositeRiskScore})`)
            .join(", "),
          context: "Ranked by composite vulnerability–demand risk score.",
          source: "Hotspot ranking engine",
        });
      }

      return {
        intent: "SECTOR_PRIORITY_ANALYSIS",
        confidence: 0.95,
        groundedFacts: {
          sector: detectedSector,
          totalGrievances: stat.count,
          criticalGrievances: stat.critical,
          sanctionedBudgetInCr: sectorBudget,
          unfundedDeficitInCr: sectorDeficit,
        },
        evidenceCards,
        answer:
          llmAnswer ||
          `### ${sectorLabel} Priority Brief — ${countryLabel}

1. **Demand**: ${stat.count} citizen requests (${stat.critical} critical/high), ${percentOf(stat.count, summary.totalComplaints)}% of all requests in scope.
2. **Investment**: ${formatCr(sectorBudget, currency)} sanctioned across ${sectorProjects.length} project(s); total disbursed to date across all sectors: ${formatCr(summary.totalSpentBudgetCr, currency)}.
3. **Plan gap**: ${formatCr(sectorDeficit, currency)} estimated shortfall over ${sectorGaps.length} district(s).${
            sectorGaps[0]
              ? ` Widest gap: **${sectorGaps[0].district}** — ${sectorGaps[0].primaryKeyProblem}`
              : ""
          }
4. **Hotspots**: ${
            sectorHotspots.length > 0
              ? sectorHotspots
                  .slice(0, 3)
                  .map((h) => `${h.district} (risk ${h.compositeRiskScore}/100)`)
                  .join("; ")
              : "no district currently ranks primarily on this sector."
          }

${sectorGaps[0] ? `**Suggested action:** ${sectorGaps[0].recommendedAction}` : ""}`,
        suggestedFollowUps: [
          `Which districts drive ${sectorLabel.toLowerCase()} demand?`,
          `What is the funding requirement to close the ${sectorLabel.toLowerCase()} gap?`,
          `Compare ${sectorLabel.toLowerCase()} spending with grievance volume.`,
        ],
        recommendedPolicyActions: sectorGaps
          .slice(0, 3)
          .map((g) => g.recommendedAction)
          .filter(Boolean),
      };
    }

    // ---- 6. Default: country-wide priority briefing (real numbers only) ----
    const topGaps = gaps.slice(0, 4);
    const totalDeficit = gaps.reduce((s, g) => s + g.estimatedBudgetRequiredInCr, 0);
    const hotSector = Object.entries(summary.sectorStats).sort(
      (a, b) => b[1].count - a[1].count,
    )[0];

    const evidenceCards: EvidenceCard[] = [
      {
        title: `Platform Coverage — ${countryLabel}`,
        type: "STATISTIC",
        keyMetric: `${summary.totalComplaints} requests | ${summary.resolutionRate}% resolved`,
        context: `${summary.monitoredDistrictsCount} districts monitored, ${summary.activeProjectsCount} projects tracked, population covered ${summary.totalPopulationCovered.toLocaleString()}.`,
        source: "Nexa summary analytics (PostgreSQL)",
      },
      {
        title: "Top Demand Hotspots",
        type: "TREND",
        keyMetric: hotspots
          .slice(0, 3)
          .map((h) => `${h.district} ${h.compositeRiskScore}`)
          .join(" | ") || "None recorded",
        context:
          hotspots.length > 0
            ? `${hotspots[0].keyIssue} Leading sector pressure: ${hotspots[0].primaryGrievanceSector.replace(/_/g, " ").toLowerCase()}.`
            : "No districts in scope.",
        source: "Composite hotspot ranking",
      },
      {
        title: "Unfunded Plan Gap",
        type: "GAP_ANALYSIS",
        keyMetric: `${formatCr(totalDeficit, currency)} over ${gaps.length} gap(s)`,
        context:
          topGaps.length > 0
            ? `Widest: ${topGaps.map((g) => `${g.district} (${formatCr(g.estimatedBudgetRequiredInCr, currency)})`).join(", ")}.`
            : "No unfunded gaps recorded in the current plan.",
        source: "Policy gap engine",
      },
      {
        title: "Public Investment Position",
        type: "PROJECT",
        keyMetric: `${formatCr(summary.totalSanctionedBudgetCr, currency)} sanctioned`,
        context: `${formatCr(summary.totalSpentBudgetCr, currency)} disbursed (${percentOf(summary.totalSpentBudgetCr, summary.totalSanctionedBudgetCr)}% utilisation) across ${summary.activeProjectsCount} projects.`,
        source: "Government project & expenditure tracker",
      },
    ];

    return {
      intent: "POLICY_PLAN_GAP_ANALYSIS",
      confidence: 0.94,
      groundedFacts: {
        totalGrievances: summary.totalComplaints,
        criticalGrievances: summary.criticalComplaints,
        sanctionedBudgetInCr: summary.totalSanctionedBudgetCr,
        unfundedDeficitInCr: totalDeficit,
      },
      evidenceCards,
      answer:
        llmAnswer ||
        `### Development Priority Brief — ${countryLabel}

1. **Citizen demand**: ${summary.totalComplaints} registered requests, ${summary.criticalComplaints} critical, ${summary.resolutionRate}% resolved.${
          hotSector
            ? ` Largest pressure: **${hotSector[0].replace(/_/g, " ").toLowerCase()}** (${hotSector[1].count} requests).`
            : ""
        }
2. **Hotspots**: ${
          hotspots.length > 0
            ? hotspots
                .slice(0, 3)
                .map((h, i) => `${i + 1}. ${h.district}, ${h.state} — risk ${h.compositeRiskScore}/100 (${h.keyIssue})`)
                .join("; ")
            : "none ranked in scope."
        }
3. **Investment**: ${formatCr(summary.totalSanctionedBudgetCr, currency)} sanctioned, ${formatCr(summary.totalSpentBudgetCr, currency)} disbursed across ${summary.activeProjectsCount} project(s).
4. **Plan gap**: ${formatCr(totalDeficit, currency)} unfunded over ${gaps.length} district-sector gap(s).

${topGaps.length > 0 ? `**Highest-priority gaps:**\n${topGaps.map((g, i) => `${i + 1}. ${g.district} — ${g.sector.replace(/_/g, " ").toLowerCase()}: demand ${g.citizenDemandScore}/100, deficit ${formatCr(g.estimatedBudgetRequiredInCr, currency)}. ${g.primaryKeyProblem}`).join("\n")}` : "The gap engine has no unfunded gaps for this scope."}`,
      suggestedFollowUps: [
        hotspots[0]
          ? `Give a full diagnosis of ${hotspots[0].district}`
          : "Which district needs attention first?",
        topGaps[0]
          ? `What is the funding plan for ${topGaps[0].district} ${topGaps[0].sector.replace(/_/g, " ").toLowerCase()}?`
          : "Show the largest unfunded plan gap",
        `How is budget disbursement trending month over month?`,
      ],
      recommendedPolicyActions: topGaps.map((g) => g.recommendedAction).filter(Boolean),
    };
  }
}
