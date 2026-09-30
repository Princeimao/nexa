/* =========================================================
   ENUM-LIKE TYPES
   ========================================================= */

export type SectorCategory =
  | "WATER_SUPPLY"
  | "RURAL_ROADS"
  | "POWER_GRID"
  | "HEALTHCARE"
  | "SANITATION"
  | "EDUCATION"
  | "FLOOD_DRAINAGE";

export type SeverityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type GrievanceStatus =
  | "REGISTERED"
  | "UNDER_VERIFICATION"
  | "ESCALATED_TO_PLANNING"
  | "IN_PROGRESS"
  | "RESOLVED";

export type ProjectStatus =
  | "PLANNED"
  | "SANCTIONED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "STALLED";

export type GapSeverity =
  | "CRITICAL_UNFUNDED"
  | "HIGH_DEFICIT"
  | "MODERATE_GAP"
  | "ALIGNED"
  | "WELL_FUNDED";

export type ChannelType = "WHATSAPP" | "VOICE_CALL" | "WEB_PORTAL" | "SMS";

export type AiAnalysisType =
  | "POLICY_QUERY"
  | "GRIEVANCE_CLASSIFICATION"
  | "PLAN_GAP_ANALYSIS"
  | "PROJECT_IMPACT"
  | "DISTRICT_SUMMARY"
  | "EXECUTIVE_SUMMARY";

export type AiMessageRole = "USER" | "ASSISTANT" | "SYSTEM";

export type ReportType =
  | "EXECUTIVE_SUMMARY"
  | "GRIEVANCE_REPORT"
  | "PROJECT_REPORT"
  | "POLICY_GAP_REPORT"
  | "DISTRICT_REPORT"
  | "FINANCIAL_REPORT";

/* =========================================================
   COMMON
   ========================================================= */

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationHierarchy {
  country: string;
  state: string;
  district: string;
  block?: string;
  villageWard?: string;
  coordinates?: Coordinates;
}

/* =========================================================
   DEPARTMENT
   ========================================================= */

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;

  createdAt: string;
  updatedAt: string;
}

/* =========================================================
   GRIEVANCE
   ========================================================= */

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

  assignedDepartmentId?: string;

  /** Department name as stored on seed records / citizen inputs. */
  assignedDepartment?: string;

  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

/* =========================================================
   GRIEVANCE AUDIT
   ========================================================= */

export interface GrievanceAuditLog {
  id: string;

  grievanceId: string;

  action: string;

  oldStatus?: string;
  newStatus?: string;

  actor: string;
  actorType?: string;

  notes?: string;

  metadata?: Record<string, unknown>;

  createdAt: string;
}

/* =========================================================
   DISTRICT DEMOGRAPHICS
   ========================================================= */

export interface DistrictDemographic {
  id: string;

  country: string;
  state: string;
  district: string;

  population: number;
  ruralPercentage: number;

  vulnerabilityIndex: number;

  baselineWaterIndex: number;
  baselineRoadIndex: number;
  baselinePowerIndex: number;
  baselineHealthIndex: number;

  coordinates: Coordinates;

  /*
   * Cached analytics values.
   * These should ultimately be calculated from
   * grievances and projects on the backend.
   */
  totalComplaintsCount: number;
  unresolvedCount: number;
  criticalComplaintsCount: number;

  activeProjectsCount: number;
  sanctionedBudgetInCr: number;

  createdAt?: string;
  updatedAt?: string;
}

/* =========================================================
   PROJECT IMPACT METRIC
   ========================================================= */

export interface ProjectImpactMetric {
  metricName: string;
  value: number;
  unit: string;
}

/* =========================================================
   PROJECT MILESTONE
   ========================================================= */

export interface ProjectMilestone {
  id: string;

  projectId: string;

  title: string;
  description?: string;

  dueDate: string;

  completed: boolean;
  completedAt?: string;

  createdAt: string;
  updatedAt: string;
}

/* =========================================================
   PROJECT EXPENDITURE
   ========================================================= */

export interface ProjectExpenditure {
  id: string;

  projectId: string;

  amountInCr: number;

  expenditureDate: string;

  description?: string;
  source?: string;

  createdAt: string;
}

/* =========================================================
   GOVERNMENT PROJECT
   ========================================================= */

export interface GovernmentProject {
  id: string;

  projectCode: string;

