export type SectorCategory =
  | 'WATER_SUPPLY'
  | 'RURAL_ROADS'
  | 'POWER_GRID'
  | 'HEALTHCARE'
  | 'SANITATION'
  | 'EDUCATION'
  | 'FLOOD_DRAINAGE';

export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type GrievanceStatus =
  | 'REGISTERED'
  | 'UNDER_VERIFICATION'
  | 'ESCALATED_TO_PLANNING'
  | 'IN_PROGRESS'
  | 'RESOLVED';

export type ProjectStatus =
  | 'PLANNED'
  | 'SANCTIONED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'STALLED';

export type GapSeverity =
  | 'CRITICAL_UNFUNDED'
  | 'HIGH_DEFICIT'
  | 'MODERATE_GAP'
  | 'ALIGNED'
  | 'WELL_FUNDED';

export type ChannelType = 'WHATSAPP' | 'VOICE_CALL' | 'WEB_PORTAL' | 'SMS';

export type BricsCountry =
  | 'RUSSIA'
  | 'INDIA'
  | 'CHINA'
  | 'BRAZIL'
  | 'SOUTH_AFRICA'
  | 'EGYPT'
  | 'ETHIOPIA'
  | 'IRAN'
  | 'SAUDI_ARABIA'
  | 'UAE'
  | 'INDONESIA';

