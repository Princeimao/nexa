import React, { useEffect, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { DashboardOverview } from "./components/DashboardOverview";
import { DistrictDrilldownModal } from "./components/DistrictDrilldownModal";
import { GrievanceFeed } from "./components/GrievanceFeed";
import { Header } from "./components/Header";
import { InteractiveMap } from "./components/InteractiveMap";
import { InvestmentDashboard } from "./components/InvestmentDashboard";
import type { TabType } from "./components/Navbar";
import { PlanGapMatrix } from "./components/PlanGapMatrix";
import { PolicyAiCopilot } from "./components/PolicyAiCopilot";
import { ProjectImpactAnalytics } from "./components/ProjectImpactAnalytics";
import { Sidebar } from "./components/Sidebar";
import { api } from "./services/api";

import type {
  BricsInvestmentSummary,
  DistrictDemographic,
  GovernmentProject,
  Grievance,
  GrievanceStatus,
  HotspotItem,
  PolicyGapInsight,
  SummaryMetrics,
  TrendData,
} from "./types";

const VALID_COUNTRIES = [
  "ALL",
  "IN",
  "BR",
  "CN",
  "EG",
  "ET",
  "ID",
  "IR",
  "RU",
  "SA",
  "ZA",
  "AE",
];

const DEFAULT_COUNTRY = "IN";

const normalizeCountry = (country: string | null) => {
  if (!country) return DEFAULT_COUNTRY;

  const normalized = country.toUpperCase();

  return VALID_COUNTRIES.includes(normalized) ? normalized : DEFAULT_COUNTRY;
};

export const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  /*
   * ============================================================
   * COUNTRY
   * ============================================================
   */

  const selectedCountry = normalizeCountry(searchParams.get("country"));

  /*
   * ============================================================
   * SIDEBAR
   * ============================================================
   */

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  /*
   * ============================================================
   * DATA
   * ============================================================
   */

  const [summary, setSummary] = useState<SummaryMetrics | null>(null);

  const [districts, setDistricts] = useState<DistrictDemographic[]>([]);

  const [hotspots, setHotspots] = useState<HotspotItem[]>([]);

  const [planGaps, setPlanGaps] = useState<PolicyGapInsight[]>([]);

  const [grievances, setGrievances] = useState<Grievance[]>([]);

  const [projects, setProjects] = useState<GovernmentProject[]>([]);

  const [trends, setTrends] = useState<TrendData | null>(null);

  const [bricsSummary, setBricsSummary] =
    useState<BricsInvestmentSummary | null>(null);

  /*
   * ============================================================
   * DISTRICT MODAL
   * ============================================================
   */

  const [selectedDistrict, setSelectedDistrict] =
    useState<DistrictDemographic | null>(null);

  /*
   * ============================================================
   * POLICY AI
   * ============================================================
   */

  const [copilotPrompt, setCopilotPrompt] = useState("");

  /*
   * ============================================================
   * ROUTE HELPERS
   * ============================================================
   */

  const getActiveTab = (): TabType => {
    const path = location.pathname;

    if (path === "/dashboard") return "map";
    if (path === "/dashboard/gaps") return "gaps";
    if (path === "/dashboard/grievances") return "grievances";
    if (path === "/dashboard/copilot") return "copilot";
    if (path === "/dashboard/impact") return "impact";
    if (path === "/dashboard/investment") return "investment";
    if (path === "/dashboard/simulator") return "simulator";

    return "map";
  };

  const activeTab = getActiveTab();

  const navigateToTab = (tab: TabType) => {
    const routes: Record<TabType, string> = {
      map: "/dashboard",
      gaps: "/dashboard/gaps",
      grievances: "/dashboard/grievances",
      copilot: "/dashboard/copilot",
      impact: "/dashboard/impact",
      investment: "/dashboard/investment",
      simulator: "/dashboard/simulator",
    };

    navigate({
      pathname: routes[tab],
      search: `?country=${selectedCountry}`,
    });
  };

  /*
   * ============================================================
   * COUNTRY CHANGE
   * ============================================================
   */

  const handleCountryChange = (country: string) => {
    const normalized = normalizeCountry(country);

    setSearchParams({
      country: normalized,
    });

    // Close any currently opened district.
    setSelectedDistrict(null);
  };

  /*
   * ============================================================
   * LOAD DATA
   * ============================================================
   */

  const loadData = async () => {
    try {
      const country = selectedCountry === "ALL" ? undefined : selectedCountry;

      const [sumRes, mapRes, hotRes, gapRes, grvRes, prjRes, trendRes, bricsRes] =
        await Promise.all([
          api.getSummary(country),
          api.getMapData(country),
          api.getHotspots(country),
          api.getPlanGaps(country),
          api.getGrievances(country ? { country } : undefined),
          api.getProjects(country),
          api.getTrends(country),
          api.getBricsSummary(country).catch(() => null),
        ]);

      setSummary(sumRes);
      setDistricts(mapRes);
      setHotspots(hotRes);
      setPlanGaps(gapRes);
      setGrievances(grvRes);
      setProjects(prjRes);
      setTrends(trendRes);
      setBricsSummary(bricsRes);
    } catch (error) {
      console.error("Failed to load platform data:", error);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCountry]);

  const handleUpdateGrievanceStatus = async (
    id: string,
    status: GrievanceStatus,
  ) => {
    try {
      await api.updateGrievanceStatus(id, status);
      await loadData();
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const handleResetSeed = async () => {
    try {
      await api.resetSeedData();
      await loadData();
    } catch (error) {
      console.error("Failed to reset dataset:", error);
    }
  };

  const handleAskPolicyAi = (prompt: string) => {
    setCopilotPrompt(prompt);
    navigateToTab("copilot");
  };

  const handleExportBriefing = () => {
    const countryName =
      selectedCountry === "ALL" ? "All BRICS" : selectedCountry;

    const text = `
NEXA EXECUTIVE POLICY BRIEFING
BRICS DIGITAL PUBLIC INFRASTRUCTURE

DATE: ${new Date().toLocaleDateString()}
COUNTRY FOCUS: ${countryName}

1. AGGREGATED METRICS

Total Citizen Development Requests:
${summary?.totalComplaints || 0}

High Priority Hotspots:
${hotspots.length}

Public Investment Sanctioned:
${summary?.totalSanctionedBudgetCr || 0}

Annual Plan Unfunded Deficit:
${summary?.unfundedPolicyDeficitCr || 0}

Resolution Rate:
${summary?.resolutionRate || 0}%


2. TOP DEMAND HOTSPOTS

${hotspots
  .slice(0, 5)
  .map(
    (h, i) =>
      `${i + 1}. ${h.district} (${h.state}) - Risk Score: ${
        h.compositeRiskScore
      }/100 | ${h.keyIssue}`,
  )
  .join("\n")}


3. CRITICAL PLAN GAPS

${planGaps
  .slice(0, 5)
  .map(
    (g, i) =>
      `${i + 1}. ${g.district} - ${g.sector}: Citizen Demand ${
        g.citizenDemandScore
      }/100, Estimated Deficit ${
        g.estimatedBudgetRequiredInCr
      } Cr. ${g.aiRationale}`,
  )
  .join("\n")}


Generated by Nexa Digital Public Infrastructure AI Engine.
`;

    const blob = new Blob([text], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = `Nexa-Policy-Briefing-${selectedCountry}-${new Date()
      .toISOString()
      .slice(0, 10)}.txt`;

    link.click();

    URL.revokeObjectURL(url);
  };

  const handleSelectDistrictByName = (districtName: string) => {
    const district = districts.find(
      (dist) => dist.district.toLowerCase() === districtName.toLowerCase(),
    );

    if (district) {
      setSelectedDistrict(district);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* =====================================================
          SIDEBAR
      ====================================================== */}

      <Sidebar
        activeTab={activeTab}
        onChangeTab={navigateToTab}
        badgeCounts={{
          gaps: planGaps.length,
          grievances: grievances.length,
        }}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />

      {/* =====================================================
          MAIN
      ====================================================== */}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          selectedCountry={selectedCountry}
          onSelectCountry={handleCountryChange}
          onOpenSimulator={() => navigateToTab("simulator")}
          onResetSeed={handleResetSeed}
          onExportBriefing={handleExportBriefing}
          onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
        />

        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 sm:p-6 lg:p-7">
          <Routes>
            <Route
              path="/dashboard"
              element={
                <div className="space-y-6">
                  <DashboardOverview
                    metrics={summary}
                    hotspots={hotspots}
                    planGaps={planGaps}
                    grievances={grievances}
                    trends={trends}
                    country={selectedCountry}
                    demand={bricsSummary?.demand ?? null}
                    onSelectDistrict={handleSelectDistrictByName}
                    onAskPolicyAi={handleAskPolicyAi}
                    onNavigateTab={navigateToTab}
                  />

                  <div className="pt-2">
                    <InteractiveMap
                      districts={districts}
                      hotspots={hotspots}
                      selectedCountry={selectedCountry}
                      onSelectDistrict={setSelectedDistrict}
                    />
                  </div>
                </div>
              }
            />

            <Route
              path="/dashboard/gaps"
              element={
                <PlanGapMatrix
                  planGaps={planGaps}
                  country={selectedCountry}
                  onAskPolicyAi={handleAskPolicyAi}
                />
              }
            />

            <Route
              path="/dashboard/grievances"
              element={
                <GrievanceFeed
                  grievances={grievances}
                  country={selectedCountry}
                  onUpdateStatus={handleUpdateGrievanceStatus}
                  onOpenSimulator={() => navigateToTab("simulator")}
                />
              }
            />

            <Route
              path="/dashboard/copilot"
              element={
                <PolicyAiCopilot
                  country={selectedCountry}
                  initialPrompt={copilotPrompt}
                  onClearInitialPrompt={() => setCopilotPrompt("")}
                />
              }
            />

            <Route
              path="/dashboard/impact"
              element={
                <ProjectImpactAnalytics
                  projects={projects}
                  districts={districts}
                  summary={summary}
                  country={selectedCountry}
                />
              }
            />

            <Route
              path="/dashboard/investment"
              element={
                <InvestmentDashboard
                  summary={bricsSummary}
                  country={selectedCountry}
                  onNavigateTab={navigateToTab}
                />
              }
            />

            <Route
              path="*"
              element={
                <Navigate
                  to={`/dashboard?country=${selectedCountry}`}
                  replace
                />
              }
            />
          </Routes>
        </main>
      </div>

      <DistrictDrilldownModal
        district={selectedDistrict}
        projects={projects}
        grievances={grievances}
        planGaps={planGaps}
        country={selectedCountry}
        onClose={() => setSelectedDistrict(null)}
        onAskPolicyAi={handleAskPolicyAi}
      />
    </div>
  );
};

export default App;
