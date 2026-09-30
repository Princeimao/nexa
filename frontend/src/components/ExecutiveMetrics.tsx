import {
  AlertTriangle,
  CheckCircle2,
  Coins,
  FileSpreadsheet,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import React from 'react';
import { HotspotItem, SummaryMetrics } from '../types';
import { currencySymbol } from '../utils/country';

interface ExecutiveMetricsProps {
  metrics: SummaryMetrics | null;
  hotspotsCount: number;
  hotspots?: HotspotItem[];
  country?: string;
}

export const ExecutiveMetrics: React.FC<ExecutiveMetricsProps> = ({
  metrics,
  hotspotsCount,
  hotspots = [],
  country,
}) => {
  if (!metrics) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 bg-white rounded-xl border border-slate-200 animate-pulse" />
        ))}
      </div>
    );
  }

  const cur = currencySymbol(country);
  const topPriority =
    hotspots.length >= 2
      ? `${hotspots[0].district} & ${hotspots[1].district} top priority`
      : hotspots.length === 1
        ? `${hotspots[0].district} top priority`
        : 'No hotspots ranked';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-6">
      {/* 1. Total Grievances */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:border-slate-300 transition">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Citizen Requests
          </span>
          <div className="p-1.5 bg-blue-50 text-blue-700 rounded-md">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-slate-900 font-display">
            {metrics.totalComplaints}
          </span>
          <span className="text-[11px] font-medium text-rose-600 flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" />
            {metrics.criticalComplaints} Critical
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          From {metrics.monitoredDistrictsCount} monitored districts
        </p>
      </div>

      {/* 2. Priority Hotspots */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:border-slate-300 transition">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Demand Hotspots
          </span>
          <div className="p-1.5 bg-rose-50 text-rose-700 rounded-md">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-rose-700 font-display">
            {hotspotsCount}
          </span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded">
            Immediate Action
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          {topPriority}
        </p>
      </div>

      {/* 3. Sanctioned Budget */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:border-slate-300 transition">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Public Investment
          </span>
          <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-md">
            <Coins className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-slate-900 font-display">
            {cur}{metrics.totalSanctionedBudgetCr.toLocaleString()} <span className="text-sm font-normal text-slate-500">Cr</span>
          </span>
          <span className="text-[11px] font-medium text-emerald-600">
            {metrics.activeProjectsCount} Schemes
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          {cur}{metrics.totalSpentBudgetCr.toFixed(1)} Cr disbursed to date
        </p>
      </div>

      {/* 4. Policy Plan Deficit */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:border-slate-300 transition">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Plan Gap Deficit
          </span>
          <div className="p-1.5 bg-amber-50 text-amber-700 rounded-md">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-amber-700 font-display">
            {cur}{metrics.unfundedPolicyDeficitCr} <span className="text-sm font-normal text-amber-600">Cr</span>
          </span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded">
            Unfunded Demand
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          Needs supplementary FY reallocation
        </p>
      </div>

      {/* 5. Resolution Rate */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:border-slate-300 transition">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Grievance Resolution
          </span>
          <div className="p-1.5 bg-teal-50 text-teal-700 rounded-md">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-slate-900 font-display">
            {metrics.resolutionRate}%
          </span>
          <span className="text-[11px] font-medium text-teal-600 flex items-center gap-0.5">
            <TrendingDown className="w-3 h-3" />
            {metrics.resolvedComplaints} Closed
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          {(metrics.totalComplaints - metrics.resolvedComplaints)} active investigations
        </p>
      </div>
    </div>
  );
};
