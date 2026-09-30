import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bot,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileText,
  Filter,
  Flame,
  Layers,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip as RechartsTooltip,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import type {
  DemandFulfilmentReport,
  Grievance,
  HotspotItem,
  PolicyGapInsight,
  SummaryMetrics,
  TrendData,
} from "../types";
import { currencySymbol, formatCr } from "../utils/country";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Separator } from "./ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";

interface DashboardOverviewProps {
  metrics: SummaryMetrics | null;
  hotspots: HotspotItem[];
  planGaps: PolicyGapInsight[];
  grievances: Grievance[];
  trends?: TrendData | null;
  country?: string;
  demand?: DemandFulfilmentReport | null;
  onSelectDistrict: (districtName: string) => void;
  onAskPolicyAi: (prompt: string) => void;
  onNavigateTab: (tab: any) => void;
}

const formatCategory = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatDelta = (value: number | undefined, suffix = "%") => {
  if (value === undefined || Number.isNaN(value)) return undefined;
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded}${suffix}`;
};

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendLabel,
  variant = "default",
  onClick,
}: {
  title: string;
  value: React.ReactNode;
  description: string;
  icon: React.ElementType;
  trend?: string;
  trendLabel?: string;
  variant?: "default" | "danger" | "success" | "blue";
  onClick?: () => void;
}) {
  const iconStyles = {
    default: "bg-slate-100 text-slate-700",
    danger: "bg-rose-50 text-rose-600",
    success: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
  };

  return (
    <Card
      className={`group transition-all duration-200 ${
        onClick ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md" : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconStyles[variant]}`}
          >
            <Icon className="h-5 w-5" />
          </div>

          {trend && (
            <Badge
              variant="outline"
              className={
                variant === "danger"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }
            >
              {trend}
            </Badge>
          )}
        </div>

        <div className="mt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </p>

          <div className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            {value}
          </div>

          <p className="mt-1.5 text-xs text-muted-foreground">{description}</p>

          {trendLabel && (
            <p className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
              <span
                className={
                  variant === "danger"
                    ? "font-semibold text-rose-600"
                    : "font-semibold text-emerald-600"
                }
              >
                {trend}
              </span>
              {trendLabel}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  metrics,
  hotspots,
  planGaps,
  grievances,
  trends,
  country,
  demand,
  onSelectDistrict,
  onAskPolicyAi,
  onNavigateTab,
}) => {
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(
    null,
  );

  const [isHotspotSheetOpen, setIsHotspotSheetOpen] = useState(false);

  const [selectedHotspot, setSelectedHotspot] = useState<HotspotItem | null>(
    null,
  );

  const [timeRange, setTimeRange] = useState<"12W" | "4W">("12W");

  const pipelineData = trends?.pipeline ?? [];
  const annualTrendData = trends?.annualTrend ?? [];
  const sectorData = trends?.sectorComposition ?? [];
  const deltas = metrics?.periodDeltas;
  const cur = currencySymbol(country);

  const topHotspots = useMemo(
    () =>
      [...hotspots]
        .sort((a, b) => b.compositeRiskScore - a.compositeRiskScore)
        .slice(0, 5),
    [hotspots],
  );

  const openHotspot = (hotspot: HotspotItem) => {
    setSelectedHotspot(hotspot);
    setIsHotspotSheetOpen(true);
  };

  const resolutionRate = metrics?.resolutionRate ?? 0;
  const topSector = sectorData[0];

  // ---- Surplus vs public demand (BRICS dataset) ----
  const demandEntry =
    demand && demand.countries.length === 1 ? demand.countries[0] : null;
  const demandPct = Math.round(
    demandEntry
      ? demandEntry.fulfilmentPct
      : (demand?.totals.fulfilmentPct ?? 0),
  );
  const demandTotalCr = demandEntry
    ? demandEntry.demandTotalCr
    : (demand?.totals.demandTotalCr ?? 0);
  const fundedCr = demandEntry ? demandEntry.fundedCr : (demand?.totals.fundedCr ?? 0);
  const deficitCr = demandEntry ? demandEntry.deficitCr : (demand?.totals.deficitCr ?? 0);
  const surplusCr = demandEntry ? demandEntry.surplusCr : (demand?.totals.surplusCr ?? 0);
  const demandReasons = (demandEntry?.reasons ?? []).slice(0, 3);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* =========================================================
            PAGE HEADER
        ========================================================== */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-blue-200 bg-blue-50 text-blue-700"
              >
                <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-blue-600" />
                LIVE POLICY INTELLIGENCE
              </Badge>

              <span className="text-xs text-muted-foreground">
                Updated just now
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
              National Development Intelligence
            </h1>

            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              A consolidated view of citizen demand, infrastructure gaps, public
              investment and policy response across priority districts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger>
                <Button variant="outline" size="icon">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh intelligence</TooltipContent>
            </Tooltip>

            <Button
              variant="outline"
              className="gap-2"
              onClick={() => onNavigateTab("grievances")}
            >
              <FileText className="h-4 w-4" />
              View Requests
            </Button>

            <Button
              className="gap-2 bg-slate-950 hover:bg-slate-800"
              onClick={() =>
                onAskPolicyAi(
                  "Identify the highest priority infrastructure gaps and recommend evidence-based reallocations.",
                )
              }
            >
              <Bot className="h-4 w-4 text-blue-300" />
              Policy AI
            </Button>
          </div>
        </div>

        {/* =========================================================
            KEY METRICS
        ========================================================== */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Citizen Grievances"
            value={metrics?.totalComplaints?.toLocaleString() ?? "0"}
            description="Aggregated requests from citizen channels"
            icon={MessageSquare}
            trend={formatDelta(deltas?.grievancesPct)}
            trendLabel="vs previous 30 days"
            variant="blue"
            onClick={() => onNavigateTab("grievances")}
          />

          <MetricCard
            title="Public Investment"
            value={
              <>
                {cur}
                {metrics?.totalSanctionedBudgetCr?.toLocaleString() ?? "0"}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  Cr
                </span>
              </>
            }
            description={`${metrics?.activeProjectsCount ?? 0} active development schemes`}
            icon={CircleDollarSign}
            trend={formatDelta(deltas?.investmentPct)}
            trendLabel="disbursed vs previous 30 days"
            variant="success"
            onClick={() => onNavigateTab("map")}
          />

          <MetricCard
            title="Unfunded Demand"
            value={
              <>
                {cur}
                {metrics?.unfundedPolicyDeficitCr?.toLocaleString() ?? "0"}
                <span className="ml-1 text-sm font-normal text-rose-500">
                  Cr
                </span>
              </>
            }
            description="Citizen demand without aligned funding"
            icon={AlertTriangle}
            trend={
              metrics && metrics.unfundedPolicyDeficitCr > 0
                ? "Critical"
                : metrics
                  ? "Aligned"
                  : undefined
            }
            trendLabel="requires policy attention"
            variant="danger"
            onClick={() => onNavigateTab("gaps")}
          />

          <MetricCard
            title="Resolution Rate"
            value={`${resolutionRate}%`}
            description={`${metrics?.resolvedComplaints ?? 0} citizen cases closed`}
            icon={CheckCircle2}
            trend={formatDelta(deltas?.resolutionRateDelta, " pts")}
            trendLabel="last 30 days vs prior period"
            variant="success"
            onClick={() => onNavigateTab("grievances")}
          />
        </div>

        {/* =========================================================
            PUBLIC DEMAND VS SURPLUS CAPACITY
        ========================================================== */}
        {demand && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">
                    Public Demand vs Surplus Capacity
                  </CardTitle>
                  <CardDescription>
                    How much assessed citizen demand can be fulfilled from the
                    trade surplus earmarked for infrastructure —{" "}
                    {demand.scope}, {demand.year}
                  </CardDescription>
                </div>

                <Button
                  variant="outline"
                  className="gap-2 shrink-0"
                  onClick={() => onNavigateTab("investment")}
                >
                  <ArrowUpRight className="h-4 w-4" />
                  Open investment analysis
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-slate-950">
                    {demandPct}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    of demand fulfillable
                  </span>
                </div>

                <div className="flex-1">
                  <Progress value={Math.min(100, demandPct)} className="h-2.5" />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Assessed demand
                  </p>
                  <p className="mt-0.5 text-sm font-bold">
                    {formatCr(demandTotalCr, country)}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-emerald-700">
                    Funded
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-emerald-700">
                    {formatCr(fundedCr, country)}
                  </p>
                </div>

                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-rose-700">
                    Unfunded deficit
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-rose-700">
                    {formatCr(deficitCr, country)}
                  </p>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-blue-700">
                    Surplus → infrastructure
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-blue-700">
                    {formatCr(surplusCr, country)}
                  </p>
                </div>
              </div>

              {demandReasons.length > 0 && (
                <ul className="space-y-1.5">
                  {demandReasons.map((reason, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 rounded-lg border bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-700"
                    >
                      <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                      {reason}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {/* =========================================================
            OPERATIONAL SIGNALS
        ========================================================== */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">
                    Citizen Demand Pipeline
                  </CardTitle>
                  <CardDescription>
                    Incoming grievances compared with cases resolved
                  </CardDescription>
                </div>

                <div className="flex items-center rounded-lg border bg-muted/40 p-1">
                  <Button
                    size="sm"
                    variant={timeRange === "4W" ? "secondary" : "ghost"}
                    className="h-7 px-3 text-xs"
                    onClick={() => setTimeRange("4W")}
                  >
                    4 Weeks
                  </Button>

                  <Button
                    size="sm"
                    variant={timeRange === "12W" ? "secondary" : "ghost"}
                    className="h-7 px-3 text-xs"
                    onClick={() => setTimeRange("12W")}
                  >
                    12 Weeks
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="mb-4 flex flex-wrap items-center gap-5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-950" />
                  <span className="text-muted-foreground">
                    Incoming grievances
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                  <span className="text-muted-foreground">Resolved</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <span className="text-muted-foreground">Target</span>
                </div>
              </div>

              <div className="h-[290px] w-full">
                {pipelineData.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-xs text-muted-foreground">
                    No pipeline data recorded yet for this country.
                  </div>
                ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={
                      timeRange === "4W"
                        ? pipelineData.slice(-4)
                        : pipelineData
                    }
                    margin={{ top: 10, right: 5, left: -20, bottom: 0 }}
                    barGap={3}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                    />

                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <YAxis
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <RechartsTooltip
                      cursor={{ fill: "#f8fafc" }}
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
                        fontSize: 12,
                      }}
                    />

                    <Bar
                      dataKey="grievances"
                      name="Incoming"
                      fill="#0f172a"
                      radius={[4, 4, 0, 0]}
                    />

                    <Bar
                      dataKey="resolved"
                      name="Resolved"
                      fill="#94a3b8"
                      radius={[4, 4, 0, 0]}
                    />

                    <Line
                      type="monotone"
                      dataKey="target"
                      name="Target"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Demand Composition */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Demand Composition</CardTitle>
              <CardDescription>
                Share of citizen requests by sector
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                {sectorData.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No sector composition available yet.
                  </p>
                )}
                {sectorData.map((sector) => (
                  <div key={sector.category ?? sector.name}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: sector.color }}
                        />
                        <span className="text-xs font-medium">
                          {sector.name}
                        </span>
                      </div>

                      <span className="text-xs font-semibold">
                        {sector.value}%
                      </span>
                    </div>

                    <Progress value={sector.value} className="h-1.5" />
                  </div>
                ))}
              </div>

              <Separator className="my-5" />

              <div className="rounded-xl border bg-slate-50 p-3.5">
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                    <BarChart3 className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-900">
                      Highest demand sector
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                      {topSector
                        ? `${topSector.name} accounts for ${topSector.value}% of current citizen requests (${topSector.count} total).`
                        : "Sector shares will appear once citizen requests are recorded."}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* =========================================================
            INVESTMENT / GRIEVANCE TREND
        ========================================================== */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">
                  Public Investment vs Citizen Demand
                </CardTitle>
                <CardDescription>
                  Twelve-month view of grievances alongside public investment
                  disbursement
                </CardDescription>
              </div>

              <Badge variant="outline" className="w-fit">
                Annual intelligence view
              </Badge>
            </div>
          </CardHeader>

          <CardContent>
            <div className="mb-4 flex items-center gap-5 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-950" />
                Citizen grievances
              </div>

              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                Investment disbursed
              </div>
            </div>

            <div className="h-[300px] w-full">
              {annualTrendData.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-xs text-muted-foreground">
                  No 12-month trend data recorded yet for this country.
                </div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={annualTrendData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />

                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid #e2e8f0",
                      fontSize: 12,
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="complaints"
                    name="Citizen grievances"
                    stroke="#0f172a"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#0f172a" }}
                  />

                  <Line
                    type="monotone"
                    dataKey="budget"
                    name="Investment"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#3b82f6" }}
                  />
                </LineChart>
              </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* =========================================================
            BOTTOM INTELLIGENCE GRID
        ========================================================== */}
        <div className="grid gap-4 xl:grid-cols-12">
          {/* Recent grievances */}
          <Card className="overflow-hidden xl:col-span-8">
            <CardHeader className="border-b bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    Recent Citizen Requests
                  </CardTitle>
                  <CardDescription>
                    Latest requests entering the policy intelligence pipeline
                  </CardDescription>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => onNavigateTab("grievances")}
                >
                  View all
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0 h-100">
              <div className="overflow-x-auto">
                <Table className="h-150 overflow-auto">
                  <TableHeader>
                    <TableRow className="bg-slate-50/60 hover:bg-slate-50/60">
                      <TableHead className="pl-5">Request</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Sector</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10 pr-4" />
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {grievances.slice(0, 6).map((g) => (
                      <TableRow
                        key={g.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedGrievance(g)}
                      >
                        <TableCell className="pl-5">
                          <div>
                            <p className="font-mono text-xs font-semibold text-slate-900">
                              {g.ticketNumber}
                            </p>

                            <p className="mt-0.5 max-w-[190px] truncate text-[11px] text-muted-foreground">
                              {g.citizenName}
                            </p>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>
                              {g.location.district}, {g.location.state}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">
                            {formatCategory(g.category)}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          {g.status === "RESOLVED" ? (
                            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Resolved
                            </Badge>
                          ) : (
                            <Badge className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50">
                              <Clock3 className="mr-1 h-3 w-3" />
                              {formatCategory(g.status)}
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="pr-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}

                    {grievances.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-32 text-center text-sm text-muted-foreground"
                        >
                          No citizen requests available.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Hotspots */}
          <Card className="xl:col-span-4 h-150 flex flex-col overflow-hidden">
            <CardHeader className="shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">Priority Hotspots</CardTitle>
                  <CardDescription>
                    Districts requiring policy attention
                  </CardDescription>
                </div>

                <Badge
                  variant="outline"
                  className="border-rose-200 bg-rose-50 text-rose-700"
                >
                  {hotspots.length} flagged
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="flex min-h-0 flex-1 flex-col px-6 pb-5">
              {/* Scrollable hotspot list */}
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-2">
                {topHotspots.map((h, index) => {
                  const progress = Math.min(100, (h.activeProjects / 4) * 100);

                  return (
                    <button
                      key={h.id}
                      onClick={() => openHotspot(h)}
                      className="w-full rounded-xl border bg-white p-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-2.5">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-950 text-[10px] font-bold text-white">
                            {index + 1}
                          </span>

                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-slate-900">
                              {h.district}
                            </p>

                            <p className="mt-0.5 text-[10px] text-muted-foreground">
                              {h.state}
                            </p>
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          className={
                            h.compositeRiskScore >= 80
                              ? "border-rose-200 bg-rose-50 text-rose-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          }
                        >
                          {h.compositeRiskScore}
                        </Badge>
                      </div>

                      <div className="mt-3">
                        <div className="mb-1 flex justify-between text-[10px]">
                          <span className="text-muted-foreground">
                            Active schemes
                          </span>

                          <span className="font-medium">
                            {h.activeProjects}
                          </span>
                        </div>

                        <Progress value={progress} className="h-1.5" />
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{h.totalComplaints} complaints</span>

                        <span className="flex items-center gap-0.5 font-medium text-blue-600">
                          Inspect
                          <ChevronRight className="h-3 w-3" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Fixed bottom action */}
              <div className="shrink-0 border-t border-slate-100 bg-white pt-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => onNavigateTab("map")}
                >
                  Open hotspot intelligence map
                  <ArrowUpRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* =========================================================
            POLICY GAP SIGNAL
        ========================================================== */}
        <Card className="overflow-hidden border-blue-100 bg-gradient-to-br from-blue-50/70 via-white to-white">
          <CardContent className="p-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                  <Bot className="h-5 w-5" />
                </div>

                <div>
                  <Badge className="mb-2 bg-blue-100 text-blue-700 hover:bg-blue-100">
                    POLICY AI SIGNAL
                  </Badge>

                  <h3 className="text-sm font-bold text-slate-950">
                    {planGaps.length > 0
                      ? `${planGaps.length} policy gaps require review`
                      : "Policy intelligence is ready for review"}
                  </h3>

                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-600">
                    The intelligence layer combines citizen demand,
                    infrastructure indicators and public investment signals to
                    identify areas where planned interventions may not match
                    observed demand.
                  </p>
                </div>
              </div>

              <Button
                className="shrink-0 bg-slate-950 hover:bg-slate-800"
                onClick={() =>
                  onAskPolicyAi(
                    "Review current policy gaps, identify mismatches between citizen demand and public investment, and explain the evidence behind each recommendation.",
                  )
                }
              >
                <Bot className="mr-2 h-4 w-4 text-blue-300" />
                Review with Policy AI
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* =========================================================
    GRIEVANCE DETAIL SHEET
========================================================= */}
        <Sheet
          open={!!selectedGrievance}
          onOpenChange={(open) => {
            if (!open) setSelectedGrievance(null);
          }}
        >
          <SheetContent
            side="right"
            className="w-full sm:max-w-xl p-0 flex flex-col gap-0"
          >
            {selectedGrievance && (
              <>
                {/* Header */}
                <SheetHeader className="border-b bg-white px-6 py-6 pr-14">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] font-semibold"
                        >
                          {selectedGrievance.ticketNumber}
                        </Badge>

                        {selectedGrievance.status === "RESOLVED" ? (
                          <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Resolved
                          </Badge>
                        ) : (
                          <Badge className="border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50">
                            {formatCategory(selectedGrievance.status)}
                          </Badge>
                        )}
                      </div>

                      <SheetTitle className="text-xl font-bold tracking-tight text-slate-950">
                        Citizen Request Details
                      </SheetTitle>

                      <SheetDescription className="mt-1.5 text-xs leading-relaxed">
                        Review the citizen request, location and service
                        category before opening the complete grievance dossier.
                      </SheetDescription>
                    </div>
                  </div>
                </SheetHeader>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                  <div className="px-6 py-6 space-y-6">
                    {/* Citizen */}
                    <section>
                      <div className="mb-3 flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
                          <Users className="h-3.5 w-3.5 text-slate-600" />
                        </div>

                        <div>
                          <h3 className="text-xs font-bold text-slate-900">
                            Citizen Information
                          </h3>
                          <p className="text-[10px] text-muted-foreground">
                            Request origin
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          Citizen
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {selectedGrievance.citizenName}
                        </p>
                      </div>
                    </section>

                    {/* Location */}
                    <section>
                      <div className="mb-3 flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
                          <MapPin className="h-3.5 w-3.5 text-blue-600" />
                        </div>

                        <div>
                          <h3 className="text-xs font-bold text-slate-900">
                            Request Location
                          </h3>
                          <p className="text-[10px] text-muted-foreground">
                            Geographic origin of grievance
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-slate-200 p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            District
                          </p>

                          <p className="mt-1.5 text-sm font-semibold text-slate-900">
                            {selectedGrievance.location.district}
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            State
                          </p>

                          <p className="mt-1.5 text-sm font-semibold text-slate-900">
                            {selectedGrievance.location.state}
                          </p>
                        </div>
                      </div>
                    </section>

                    {/* Sector */}
                    <section>
                      <div className="mb-3 flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50">
                          <Layers className="h-3.5 w-3.5 text-violet-600" />
                        </div>

                        <div>
                          <h3 className="text-xs font-bold text-slate-900">
                            Development Sector
                          </h3>
                          <p className="text-[10px] text-muted-foreground">
                            Classified service area
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 p-4">
                        <Badge
                          variant="secondary"
                          className="bg-slate-100 text-slate-700"
                        >
                          {formatCategory(selectedGrievance.category)}
                        </Badge>
                      </div>
                    </section>

                    <Separator />

                    {/* Action */}
                    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                      <div className="flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                          <ArrowUpRight className="h-4 w-4 text-blue-700" />
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-blue-950">
                            Full grievance dossier
                          </p>

                          <p className="mt-1 text-[11px] leading-relaxed text-blue-800/70">
                            Open the complete record to review the grievance
                            timeline, evidence, classification and resolution
                            history.
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button
                      className="w-full h-11"
                      onClick={() => {
                        onNavigateTab("grievances");
                        setSelectedGrievance(null);
                      }}
                    >
                      Open Full Grievance Dossier
                      <ArrowUpRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* =========================================================
    HOTSPOT DETAIL SHEET
========================================================= */}
        <Sheet open={isHotspotSheetOpen} onOpenChange={setIsHotspotSheetOpen}>
          <SheetContent
            side="right"
            className="w-full sm:max-w-xl p-0 flex flex-col gap-0"
          >
            {selectedHotspot && (
              <>
                {/* Header */}
                <SheetHeader className="border-b bg-white px-6 py-6 pr-14">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge
                          variant="outline"
                          className="border-rose-200 bg-rose-50 text-rose-700"
                        >
                          <Flame className="mr-1 h-3 w-3" />
                          Priority Hotspot
                        </Badge>

                        <Badge
                          variant="outline"
                          className="border-slate-200 text-slate-500"
                        >
                          Risk Index
                        </Badge>
                      </div>

                      <SheetTitle className="text-xl font-bold tracking-tight text-slate-950">
                        {selectedHotspot.district}
                      </SheetTitle>

                      <SheetDescription className="mt-1.5 text-xs">
                        {selectedHotspot.state} · Infrastructure risk
                        intelligence profile
                      </SheetDescription>
                    </div>

                    {/* Risk Score */}
                    <div className="shrink-0 text-right">
                      <p className="text-3xl font-bold tracking-tight text-rose-600">
                        {selectedHotspot.compositeRiskScore}
                      </p>

                      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                        / 100 Risk
                      </p>
                    </div>
                  </div>
                </SheetHeader>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                  <div className="px-6 py-6 space-y-6">
                    {/* KPI Cards */}
                    <section>
                      <div className="mb-3">
                        <h3 className="text-xs font-bold text-slate-900">
                          Hotspot Overview
                        </h3>

                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          Current citizen demand and programme activity
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50">
                            <Users className="h-4 w-4 text-rose-600" />
                          </div>

                          <p className="mt-3 text-2xl font-bold text-slate-950">
                            {selectedHotspot.totalComplaints}
                          </p>

                          <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                            Total complaints
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                            <Building2 className="h-4 w-4 text-blue-600" />
                          </div>

                          <p className="mt-3 text-2xl font-bold text-slate-950">
                            {selectedHotspot.activeProjects}
                          </p>

                          <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                            Active schemes
                          </p>
                        </div>
                      </div>
                    </section>

                    {/* Key Issue */}
                    <section>
                      <div className="mb-3 flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        </div>

                        <div>
                          <h3 className="text-xs font-bold text-slate-900">
                            Key Infrastructure Issue
                          </h3>

                          <p className="text-[10px] text-muted-foreground">
                            Primary demand signal
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                        <p className="text-sm leading-relaxed text-slate-700">
                          {selectedHotspot.keyIssue}
                        </p>
                      </div>
                    </section>

                    {/* Programme Coverage */}
                    <section>
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-bold text-slate-900">
                            Programme Coverage
                          </h3>

                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            Active schemes relative to the planning benchmark
                          </p>
                        </div>

                        <span className="text-sm font-bold text-slate-900">
                          {Math.min(
                            100,
                            (selectedHotspot.activeProjects / 4) * 100,
                          )}
                          %
                        </span>
                      </div>

                      <div className="rounded-xl border border-slate-200 p-4">
                        <Progress
                          value={Math.min(
                            100,
                            (selectedHotspot.activeProjects / 4) * 100,
                          )}
                          className="h-2"
                        />

                        <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
                          <span>
                            {selectedHotspot.activeProjects} active schemes
                          </span>

                          <span>Benchmark: 4 schemes</span>
                        </div>
                      </div>
                    </section>

                    {/* Risk Interpretation */}
                    <section>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Composite Risk
                          </span>

                          <span className="text-xs font-bold text-rose-600">
                            {selectedHotspot.compositeRiskScore}/100
                          </span>
                        </div>

                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-600"
                            style={{
                              width: `${Math.min(
                                100,
                                selectedHotspot.compositeRiskScore,
                              )}%`,
                            }}
                          />
                        </div>

                        <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                          Higher scores indicate stronger demand signals
                          relative to existing programme coverage.
                        </p>
                      </div>
                    </section>

                    <Separator />

                    {/* Actions */}
                    <div className="space-y-2">
                      <Button
                        className="h-11 w-full"
                        onClick={() => {
                          onSelectDistrict(selectedHotspot.district);
                          setIsHotspotSheetOpen(false);
                        }}
                      >
                        <MapPin className="mr-2 h-4 w-4" />
                        Inspect District
                      </Button>

                      <Button
                        variant="outline"
                        className="h-11 w-full"
                        onClick={() =>
                          onAskPolicyAi(
                            `Analyse ${selectedHotspot.district} in ${selectedHotspot.state}. Explain the major infrastructure gap, citizen demand signals, existing schemes, and possible policy interventions.`,
                          )
                        }
                      >
                        <Bot className="mr-2 h-4 w-4" />
                        Ask Policy AI
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
};
