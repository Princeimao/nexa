import {
  ConversationSession,
  DistrictDemographic,
  GovernmentProject,
  Grievance,
  GrievanceStatus,
  PolicyGapInsight,
  SectorCategory,
  SeverityLevel,
} from '../types/index.js';
import {
  INITIAL_DISTRICTS,
  INITIAL_GRIEVANCES,
  INITIAL_PLAN_GAPS,
  INITIAL_PROJECTS,
} from './seed.js';

class DataStore {
  private districts: DistrictDemographic[] = [];
  private projects: GovernmentProject[] = [];
  private grievances: Grievance[] = [];
  private planGaps: PolicyGapInsight[] = [];
  private sessions: Map<string, ConversationSession> = new Map();

  constructor() {
    this.resetToSeed();
  }

  public resetToSeed() {
    this.districts = JSON.parse(JSON.stringify(INITIAL_DISTRICTS));
    this.projects = JSON.parse(JSON.stringify(INITIAL_PROJECTS));
    this.grievances = JSON.parse(JSON.stringify(INITIAL_GRIEVANCES));
    this.planGaps = JSON.parse(JSON.stringify(INITIAL_PLAN_GAPS));
    this.sessions.clear();
    this.recalculateDistrictMetrics();
  }

  public recalculateDistrictMetrics() {
    for (const dist of this.districts) {
      const matchingGrievances = this.grievances.filter(
        (g) =>
          g.location.district.toLowerCase() === dist.district.toLowerCase() &&
          g.location.state.toLowerCase() === dist.state.toLowerCase()
      );
      dist.totalComplaintsCount = matchingGrievances.length;
      dist.unresolvedCount = matchingGrievances.filter(
        (g) => g.status !== 'RESOLVED'
      ).length;
      dist.criticalComplaintsCount = matchingGrievances.filter(
        (g) => g.severity === 'CRITICAL' || g.severity === 'HIGH'
      ).length;

      const matchingProjects = this.projects.filter(
        (p) =>
          p.district.toLowerCase() === dist.district.toLowerCase() &&
          p.state.toLowerCase() === dist.state.toLowerCase()
      );
      dist.activeProjectsCount = matchingProjects.length;
      dist.sanctionedBudgetInCr = matchingProjects.reduce(
        (sum, p) => sum + p.sanctionedBudgetInCr,
        0
      );
    }
  }

  // Demographics
  public getDistricts(filterCountry?: string, filterState?: string): DistrictDemographic[] {
    let list = this.districts;
    if (filterCountry) {
      list = list.filter(
        (d) => d.country.toLowerCase() === filterCountry.toLowerCase()
      );
    }
    if (filterState) {
      list = list.filter(
        (d) => d.state.toLowerCase() === filterState.toLowerCase()
      );
    }
    return list;
  }

  public getDistrictByName(districtName: string): DistrictDemographic | undefined {
    return this.districts.find(
      (d) => d.district.toLowerCase() === districtName.toLowerCase()
    );
  }

