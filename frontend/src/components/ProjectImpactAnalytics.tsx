import {
  Activity,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock3,
  Coins,
  MapPin,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import React, { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  DistrictDemographic,
  GovernmentProject,
  SummaryMetrics,
} from "../types";
import { currencySymbol } from "../utils/country";

interface ProjectImpactAnalyticsProps {
  projects: GovernmentProject[];
  districts: DistrictDemographic[];
  summary: SummaryMetrics | null;
  country?: string;
}

export const ProjectImpactAnalytics: React.FC<ProjectImpactAnalyticsProps> = ({
  projects,
  districts,
  summary,
  country,
}) => {
  const cur = currencySymbol(country);
  const completedProjects = projects.filter(
    (project) => project.status === "COMPLETED",
  );

  const activeProjects = projects.filter(
    (project) => project.status === "IN_PROGRESS",
  );

  const totalProjectBudget = useMemo(
    () => projects.reduce((sum, project) => sum + (project.sanctionedBudgetInCr || 0), 0),
    [projects],
  );

  const completedBudget = useMemo(
    () =>
      completedProjects.reduce(
        (sum, project) => sum + (project.sanctionedBudgetInCr || 0),
        0,
      ),
    [completedProjects],
  );

  const sectorData = useMemo(() => {
    const grouped: Record<
      string,
      {
        name: string;
        budget: number;
        projects: number;
      }
    > = {};

    projects.forEach((project) => {
      const sector = project.sector?.replaceAll("_", " ") || "Other";

      if (!grouped[sector]) {
        grouped[sector] = {
          name: sector,
          budget: 0,
          projects: 0,
        };
      }

      grouped[sector].budget += project.sanctionedBudgetInCr || 0;
      grouped[sector].projects += 1;
    });

    return Object.values(grouped)
      .sort((a, b) => b.budget - a.budget)
      .slice(0, 8);
  }, [projects]);

  const districtData = useMemo(() => {
    return districts
      .map((district) => ({
        name: district.district,
        complaints: district.totalComplaintsCount || 0,
        budget: district.sanctionedBudgetInCr || 0,
        vulnerability: district.vulnerabilityIndex || 0,
      }))
      .sort((a, b) => b.complaints - a.complaints)
      .slice(0, 10);
  }, [districts]);

  const demandExposure = useMemo(() => {
    if (!districts.length) return 0;

    const totalComplaints = districts.reduce(
      (sum, district) => sum + (district.totalComplaintsCount || 0),
      0,
    );

    return totalComplaints;
  }, [districts]);

  const projectCoverage =
    projects.length > 0
      ? Math.round((completedProjects.length / projects.length) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white">
                <Activity className="h-4 w-4" />
              </span>

              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Investment & Impact
              </span>
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
              Project Impact Analytics
            </h1>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Understand where public investment is being deployed, how much has
              been completed, and how investment aligns with citizen demand and
              district-level vulnerability.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 shadow-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100">
              <Coins className="h-4 w-4 text-slate-700" />
            </div>

            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Total investment
              </p>

              <p className="text-sm font-semibold text-slate-950">
                {cur}{totalProjectBudget.toLocaleString("en-US")} Cr
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          KPI CARDS
      ====================================================== */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<Building2 className="h-4 w-4" />}
          label="Total Projects"
          value={projects.length}
          description="Across the selected country"
        />

        <MetricCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Completed"
          value={completedProjects.length}
          description={`${projectCoverage}% of current projects`}
        />

        <MetricCard
          icon={<Clock3 className="h-4 w-4" />}
          label="In Progress"
          value={activeProjects.length}
          description="Currently active schemes"
        />

        <MetricCard
          icon={<Activity className="h-4 w-4" />}
          label="Citizen Requests"
          value={demandExposure.toLocaleString("en-IN")}
          description="Across analysed districts"
        />
      </div>

      {/* =====================================================
          INVESTMENT OVERVIEW
      ====================================================== */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <CardShell className="xl:col-span-2">
          <SectionHeader
            icon={<Coins className="h-4 w-4" />}
            title="Investment by Sector"
            description="Public project allocation derived from the active project dataset."
          />

          <div className="h-[320px]">
            {sectorData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sectorData}
                  layout="vertical"
                  margin={{
                    top: 10,
                    right: 20,
                    left: 30,
                    bottom: 10,
                  }}
                >
                  <CartesianGrid
                    horizontal={false}
                    stroke="#e2e8f0"
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    type="number"
                    tick={{
                      fontSize: 11,
                      fill: "#64748b",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{
                      fontSize: 10,
                      fill: "#475569",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip
                    cursor={{
                      fill: "#f8fafc",
                    }}
                    contentStyle={{
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
                      fontSize: "12px",
                    }}
                    formatter={(value) => [
                      `${cur}${Number(value ?? 0).toLocaleString("en-US")} Cr`,
                      "Investment",
                    ]}
                  />

                  <Bar
                    dataKey="budget"
                    fill="#0f172a"
                    radius={[0, 5, 5, 0]}
                    barSize={22}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="No project investment data available." />
            )}
          </div>
        </CardShell>

        <CardShell>
          <SectionHeader
            icon={<BarChart3 className="h-4 w-4" />}
            title="Project Status"
            description="Current delivery status across the selected dataset."
          />

          <div className="flex h-[320px] flex-col items-center justify-center">
            <div className="h-[210px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      {
                        name: "Completed",
                        value: completedProjects.length,
                      },
                      {
                        name: "In Progress",
                        value: activeProjects.length,
                      },
                      {
                        name: "Other",
                        value: Math.max(
                          0,
                          projects.length -
                            completedProjects.length -
                            activeProjects.length,
                        ),
                      },
                    ].filter((item) => item.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={62}
                    outerRadius={86}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    <Cell fill="#0f172a" />
                    <Cell fill="#64748b" />
                    <Cell fill="#cbd5e1" />
                  </Pie>

                  <Tooltip
                    contentStyle={{
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid w-full grid-cols-3 gap-2">
              <StatusLegend
                label="Completed"
                value={completedProjects.length}
                color="bg-slate-950"
              />

              <StatusLegend
                label="Active"
                value={activeProjects.length}
                color="bg-slate-500"
              />

              <StatusLegend
                label="Other"
                value={
                  projects.length -
                  completedProjects.length -
                  activeProjects.length
                }
                color="bg-slate-300"
              />
            </div>
          </div>
        </CardShell>
      </div>

      {/* =====================================================
          DEMAND VS INVESTMENT
      ====================================================== */}
      <CardShell>
        <SectionHeader
          icon={<TrendingUp className="h-4 w-4" />}
          title="Citizen Demand vs. Public Investment"
          description="Districts with high complaint volume should be reviewed against current investment levels."
          right={
            <span className="hidden rounded-md border bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-600 sm:inline-flex">
              Top 10 districts by demand
            </span>
          }
        />

        <div className="h-[360px]">
          {districtData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={districtData}
                margin={{
                  top: 10,
                  right: 10,
                  left: -15,
                  bottom: 50,
                }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="name"
                  tick={{
                    fontSize: 10,
                    fill: "#64748b",
                  }}
                  angle={-25}
                  textAnchor="end"
                  interval={0}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={{
                    fontSize: 10,
                    fill: "#64748b",
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  cursor={{
                    fill: "#f8fafc",
                  }}
                  contentStyle={{
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
                    fontSize: "12px",
                  }}
                  formatter={(value, name) => {
                    const numericValue = Number(value ?? 0);
                    if (name === "Citizen requests") {
                      return [
                        numericValue.toLocaleString("en-US"),
                        "Citizen requests",
                      ];
                    }

                    return [
                      `${cur}${numericValue.toLocaleString("en-US")} Cr`,
                      "Sanctioned investment",
                    ];
                  }}
                />

                <Bar
                  dataKey="complaints"
                  name="Citizen requests"
                  fill="#0f172a"
                  radius={[4, 4, 0, 0]}
                  barSize={16}
                />

                <Bar
                  dataKey="budget"
                  name="Sanctioned investment"
                  fill="#94a3b8"
                  radius={[4, 4, 0, 0]}
                  barSize={16}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="No district analytics available." />
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 border-t pt-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-slate-950" />
            Citizen requests
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-slate-400" />
            Sanctioned investment
          </div>
        </div>
      </CardShell>

      {/* =====================================================
          PROJECT REGISTER
      ====================================================== */}
      <CardShell>
        <SectionHeader
          icon={<Building2 className="h-4 w-4" />}
          title="Project Delivery Register"
          description="Recent government projects in the selected country."
          right={
            <span className="text-[11px] text-muted-foreground">
              {projects.length} projects
            </span>
          }
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b bg-slate-50/70 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Sector</th>
                <th className="px-4 py-3">Budget</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {projects.slice(0, 10).map((project) => (
                <tr
                  key={project.id}
                  className="transition hover:bg-slate-50/70"
                >
                  <td className="px-4 py-3">
                    <div className="max-w-xs">
                      <p className="truncate text-xs font-semibold text-slate-900">
                        {project.title}
                      </p>

                      {project.description && (
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                          {project.description}
                        </p>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-700">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      {project.district}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span className="rounded-md border bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-700">
                      {project.sector?.replaceAll("_", " ") || "Other"}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-xs font-semibold text-slate-900">
                    {cur}{(project.sanctionedBudgetInCr || 0).toLocaleString("en-US")} Cr
                  </td>

                  <td className="px-4 py-3">
                    <ProjectStatus status={project.status} />
                  </td>
                </tr>
              ))}

              {projects.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-xs text-muted-foreground"
                  >
                    No projects available for the selected country.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardShell>

      {/* =====================================================
          INTERPRETATION NOTE
      ====================================================== */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white border">
            <Activity className="h-3.5 w-3.5 text-slate-700" />
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-900">
              How to interpret this view
            </p>

            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              High citizen demand does not by itself establish that a project
              caused or failed to cause an outcome. Use this view to identify
              districts where investment, project delivery, vulnerability and
              citizen demand should be examined together.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   SMALL REUSABLE COMPONENTS
========================================================= */

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  description: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  label,
  value,
  description,
}) => {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
          {icon}
        </div>
      </div>

      <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-[11px] text-muted-foreground">{description}</p>
    </div>
  );
};

interface CardShellProps {
  children: React.ReactNode;
  className?: string;
}

const CardShell: React.FC<CardShellProps> = ({ children, className = "" }) => {
  return (
    <section
      className={`overflow-hidden rounded-xl border bg-white shadow-sm ${className}`}
    >
      {children}
    </section>
  );
};

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  right?: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon,
  title,
  description,
  right,
}) => {
  return (
    <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
          {icon}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-slate-950">{title}</h2>

          <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>

      {right}
    </div>
  );
};

const StatusLegend: React.FC<{
  label: string;
  value: number;
  color: string;
}> = ({ label, value, color }) => {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${color}`} />

        <span className="text-lg font-semibold text-slate-950">{value}</span>
      </div>

      <p className="mt-0.5 text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
};

const ProjectStatus: React.FC<{
  status: GovernmentProject["status"];
}> = ({ status }) => {
  const isCompleted = status === "COMPLETED";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold ${
        isCompleted
          ? "border-slate-200 bg-slate-100 text-slate-800"
          : "border-slate-200 bg-white text-slate-600"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isCompleted ? "bg-slate-900" : "bg-slate-400"
        }`}
      />

      {status.replaceAll("_", " ")}
    </span>
  );
};

const EmptyState: React.FC<{ message: string }> = ({ message }) => {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <BarChart3 className="mx-auto h-6 w-6 text-slate-300" />

        <p className="mt-2 text-xs text-muted-foreground">{message}</p>
      </div>
    </div>
  );
};
