import {
  ArrowUpRight,
  BarChart3,
  Building2,
  CircleDollarSign,
  Globe2,
  Landmark,
  TrendingUp,
  Users,
} from "lucide-react";
import React, { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  BricsInvestmentSummary,
  DemandCountryReport,
} from "../types";
import { formatCr, toBricsEnum } from "../utils/country";
import type { TabType } from "./Navbar";

import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
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

interface InvestmentDashboardProps {
  summary: BricsInvestmentSummary | null;
  country?: string;
  onNavigateTab: (tab: TabType) => void;
}

const titleCase = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const bn = (value: number) => {
  if (Math.abs(value) >= 1000)
    return `USD ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })} bn`;
  if (Math.abs(value) >= 100)
    return `USD ${value.toFixed(0)} bn`;
  if (Math.abs(value) >= 10)
    return `USD ${value.toFixed(1)} bn`;
  return `USD ${value.toFixed(2)} bn`;
};

const crShort = (value: number) =>
  Math.abs(value) >= 1000
    ? `${(value / 1000).toFixed(1)}k`
    : value.toFixed(value >= 100 ? 0 : 1);

const SECTOR_COLORS = [
  "#2563eb",
  "#059669",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#65a30d",
  "#475569",
];

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "default",
}: {
  title: string;
  value: React.ReactNode;
  description: string;
  icon: React.ElementType;
  tone?: "default" | "blue" | "green" | "amber";
}) {
  const tones = {
    default: "bg-slate-100 text-slate-700",
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <div className="mt-1 text-2xl font-bold tracking-tight text-foreground">
          {value}
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function FulfilmentRow({ entry }: { entry: DemandCountryReport }) {
  return (
    <TableRow>
      <TableCell className="font-semibold">{entry.countryName}</TableCell>
      <TableCell className="text-right">
        {crShort(entry.demandTotalCr)}
      </TableCell>
      <TableCell className="text-right text-emerald-600">
        {crShort(entry.fundedCr)}
      </TableCell>
      <TableCell className="text-right text-rose-600">
        {crShort(entry.deficitCr)}
      </TableCell>
      <TableCell className="text-right">
        {entry.tradeBalanceUsdBn > 0 ? (
          <span className="font-medium text-emerald-600">
            +{entry.surplusCr.toFixed(0)}
          </span>
        ) : (
          <span className="text-rose-500">0</span>
        )}
      </TableCell>
      <TableCell className="w-48">
        <div className="flex items-center gap-2">
          <Progress value={Math.min(100, entry.fulfilmentPct)} className="h-2" />
          <span className="w-12 text-right text-xs font-semibold">
            {Math.round(entry.fulfilmentPct)}%
          </span>
        </div>
      </TableCell>
    </TableRow>
  );
}

export const InvestmentDashboard: React.FC<InvestmentDashboardProps> = ({
  summary,
  country,
  onNavigateTab,
}) => {
  const focus = country && country !== "ALL" ? country : undefined;

  const sectorChartData = useMemo(
    () =>
      (summary?.impact.bySector ?? []).map((s) => ({
        name: titleCase(s.sector),
        infrastructure: Number(s.infraUsdBn.toFixed(2)),
        total: Number(s.totalUsdBn.toFixed(2)),
        jobs: Math.round(s.jobsK),
      })),
    [summary],
  );

  const recipientChartData = useMemo(
    () =>
      (summary?.investment.byRecipient ?? []).map((r) => ({
        name: r.name,
        amount: Number(r.amountUsdBn.toFixed(2)),
      })),
    [summary],
  );

  const partnerChartData = useMemo(
    () =>
      (summary?.trade.byPartner ?? [])
        .slice(0, 10)
        .map((p) => ({
          name: p.label.replace(" → ", " ⇄ "),
          value: Number(p.valueUsdBn.toFixed(2)),
        })),
    [summary],
  );

  const categoryChartData = useMemo(
    () =>
      (summary?.trade.byCategory ?? []).map((c, i) => ({
        name: titleCase(c.category),
        value: Number(c.valueUsdBn.toFixed(2)),
        fill: SECTOR_COLORS[i % SECTOR_COLORS.length],
      })),
    [summary],
  );

  const yearChartData = useMemo(
    () =>
      (summary?.investment.byYear ?? []).map((y) => ({
        year: String(y.year),
        investment: Number(y.amountUsdBn.toFixed(2)),
        trade: Number(
          (summary?.trade.byYear.find((t) => t.year === y.year)?.valueUsdBn ??
            0
          ).toFixed(2),
        ),
      })),
    [summary],
  );

  const focusEnum = focus ? toBricsEnum(focus) : undefined;

  const focusDemand = summary && focusEnum
    ? summary.demand.countries.find((c) => c.country === focusEnum) ?? null
    : null;

  if (!summary) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <Globe2 className="h-10 w-10 text-slate-300" />
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              BRICS investment dataset not loaded
            </h2>
            <p className="mt-1 max-w-lg text-sm text-muted-foreground">
              The backend returned no investment, trade or surplus data. Apply
              the Prisma migration (<code>prisma db push</code>) and re-run the
              seeder (<code>POST /api/system/reset-seed</code>) to populate the
              macro, investment and trade tables.
            </p>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => onNavigateTab("map")}
          >
            Back to dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  const totals = summary.demand.totals;
  const displayDemand = focusDemand
    ? {
        demand: focusDemand.demandTotalCr,
        funded: focusDemand.fundedCr,
        deficit: focusDemand.deficitCr,
        surplus: focusDemand.surplusCr,
        fulfilment: focusDemand.fulfilmentPct,
        shortfall: focusDemand.shortfallCr,
        reasons: focusDemand.reasons,
        label: focusDemand.countryName,
      }
    : {
        demand: totals.demandTotalCr,
        funded: totals.fundedCr,
        deficit: totals.deficitCr,
        surplus: totals.surplusCr,
        fulfilment: totals.fulfilmentPct,
        shortfall: totals.shortfallCr,
        reasons: [] as string[],
        label: summary.demand.scope,
      };

  return (
    <div className="space-y-6">
      {/* =========================================================
          PAGE HEADER
      ========================================================== */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-emerald-200 bg-emerald-50 text-emerald-700"
            >
              <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-600" />
              BRICS+ CROSS-BORDER CAPITAL
            </Badge>
            <span className="text-xs text-muted-foreground">
              {summary.year} dataset • {summary.scope}
            </span>
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Investment, Trade & Surplus Intelligence
          </h1>

          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            How BRICS-country investment funds infrastructure across partners,
            how bilateral trade reshapes surpluses, and how much of public
            demand can actually be fulfilled from that surplus.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => onNavigateTab("gaps")}
          >
            <Landmark className="h-4 w-4" />
            Plan Gap Matrix
          </Button>
          <Button
            className="gap-2 bg-slate-950 hover:bg-slate-800"
            onClick={() => onNavigateTab("impact")}
          >
            <BarChart3 className="h-4 w-4 text-blue-300" />
            Project Impact
          </Button>
        </div>
      </div>

      {/* =========================================================
          KPI ROW
      ========================================================== */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Cross-Border Investment"
          value={bn(summary.investment.totalUsdBn)}
          description={`${summary.investment.projectCount.toLocaleString()} funded projects across BRICS+ partners`}
          icon={CircleDollarSign}
          tone="blue"
        />
        <StatCard
          title="Infrastructure Capital"
          value={bn(summary.impact.infrastructureUsdBn)}
          description={`${Math.round(summary.impact.infrastructureSharePct)}% of flows land in physical infrastructure • ~${Math.round(
            summary.impact.jobsCreatedK * 1000,
          ).toLocaleString()} jobs`}
          icon={Building2}
          tone="green"
        />
        <StatCard
          title="Bilateral Goods Trade"
          value={bn(summary.trade.totalUsdBn)}
          description={`${summary.macro.surplusCountries} surplus • ${summary.macro.deficitCountries} deficit countries in scope`}
          icon={Globe2}
          tone="amber"
        />
        <StatCard
          title="Demand Fulfillable From Surplus"
          value={`${Math.round(displayDemand.fulfilment)}%`}
          description={`${formatCr(
            Math.max(0, displayDemand.shortfall),
            focus,
          )} still short in ${displayDemand.label}`}
          icon={Users}
          tone="default"
        />
      </div>

      {/* =========================================================
          INFRASTRUCTURE IMPACT
      ========================================================== */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              How BRICS investment becomes infrastructure
            </CardTitle>
            <CardDescription>
              Physical infrastructure share of cross-border flows, by sector
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectorChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip
                    formatter={(value) => bn(Number(value ?? 0))}
                  />
                  <Bar dataKey="infrastructure" name="Infrastructure">
                    {sectorChartData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={SECTOR_COLORS[index % SECTOR_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs leading-relaxed text-blue-900">
              {summary.impact.narrative}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Largest investors</CardTitle>
            <CardDescription>
              Capital deployed into this scope, {summary.year}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.impact.investors.slice(0, 6).map((inv) => (
              <div key={inv.country} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">
                    {inv.name}
                  </span>
                  <span className="text-muted-foreground">
                    {bn(inv.infraUsdBn)} infra
                  </span>
                </div>
                <Progress
                  value={
                    summary.impact.investors[0]?.infraUsdBn
                      ? (inv.infraUsdBn /
                          summary.impact.investors[0].infraUsdBn) *
                        100
                      : 0
                  }
                  className="h-1.5"
                />
              </div>
            ))}
            <Separator className="my-2" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Outbound (scope)</span>
              <span className="font-semibold">
                {bn(summary.impact.outboundUsdBn)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Inbound (scope)</span>
              <span className="font-semibold">
                {bn(summary.impact.inboundUsdBn)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* =========================================================
          INVESTMENT FLOWS + TRADE
      ========================================================== */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Investment received by partner
            </CardTitle>
            <CardDescription>
              FDI, BRI construction/finance and South-South development flows
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={recipientChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fontSize: 11 }}
                  />
                  <RechartsTooltip
                    formatter={(value) => bn(Number(value ?? 0))}
                  />
                  <Bar dataKey="amount" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Top bilateral trade corridors
            </CardTitle>
            <CardDescription>
              Goods trade between BRICS+ partners, {summary.year}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={partnerChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={150}
                    tick={{ fontSize: 10 }}
                  />
                  <RechartsTooltip
                    formatter={(value) => bn(Number(value ?? 0))}
                  />
                  <Bar dataKey="value" fill="#059669" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* =========================================================
          INVESTMENT TIMELINE + TRADE CATEGORIES
      ========================================================== */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Investment vs trade over time
            </CardTitle>
            <CardDescription>
              Cross-border investment flows compared with bilateral goods trade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={yearChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip
                    formatter={(value) => bn(Number(value ?? 0))}
                  />
                  <Line
                    type="monotone"
                    dataKey="investment"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                    name="Investment"
                  />
                  <Line
                    type="monotone"
                    dataKey="trade"
                    stroke="#059669"
                    strokeWidth={2}
                    dot={false}
                    name="Trade"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trade by category</CardTitle>
            <CardDescription>Composition of BRICS+ goods trade</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {categoryChartData.map((cat) => {
              const max = Math.max(
                ...categoryChartData.map((c) => c.value),
                1,
              );
              return (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700">{cat.name}</span>
                    <span className="font-semibold">{bn(cat.value)}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${Math.max(3, (cat.value / max) * 100)}%`,
                        backgroundColor: cat.fill,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* =========================================================
          DEMAND VS SURPLUS — POLICY VIEW
      ========================================================== */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                Public demand vs surplus capacity
              </CardTitle>
              <CardDescription>
                How much citizen demand can be fulfilled from the trade surplus
                earmarked for infrastructure
              </CardDescription>
            </div>

            <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-2">
              <span className="text-xs text-muted-foreground">
                Fulfillable
              </span>
              <span className="text-xl font-bold text-slate-950">
                {Math.round(displayDemand.fulfilment)}%
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Assessed demand
              </p>
              <p className="mt-1 text-lg font-bold">
                {formatCr(displayDemand.demand, focus)}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs uppercase tracking-wide text-emerald-700">
                Funded by active projects
              </p>
              <p className="mt-1 text-lg font-bold text-emerald-700">
                {formatCr(displayDemand.funded, focus)}
              </p>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-xs uppercase tracking-wide text-rose-700">
                Unfunded deficit
              </p>
              <p className="mt-1 text-lg font-bold text-rose-700">
                {formatCr(displayDemand.deficit, focus)}
              </p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs uppercase tracking-wide text-blue-700">
                Surplus reallocated to infra
              </p>
              <p className="mt-1 text-lg font-bold text-blue-700">
                {formatCr(displayDemand.surplus, focus)}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Why demand cannot (or can) be fulfilled — {displayDemand.label}
            </p>
            {displayDemand.reasons.length > 0 ? (
              <ul className="space-y-1.5">
                {displayDemand.reasons.map((reason, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 rounded-lg border bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-700"
                  >
                    <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    {reason}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">
                Select a single country to see its surplus / deficit analysis.
              </p>
            )}
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-right">Demand (Cr)</TableHead>
                  <TableHead className="text-right">Funded (Cr)</TableHead>
                  <TableHead className="text-right">Deficit (Cr)</TableHead>
                  <TableHead className="text-right">Surplus (Cr)</TableHead>
                  <TableHead>Fulfilment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.demand.countries.map((entry) => (
                  <FulfilmentRow key={entry.country} entry={entry} />
                ))}
              </TableBody>
            </Table>
          </div>

          {focusDemand && focusDemand.sectorBreakdown.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Sector demand breakdown — {focusDemand.countryName}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {focusDemand.sectorBreakdown.map((sector) => (
                  <div
                    key={sector.sector}
                    className="rounded-xl border p-3 text-xs"
                  >
                    <p className="font-semibold text-slate-700">
                      {titleCase(sector.sector)}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {sector.gapCount} district gap(s)
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-emerald-600">
                        {sector.fundedCr.toFixed(1)} Cr funded
                      </span>
                      <span className="text-rose-600">
                        {sector.deficitCr.toFixed(1)} Cr short
                      </span>
                    </div>
                    <Progress
                      value={
                        sector.demandCr > 0
                          ? (sector.fundedCr / sector.demandCr) * 100
                          : 0
                      }
                      className="mt-2 h-1.5"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            Model: fulfilable = active project budgets + (max(0, trade
            balance) × infrastructure allocation %), converted at the country's
            {focusDemand ? ` ${focusDemand.countryName}` : ""} spot rate (1 USD
            bn = fx × 100 Cr). Macro sources:{" "}
            {focusDemand
              ? focusDemand.source
              : "World Bank WDI 2024; BCB BRICS Bulletin 2025; customs authorities"}
            .
          </p>
        </CardContent>
      </Card>

      {/* =========================================================
          SOURCE TABLE
      ========================================================== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Macro & trade balance</CardTitle>
          <CardDescription>
            Published macro-economic anchors behind the surplus model
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-right">GDP (USD bn)</TableHead>
                  <TableHead className="text-right">Infra spend</TableHead>
                  <TableHead className="text-right">Exports</TableHead>
                  <TableHead className="text-right">Imports</TableHead>
                  <TableHead className="text-right">Trade balance</TableHead>
                  <TableHead className="text-right">Demand index</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.macro.rows
                  .filter((row) => row.year === summary.year)
                  .map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-semibold">
                        {row.countryName}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.gdpUsdBn.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {bn(row.infraSpendUsdBn)}
                      </TableCell>
                      <TableCell className="text-right">
                        {bn(row.tradeExportsUsdBn)}
                      </TableCell>
                      <TableCell className="text-right">
                        {bn(row.tradeImportsUsdBn)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${
                          row.tradeBalanceUsdBn >= 0
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}
                      >
                        {row.tradeBalanceUsdBn >= 0 ? "+" : ""}
                        {row.tradeBalanceUsdBn.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">
                        {Math.round(row.publicDemandIndex)}/100
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvestmentDashboard;
