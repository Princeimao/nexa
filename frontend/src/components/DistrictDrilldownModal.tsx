import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Building2,
  Calendar,
  CheckCircle2,
  Coins,
  Droplets,
  HeartPulse,
  Lightbulb,
  MapPin,
  Route,
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react';
import React from 'react';
import { DistrictDemographic, GovernmentProject, Grievance, PolicyGapInsight } from '../types';
import { currencySymbol } from '../utils/country';

interface DistrictDrilldownModalProps {
  district: DistrictDemographic | null;
  projects: GovernmentProject[];
  grievances: Grievance[];
  planGaps: PolicyGapInsight[];
  country?: string;
  onClose: () => void;
  onAskPolicyAi: (prompt: string) => void;
}

export const DistrictDrilldownModal: React.FC<DistrictDrilldownModalProps> = ({
  district,
  projects,
  grievances,
  planGaps,
  country,
  onClose,
  onAskPolicyAi,
}) => {
  if (!district) return null;

  const cur = currencySymbol(country);

  const districtProjects = projects.filter(
    (p) => p.district.toLowerCase() === district.district.toLowerCase()
  );
  const districtGrievances = grievances.filter(
    (g) => g.location.district.toLowerCase() === district.district.toLowerCase()
  );
  const districtGaps = planGaps.filter(
    (g) => g.district.toLowerCase() === district.district.toLowerCase()
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/20 text-blue-200 border border-blue-400/30 rounded uppercase tracking-wider">
                {district.country} — {district.state}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-500/30 text-rose-200 border border-rose-400/40 rounded">
                Vulnerability Risk: {district.vulnerabilityIndex}/100
              </span>
            </div>
            <h2 className="text-2xl font-bold font-display tracking-tight text-white flex items-center gap-2">
              <MapPin className="w-6 h-6 text-blue-400" />
              {district.district} District Dossier
            </h2>
            <p className="text-xs text-slate-300 font-medium">
              Demographics: {(district.population / 100000).toFixed(1)} Lakh Residents • {district.ruralPercentage}% Rural Population
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {/* 1. Baseline Infrastructure Health Grid */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-600" />
              Baseline Infrastructure Coverage Benchmarks
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="flex items-center gap-1"><Droplets className="w-3.5 h-3.5 text-blue-500" /> Piped Water</span>
                  <span className="font-bold text-slate-900">{district.baselineWaterIndex}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${district.baselineWaterIndex < 40 ? 'bg-rose-500' : 'bg-blue-600'}`} style={{ width: `${district.baselineWaterIndex}%` }}></div>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="flex items-center gap-1"><Route className="w-3.5 h-3.5 text-amber-500" /> Road Connect</span>
                  <span className="font-bold text-slate-900">{district.baselineRoadIndex}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${district.baselineRoadIndex < 40 ? 'bg-rose-500' : 'bg-amber-500'}`} style={{ width: `${district.baselineRoadIndex}%` }}></div>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-yellow-500" /> Power Grid</span>
                  <span className="font-bold text-slate-900">{district.baselinePowerIndex}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${district.baselinePowerIndex < 40 ? 'bg-rose-500' : 'bg-yellow-500'}`} style={{ width: `${district.baselinePowerIndex}%` }}></div>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="flex items-center gap-1"><HeartPulse className="w-3.5 h-3.5 text-rose-500" /> Healthcare</span>
                  <span className="font-bold text-slate-900">{district.baselineHealthIndex}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${district.baselineHealthIndex < 40 ? 'bg-rose-500' : 'bg-teal-600'}`} style={{ width: `${district.baselineHealthIndex}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Policy Plan Gap Alert Banner (if any) */}
          {districtGaps.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-rose-900 uppercase">
                      Current Plan Deficit Identified: {districtGaps[0].sector.replace('_', ' ')}
                    </h4>
                    <span className="text-xs font-bold text-rose-700 bg-white px-2 py-0.5 rounded border border-rose-200">
                      Unfunded Deficit: {cur}{districtGaps[0].estimatedBudgetRequiredInCr} Cr
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-rose-800 leading-relaxed">
                    {districtGaps[0].aiRationale}
                  </p>
                  <div className="mt-2.5 p-2 bg-white/80 rounded-lg border border-rose-100 text-xs text-slate-700 flex items-center justify-between">
                    <span className="font-medium">💡 Recommendation: {districtGaps[0].recommendedAction}</span>
                    <button
                      onClick={() => {
                        onClose();
                        onAskPolicyAi(`Provide detailed policy allocation roadmap for ${district.district} ${districtGaps[0].sector}`);
                      }}
                      className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 shrink-0 ml-2"
                    >
                      Ask Policy AI <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Ongoing & Planned Schemes */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-emerald-600" />
              Public Investment & Sanctioned Schemes ({districtProjects.length})
            </h3>
            {districtProjects.length === 0 ? (
              <p className="text-xs text-slate-500 bg-white p-3 rounded-lg border border-slate-200">
                No major state/central schemes currently sanctioned in active registry for this district.
              </p>
            ) : (
              <div className="space-y-2">
                {districtProjects.map((p) => (
                  <div key={p.id} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded mr-2">
                          {p.projectCode}
                        </span>
                        <span className="text-xs font-bold text-slate-900">{p.title}</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {cur}{p.sanctionedBudgetInCr} Cr
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{p.description}</p>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
                      <span>Agency: <strong className="text-slate-700">{p.implementingAgency}</strong></span>
                      <span>Target Beneficiaries: <strong className="text-slate-700">{(p.targetBeneficiaries / 1000).toFixed(0)}k citizens</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Live Citizen Grievances */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-600" />
              Aggregated Citizen Development Requests ({districtGrievances.length})
            </h3>
            <div className="space-y-2">
              {districtGrievances.map((g) => (
                <div key={g.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{g.ticketNumber}</span>
                      <span className="text-slate-500 font-medium">({g.location.villageWard || 'Hamlet'}, {g.location.block})</span>
                    </div>
                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                      g.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {g.severity}
                    </span>
                  </div>
                  <p className="text-slate-700 italic bg-slate-50 p-2 rounded border border-slate-100 mb-1.5">
                    "{g.rawTranscript}"
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>Department: <strong>{g.assignedDepartment}</strong></span>
                    <span>Status: <strong className="text-blue-700">{g.status}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              onAskPolicyAi(`Analyze infrastructure gap and recommend budget allocation for ${district.district}`);
            }}
            className="px-4 py-2 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Bot className="w-4 h-4 text-blue-200" />
            <span>Ask Policy AI About {district.district}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