  title: string;
  schemeName: string;

  sector: SectorCategory;

  country: string;
  state: string;
  district: string;

  /** BRICS enum backing country. */
  bricsCountry?: string;

  sanctionedBudgetInCr: number;
  spentBudgetInCr: number;

  targetBeneficiaries: number;

  status: ProjectStatus;

  /** Derived at runtime (spent/sanctioned); optional on seed records. */
  progressPercentage?: number;

  startDate: string;
  expectedCompletionDate: string;
  actualCompletionDate?: string;

  description: string;

  implementingAgency: string;

  departmentId?: string;
  department?: Department;

  impactMetricBefore?: ProjectImpactMetric;
  impactMetricAfter?: ProjectImpactMetric;

  milestones?: ProjectMilestone[];
  expenditures?: ProjectExpenditure[];

  createdAt?: string;
  updatedAt?: string;
}

/* =========================================================
   POLICY GAP
   ========================================================= */

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

  primaryKeyProblem: string;

  aiRationale: string;
  recommendedAction: string;

  estimatedBudgetRequiredInCr: number;

  analysisPeriodStart?: string;
  analysisPeriodEnd?: string;

  generatedAt?: string;
  generatedBy?: string;

  reviewed?: boolean;
  reviewedBy?: string;
  reviewedAt?: string;

  createdAt?: string;
  updatedAt?: string;
}

/* =========================================================
   CITIZEN CONVERSATION
   ========================================================= */

export type CitizenConversationStep =
  | "GREETING"
  | "COLLECTING_PROBLEM"
  | "COLLECTING_LOCATION"
  | "COLLECTING_DETAILS"
  | "CONFIRMATION"
  | "COMPLETED";

export interface ConversationExtractedData {
  category?: SectorCategory;
  subCategory?: string;

  description?: string;

  country?: string;
  state?: string;
  district?: string;
  block?: string;
  villageWard?: string;

  severity?: SeverityLevel;

  affectedPopulationEst?: number;

  durationWeeks?: number;
}

export interface ConversationHistoryMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;

  /*
   * Keep this optional because voice/audio storage
   * is not implemented yet.
   */
  audioUrl?: string;
}

export interface ConversationSession {
  sessionId: string;

  channel: ChannelType;

  phone: string;

  citizenName?: string;

  language: string;

  step: CitizenConversationStep;

  extractedData: ConversationExtractedData;

  missingFields: string[];

  history: ConversationHistoryMessage[];

  createdTicketId?: string;

  lastActiveAt: string;

  createdAt?: string;
}

/* =========================================================
   POLICY AI
   ========================================================= */

export interface PolicyAiQueryRequest {
  query: string;

  conversationHistory?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;

  country?: string;
  filterState?: string;
  filterDistrict?: string;
  filterSector?: SectorCategory;

  sessionId?: string;
}

/* =========================================================
   AI EVIDENCE
   ========================================================= */

export type EvidenceCardType =
  | "STATISTIC"
  | "PROJECT"
  | "GAP_ANALYSIS"
  | "DEMOGRAPHIC"
  | "TREND";

export interface EvidenceCard {
  title: string;

  type: EvidenceCardType;

  keyMetric: string;

  context: string;

  source: string;
}

/* =========================================================
   POLICY AI RESPONSE
   ========================================================= */

export interface PolicyAiQueryResponse {
  answer: string;

  intent: string;

  confidence: number;

  groundedFacts: {
    district?: string;
    state?: string;
    sector?: string;

    totalGrievances?: number;
    criticalGrievances?: number;

    sanctionedBudgetInCr?: number;

    unfundedDeficitInCr?: number;

    vulnerabilityIndex?: number;

    activeProjects?: number;

    affectedPopulation?: number;
  };

  evidenceCards: EvidenceCard[];

  suggestedFollowUps: string[];

  recommendedPolicyActions: string[];

  sessionId?: string;

  analysisId?: string;
}

/* =========================================================
   POLICY AI SESSION
   ========================================================= */

export interface PolicyAiSession {
  id: string;

  title?: string;

  userId?: string;

  createdAt: string;
  updatedAt: string;
}

/* =========================================================
   POLICY AI MESSAGE
   ========================================================= */

export interface PolicyAiMessage {
  id: string;

  sessionId: string;

  role: AiMessageRole;