  // Grievances
  public getGrievances(filters?: {
    category?: SectorCategory;
    severity?: SeverityLevel;
    status?: GrievanceStatus;
    state?: string;
    district?: string;
    search?: string;
    country?: string;
  }): Grievance[] {
    let result = [...this.grievances];

    if (filters?.country) {
      result = result.filter(
        (g) => g.location.country.toLowerCase() === filters.country!.toLowerCase()
      );
    }
    if (filters?.state) {
      result = result.filter(
        (g) => g.location.state.toLowerCase() === filters.state!.toLowerCase()
      );
    }
    if (filters?.district) {
      result = result.filter(
        (g) =>
          g.location.district.toLowerCase() === filters.district!.toLowerCase()
      );
    }
    if (filters?.category) {
      result = result.filter((g) => g.category === filters.category);
    }
    if (filters?.severity) {
      result = result.filter((g) => g.severity === filters.severity);
    }
    if (filters?.status) {
      result = result.filter((g) => g.status === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (g) =>
          g.ticketNumber.toLowerCase().includes(q) ||
          g.description.toLowerCase().includes(q) ||
          g.citizenName.toLowerCase().includes(q) ||
          g.location.district.toLowerCase().includes(q) ||
          g.location.villageWard?.toLowerCase().includes(q) ||
          g.rawTranscript.toLowerCase().includes(q)
      );
    }

    return result.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getGrievanceById(id: string): Grievance | undefined {
    return this.grievances.find(
      (g) => g.id === id || g.ticketNumber === id
    );
  }

  public addGrievance(grievance: Grievance): Grievance {
    this.grievances.unshift(grievance);
    this.recalculateDistrictMetrics();
    this.syncGapInsightForGrievance(grievance);
    return grievance;
  }

  public updateGrievanceStatus(
    id: string,
    status: GrievanceStatus
  ): Grievance | undefined {
    const item = this.grievances.find(
      (g) => g.id === id || g.ticketNumber === id
    );
    if (!item) return undefined;

    item.status = status;
    item.updatedAt = new Date().toISOString();
    if (status === 'RESOLVED') {
      item.resolvedAt = new Date().toISOString();
    }
    this.recalculateDistrictMetrics();
    return item;
  }

  private syncGapInsightForGrievance(g: Grievance) {
    const existing = this.planGaps.find(
      (gap) =>
        gap.district.toLowerCase() === g.location.district.toLowerCase() &&
        gap.sector === g.category
    );
    if (existing) {
      existing.totalComplaints += 1;
      if (g.severity === 'CRITICAL' || g.severity === 'HIGH') {
        existing.criticalComplaints += 1;
        existing.citizenDemandScore = Math.min(
          99,
          existing.citizenDemandScore + 3
        );
      }
    }
  }

  // Projects
  public getProjects(filters?: {
    district?: string;
    state?: string;
    sector?: SectorCategory;
    status?: string;
  }): GovernmentProject[] {
    let result = [...this.projects];
    if (filters?.state) {
      result = result.filter(
        (p) => p.state.toLowerCase() === filters.state!.toLowerCase()
      );
    }
    if (filters?.district) {
      result = result.filter(
        (p) => p.district.toLowerCase() === filters.district!.toLowerCase()
      );
    }
    if (filters?.sector) {
      result = result.filter((p) => p.sector === filters.sector);
    }
    if (filters?.status) {
      result = result.filter((p) => p.status === filters.status);
    }
    return result;
  }

  public getProjectById(id: string): GovernmentProject | undefined {
    return this.projects.find(
      (p) => p.id === id || p.projectCode === id
    );
  }

  // Policy Gaps
  public getPlanGaps(filters?: {
    district?: string;
    state?: string;
    sector?: SectorCategory;
  }): PolicyGapInsight[] {
    let result = [...this.planGaps];
    if (filters?.state) {
      result = result.filter(
        (g) => g.state.toLowerCase() === filters.state!.toLowerCase()
      );
    }
    if (filters?.district) {
      result = result.filter(
        (g) => g.district.toLowerCase() === filters.district!.toLowerCase()
      );
    }
    if (filters?.sector) {
      result = result.filter((g) => g.sector === filters.sector);
    }
    return result.sort((a, b) => b.citizenDemandScore - a.citizenDemandScore);
  }

  // Conversational Sessions (Redis-like in memory)
  public getSession(sessionId: string): ConversationSession | undefined {
    return this.sessions.get(sessionId);
  }

  public saveSession(session: ConversationSession) {
    session.lastActiveAt = new Date().toISOString();
    this.sessions.set(session.sessionId, session);
  }

  public clearSession(sessionId: string) {
    this.sessions.delete(sessionId);
  }

  // Summary Analytics
  public getSummaryMetrics() {
    const totalComplaints = this.grievances.length;
    const resolvedComplaints = this.grievances.filter(
      (g) => g.status === 'RESOLVED'
    ).length;
    const criticalComplaints = this.grievances.filter(
      (g) => g.severity === 'CRITICAL'
    ).length;
    const resolutionRate =
      totalComplaints > 0
        ? Math.round((resolvedComplaints / totalComplaints) * 100)
        : 0;

    const totalSanctionedBudgetCr = this.projects.reduce(
      (sum, p) => sum + p.sanctionedBudgetInCr,
      0
    );
    const totalSpentBudgetCr = this.projects.reduce(
      (sum, p) => sum + p.spentBudgetInCr,
      0
    );

    const unfundedPolicyDeficitCr = this.planGaps.reduce(
      (sum, gap) => sum + gap.estimatedBudgetRequiredInCr,
      0
    );

    const totalPopulationCovered = this.districts.reduce(
      (sum, d) => sum + d.population,
      0
    );

    // Sector breakdown
    const sectorStats: Record<string, { count: number; critical: number }> = {};
    for (const g of this.grievances) {
      if (!sectorStats[g.category]) {
        sectorStats[g.category] = { count: 0, critical: 0 };
      }
      sectorStats[g.category].count++;
      if (g.severity === 'CRITICAL' || g.severity === 'HIGH') {
        sectorStats[g.category].critical++;
      }
    }

    return {
      totalComplaints,
      resolvedComplaints,
      criticalComplaints,
      resolutionRate,
      totalSanctionedBudgetCr,
      totalSpentBudgetCr,
      unfundedPolicyDeficitCr,
      totalPopulationCovered,
      activeProjectsCount: this.projects.length,
      monitoredDistrictsCount: this.districts.length,
      sectorStats,
    };
  }
}

export const store = new DataStore();