export interface LocationHierarchy {
  country: string;
  state: string;
  district: string;
  block?: string;
  villageWard?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface Grievance {
  id: string;
  ticketNumber: string;
  citizenPhone: string;
  citizenName: string;
  channel: ChannelType;
  language: string;
  rawTranscript: string;
  translatedText?: string;
  category: SectorCategory;
  subCategory: string;
  description: string;
  location: LocationHierarchy;
  severity: SeverityLevel;
  affectedPopulationEst: number;
  status: GrievanceStatus;
  urgencyScore: number;
  confidenceScore: number;
  verified: boolean;
  assignedDepartment?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface DistrictDemographic {
  id: string;
  country: string;
  bricsCountry?: BricsCountry;
  state: string;
  district: string;
  population: number;
  ruralPercentage: number;
  vulnerabilityIndex: number;
  baselineWaterIndex: number;
  baselineRoadIndex: number;
  baselinePowerIndex: number;
  baselineHealthIndex: number;
  coordinates: {
    lat: number;
    lng: number;
  };
  totalComplaintsCount: number;
  unresolvedCount: number;
  criticalComplaintsCount: number;
  activeProjectsCount: number;
  sanctionedBudgetInCr: number;
  topGapSector?: SectorCategory;
  topGapScore?: number;
  unfundedDeficitInCr?: number;
  gapSeverity?: GapSeverity;
}

export interface GovernmentProject {
  id: string;
  projectCode: string;
  title: string;
  schemeName: string;
  sector: SectorCategory;
  country: string;
  bricsCountry?: BricsCountry;
  state: string;
  district: string;
  sanctionedBudgetInCr: number;
  spentBudgetInCr: number;
  targetBeneficiaries: number;
  status: ProjectStatus;
  startDate: string;
  expectedCompletionDate: string;
  actualCompletionDate?: string;
  description: string;
  implementingAgency: string;
  impactMetricBefore?: {
    metricName: string;
    value: number;
    unit: string;
  };
  impactMetricAfter?: {
    metricName: string;
    value: number;
    unit: string;
  };
}

export interface PolicyGapInsight {
  id: string;
  country: string;
  state: string;
  district: string;
  sector: SectorCategory;
  citizenDemandScore: number;
  activeProjectBudgetInCr: number;
  activeProjectsCount: number;
  totalComplaints: number;
  criticalComplaints: number;
  gapSeverity: GapSeverity;
  affectedPopulation: number;
  aiRationale: string;
  recommendedAction: string;
  estimatedBudgetRequiredInCr: number;
  primaryKeyProblem: string;
}

export interface HotspotItem {
  id: string;
  district: string;
  state: string;
  country: string;
  bricsCountry?: BricsCountry;
  population: number;
  vulnerabilityIndex: number;
  compositeRiskScore: number;
  criticalComplaints: number;
  totalComplaints: number;
  activeProjects: number;
  sanctionedBudgetInCr: number;
  coordinates: { lat: number; lng: number };
  primaryGrievanceSector: SectorCategory;
  keyIssue: string;
}

export interface SummaryMetrics {
  totalComplaints: number;
  resolvedComplaints: number;
  criticalComplaints: number;
  resolutionRate: number;
  totalSanctionedBudgetCr: number;
  totalSpentBudgetCr: number;
  unfundedPolicyDeficitCr: number;
  totalPopulationCovered: number;
  activeProjectsCount: number;
  monitoredDistrictsCount: number;
  sectorStats: Record<string, { count: number; critical: number }>;
  periodDeltas?: {
    grievancesPct: number;
    investmentPct: number;
    resolutionRateDelta: number;
  };
}

export interface PipelinePoint {
  week: string;
  grievances: number;
  resolved: number;
  target: number;
}

export interface AnnualTrendPoint {
  month: string;
  complaints: number;
  budget: number;
}

export interface SectorCompositionPoint {
  name: string;
  category: string;
  count: number;
  value: number;
  color: string;
}

export interface TrendData {
  pipeline: PipelinePoint[];
  annualTrend: AnnualTrendPoint[];
  sectorComposition: SectorCompositionPoint[];
}

export interface EvidenceCard {
  title: string;
  type: 'STATISTIC' | 'PROJECT' | 'GAP_ANALYSIS' | 'DEMOGRAPHIC' | 'TREND';
  keyMetric: string;
  context: string;
  source: string;
}

export interface PolicyAiResponse {
  answer: string;
  intent: string;
  confidence: number;
  groundedFacts: {
    district?: string;
    sector?: string;
    totalGrievances?: number;
    criticalGrievances?: number;
    sanctionedBudgetInCr?: number;
    unfundedDeficitInCr?: number;
    vulnerabilityIndex?: number;
  };
  evidenceCards: EvidenceCard[];
  suggestedFollowUps: string[];
  recommendedPolicyActions: string[];
}

/* =========================================================
   BRICS INVESTMENT / TRADE / DEMAND DATASET
   ========================================================= */

export interface BricsMacroRow {
  id: string;
  country: BricsCountry;
  countryName: string;
  year: number;
  gdpUsdBn: number;
  gdpGrowthPct?: number | null;
  populationMn?: number | null;
  localPerUsd: number;
  infraSpendUsdBn: number;
  infraSpendPctGdp: number;
  fdiInflowUsdBn?: number | null;
  fdiOutflowUsdBn?: number | null;
  tradeExportsUsdBn: number;
  tradeImportsUsdBn: number;
  tradeBalanceUsdBn: number;
  currentAccountUsdBn?: number | null;
  surplusInfraAllocationPct: number;
  publicDemandIndex: number;
  demandFulfilmentPct: number;
  allocatableSurplusUsdBn: number;
  allocatableSurplusCr: number;
  source: string;
  notes?: string | null;
}

export interface BricsInvestmentFlowRow {
  id: string;
  investorCountry: BricsCountry;
  recipientCountry: BricsCountry;
  year: number;
  sector: string;
  instrument: string;
  amountUsdBn: number;
  projectCount: number;
  infraSharePct: number;
  jobsCreatedK?: number | null;
  source: string;
}

export interface BricsTradeFlowRow {
  id: string;
  exporter: BricsCountry;
  importer: BricsCountry;
  year: number;
  category: string;
  valueUsdBn: number;
  source: string;
}

export interface BricsCountryTotal {
  country: BricsCountry;
  name: string;
  amountUsdBn: number;
  projectCount: number;
  jobsCreatedK?: number;
}

export interface BricsSectorTotal {
  sector: string;
  amountUsdBn: number;
  projectCount: number;
  jobsCreatedK?: number;
}

export interface BricsYearTotal {
  year: number;
  amountUsdBn: number;
  projectCount: number;
}

export interface InvestmentFlowsResponse {
  totalUsdBn: number;
  infraUsdBn: number;
  projectCount: number;
  jobsCreatedK: number;
  rowCount: number;
  flows: BricsInvestmentFlowRow[];
  byRecipient: BricsCountryTotal[];
  byInvestor: BricsCountryTotal[];
  bySector: BricsSectorTotal[];
  byInstrument: {
    instrument: string;
    amountUsdBn: number;
    projectCount: number;
  }[];
  byYear: BricsYearTotal[];
}

export interface TradeResponse {
  totalUsdBn: number;
  rowCount: number;
  flows: BricsTradeFlowRow[];
  byPartner: {
    exporter: BricsCountry;
    importer: BricsCountry;
    label: string;
    valueUsdBn: number;
  }[];
  byCategory: { category: string; valueUsdBn: number }[];
  byExporter: {
    country: BricsCountry;
    name: string;
    exportsUsdBn: number;
  }[];
  byYear: { year: number; valueUsdBn: number }[];
}

export interface InfrastructureImpact {
  year: number;
  scope: string;
  inboundUsdBn: number;
  outboundUsdBn: number;
  infrastructureUsdBn: number;
  infrastructureSharePct: number;
  jobsCreatedK: number;
  projectCount: number;
  bySector: {
    sector: string;
    totalUsdBn: number;
    infraUsdBn: number;
    jobsK: number;
    projects: number;
  }[];
  topRecipients: {
    country: BricsCountry;
    name: string;
    totalUsdBn: number;
    infraUsdBn: number;
    jobsK: number;
    projects: number;
  }[];
  investors: {
    country: BricsCountry;
    name: string;
    totalUsdBn: number;
    infraUsdBn: number;
    projects: number;
  }[];
  narrative: string;
}

export interface DemandSectorBreakdown {
  sector: string;
  gapCount: number;
  demandCr: number;
  fundedCr: number;
  deficitCr: number;
}

export interface DemandCountryReport {
  country: BricsCountry;
  countryName: string;
  year: number;
  gdpUsdBn: number;
  localPerUsd: number;
  tradeBalanceUsdBn: number;
  currentAccountUsdBn: number;
  surplusInfraAllocationPct: number;
  surplusUsdBn: number;
  surplusCr: number;
  demandTotalCr: number;
  fundedCr: number;
  deficitCr: number;
  fulfilableCr: number;
  shortfallCr: number;
  fulfilmentPct: number;
  baselineFulfilmentPct: number;
  publicDemandIndex: number;
  deficitCoverPct: number;
  hasDistrictData: boolean;
  gapCount: number;
  sectorBreakdown: DemandSectorBreakdown[];
  reasons: string[];
  source: string;
}

export interface DemandFulfilmentReport {
  year: number;
  scope: string;
  countries: DemandCountryReport[];
  totals: {
    demandTotalCr: number;
    fundedCr: number;
    deficitCr: number;
    surplusCr: number;
    fulfilableCr: number;
    shortfallCr: number;
    fulfilmentPct: number;
  };
}

export interface BricsInvestmentSummary {
  year: number;
  scope: string;
  macro: {
    count: number;
    gdpUsdBn: number;
    infraSpendUsdBn: number;
    surplusCountries: number;
    deficitCountries: number;
    rows: BricsMacroRow[];
  };
  investment: {
    totalUsdBn: number;
    infraUsdBn: number;
    projectCount: number;
    jobsCreatedK: number;
    byRecipient: BricsCountryTotal[];
    byInvestor: BricsCountryTotal[];
    bySector: BricsSectorTotal[];
    byInstrument: {
      instrument: string;
      amountUsdBn: number;
      projectCount: number;
    }[];
    byYear: { year: number; amountUsdBn: number; projectCount: number }[];
  };
  impact: InfrastructureImpact;
  trade: {
    totalUsdBn: number;
    byPartner: TradeResponse["byPartner"];
    byCategory: { category: string; valueUsdBn: number }[];
    byYear: { year: number; valueUsdBn: number }[];
  };
  demand: DemandFulfilmentReport;
}