  content: string;

  evidence?: EvidenceCard[];

  metadata?: Record<string, unknown>;

  createdAt: string;
}

/* =========================================================
   AI ANALYSIS
   ========================================================= */

export interface AiAnalysis {
  id: string;

  type: AiAnalysisType;

  prompt: string;

  response: string;

  model?: string;

  confidence?: number;

  sourceData?: Record<string, unknown>;

  sessionId?: string;

  createdAt: string;
}

/* =========================================================
   GOVERNANCE REPORT
   ========================================================= */

export interface GovernanceReport {
  id: string;

  title: string;

  reportType: ReportType;

  country?: string;
  state?: string;
  district?: string;

  parameters?: Record<string, unknown>;

  generatedBy?: string;

  /*
   * Optional until file/object storage is added.
   */
  fileUrl?: string;

  createdAt: string;
}

/* =========================================================
   DASHBOARD / ANALYTICS TYPES
   ========================================================= */

export interface SummaryMetrics {
  totalGrievances: number;
  unresolvedGrievances: number;
  criticalGrievances: number;

  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  stalledProjects: number;

  totalSanctionedBudgetInCr: number;
  totalSpentBudgetInCr: number;

  totalAffectedPopulation: number;

  districtsCovered: number;

  averageVulnerabilityIndex: number;

  criticalPolicyGaps: number;
}

/* =========================================================
   HOTSPOTS
   ========================================================= */

export interface HotspotItem {
  district: string;
  state: string;
  country: string;

  sector: SectorCategory;

  grievanceCount: number;

  criticalGrievances: number;

  demandScore: number;

  vulnerabilityIndex: number;

  activeProjectsCount: number;

  sanctionedBudgetInCr: number;

  gapSeverity: GapSeverity;
}

/* =========================================================
   MAP DATA
   ========================================================= */

export interface DistrictMapData {
  id: string;

  district: string;
  state: string;
  country: string;

  latitude: number;
  longitude: number;

  vulnerabilityIndex: number;

  grievanceCount: number;
  unresolvedGrievances: number;
  criticalGrievances: number;

  activeProjects: number;

  sanctionedBudgetInCr: number;

  demandScore?: number;

  gapSeverity?: GapSeverity;
}

/*
 * Backward-compatible alias if your existing components
 * already use DistrictDemographic[] for map data.
 */
export type DistrictDemographicMapItem = DistrictMapData;

/* =========================================================
   PROJECT ANALYTICS
   ========================================================= */

export interface ProjectSectorSummary {
  sector: SectorCategory;

  projectCount: number;

  sanctionedBudgetInCr: number;

  spentBudgetInCr: number;

  completedProjects: number;

  activeProjects: number;

  stalledProjects: number;
}

export interface ProjectStatusSummary {
  status: ProjectStatus;

  count: number;

  sanctionedBudgetInCr: number;

  spentBudgetInCr: number;
}

/* =========================================================
   FINANCIAL ANALYTICS
   ========================================================= */

export interface ExpenditureTrendItem {
  date: string;

  amountInCr: number;

  cumulativeAmountInCr: number;
}

export interface ProjectFinancialSummary {
  projectId: string;

  sanctionedBudgetInCr: number;

  spentBudgetInCr: number;

  remainingBudgetInCr: number;

  utilizationPercentage: number;

  expenditureTrend: ExpenditureTrendItem[];
}

/* =========================================================
   GRIEVANCE ANALYTICS
   ========================================================= */

export interface GrievanceTrendItem {
  date: string;

  total: number;

  critical: number;

  resolved: number;

  unresolved: number;
}

export interface SectorGrievanceSummary {
  sector: SectorCategory;

  total: number;

  critical: number;

  high: number;

  medium: number;

  low: number;

  resolved: number;

  unresolved: number;
}

/* =========================================================
   EXECUTIVE DASHBOARD
   ========================================================= */

export interface ExecutiveDashboardData {
  summary: SummaryMetrics;

  topHotspots: HotspotItem[];

  sectorBreakdown: SectorGrievanceSummary[];

  projectSectorBreakdown: ProjectSectorSummary[];

  projectStatusBreakdown: ProjectStatusSummary[];

  grievanceTrend: GrievanceTrendItem[];

  recentProjects: GovernmentProject[];

  criticalGaps: PolicyGapInsight[];
}
