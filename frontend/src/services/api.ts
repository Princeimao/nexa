import {
  BricsInvestmentSummary,
  DemandFulfilmentReport,
  DistrictDemographic,
  GovernmentProject,
  Grievance,
  GrievanceStatus,
  HotspotItem,
  InvestmentFlowsResponse,
  PolicyAiResponse,
  PolicyGapInsight,
  SectorCategory,
  SeverityLevel,
  SummaryMetrics,
  TradeResponse,
  TrendData,
} from "../types";

const API_BASE = `${import.meta.env.VITE_BACKEND_API}/api`;

const countryQuery = (country?: string) => {
  const params = new URLSearchParams();
  if (country && country.toUpperCase() !== "ALL" && country !== "All") {
    params.set("country", country);
  }
  return params;
};

const bricsQuery = (opts: {
  country?: string;
  year?: number;
  extra?: Record<string, string | undefined>;
}) => {
  const params = countryQuery(opts.country);
  if (opts.year) params.set("year", String(opts.year));
  if (opts.extra) {
    for (const [key, value] of Object.entries(opts.extra)) {
      if (value) params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `?${query}` : "";
};

export const api = {
  // Analytics
  getSummary: async (country?: string): Promise<SummaryMetrics> => {
    const query = countryQuery(country).toString();
    const res = await fetch(
      `${API_BASE}/analytics/summary${query ? `?${query}` : ""}`,
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch summary: ${res.status}`);
    }

    const json = await res.json();
    return json.data;
  },

  getTrends: async (country?: string): Promise<TrendData> => {
    const query = countryQuery(country).toString();
    const res = await fetch(
      `${API_BASE}/analytics/trends${query ? `?${query}` : ""}`,
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch trends: ${res.status}`);
    }

    const json = await res.json();
    return json.data;
  },

  getMapData: async (
    country?: string,
    state?: string,
  ): Promise<DistrictDemographic[]> => {
    const params = countryQuery(country);

    if (state && state !== "All") {
      params.set("state", state);
    }

    const query = params.toString();

    const res = await fetch(
      `${API_BASE}/analytics/map${query ? `?${query}` : ""}`,
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch map data: ${res.status}`);
    }

    const json = await res.json();
    return json.data;
  },

  getHotspots: async (country?: string): Promise<HotspotItem[]> => {
    const query = countryQuery(country).toString();

    const res = await fetch(
      `${API_BASE}/analytics/hotspots${query ? `?${query}` : ""}`,
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch hotspots: ${res.status}`);
    }

    const json = await res.json();
    return json.data;
  },

  getGrievances: async (params?: {
    country?: string;
    state?: string;
    status?: string;
  }): Promise<Grievance[]> => {
    const searchParams = countryQuery(params?.country);

    if (params?.state && params.state !== "All") {
      searchParams.set("state", params.state);
    }

    if (params?.status) {
      searchParams.set("status", params.status);
    }

    const query = searchParams.toString();

    const res = await fetch(
      `${API_BASE}/grievances${query ? `?${query}` : ""}`,
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch grievances: ${res.status}`);
    }

    const json = await res.json();
    return json.data;
  },

  getPlanGaps: async (country?: string): Promise<PolicyGapInsight[]> => {
    const query = countryQuery(country).toString();

    const res = await fetch(
      `${API_BASE}/analytics/gaps${query ? `?${query}` : ""}`,
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch plan gaps: ${res.status}`);
    }

    const json = await res.json();
    return json.data;
  },

  getImpactProjects: async (): Promise<GovernmentProject[]> => {
    const res = await fetch(`${API_BASE}/analytics/impact`);
    const json = await res.json();
    return json.data;
  },

  updateGrievanceStatus: async (
    id: string,
    status: GrievanceStatus,
  ): Promise<Grievance> => {
    const res = await fetch(`${API_BASE}/grievances/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    return json.data;
  },

  // Projects & Demographics
  getProjects: async (country?: string): Promise<GovernmentProject[]> => {
    const query = countryQuery(country).toString();

    const res = await fetch(`${API_BASE}/projects${query ? `?${query}` : ""}`);

    if (!res.ok) {
      throw new Error(`Failed to fetch projects: ${res.status}`);
    }

    const json = await res.json();
    return json.data;
  },

  getDemographics: async (): Promise<DistrictDemographic[]> => {
    const res = await fetch(`${API_BASE}/demographics`);
    const json = await res.json();
    return json.data;
  },

  // Policy AI Copilot
  askPolicyAi: async (
    query: string,
    context?: {
      country?: string;
      filterState?: string;
      filterDistrict?: string;
      filterSector?: SectorCategory;
    },
  ): Promise<PolicyAiResponse> => {
    const res = await fetch(`${API_BASE}/ai/policy-analyst/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, ...context }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw new Error(json?.error || `Policy AI request failed: ${res.status}`);
    }
    if (!json.data?.answer) {
      throw new Error("Policy AI returned an empty response.");
    }
    return json.data;
  },

  // Citizen Simulator Chat
  sendCitizenMessage: async (payload: {
    sessionId?: string;
    phone: string;
    citizenName?: string;
    messageText: string;
    channel: "WHATSAPP" | "VOICE_CALL";
    language?: string;
  }) => {
    const res = await fetch(`${API_BASE}/citizen/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  resetCitizenSession: async (sessionId: string) => {
    const res = await fetch(`${API_BASE}/citizen/session/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    return await res.json();
  },

  // BRICS Investment / Trade / Demand
  getBricsSummary: async (
    country?: string,
    year?: number,
  ): Promise<BricsInvestmentSummary> => {
    const res = await fetch(
      `${API_BASE}/brics/summary${bricsQuery({ country, year })}`,
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch BRICS summary: ${res.status}`);
    }

    const json = await res.json();
    return json.data;
  },

  getBricsInvestment: async (opts?: {
    country?: string;
    year?: number;
    sector?: string;
    instrument?: string;
  }): Promise<InvestmentFlowsResponse> => {
    const res = await fetch(
      `${API_BASE}/brics/investment${bricsQuery({
        country: opts?.country,
        year: opts?.year,
        extra: { sector: opts?.sector, instrument: opts?.instrument },
      })}`,
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch investment flows: ${res.status}`);
    }

    const json = await res.json();
    return json.data;
  },

  getBricsTrade: async (opts?: {
    country?: string;
    year?: number;
    category?: string;
  }): Promise<TradeResponse> => {
    const res = await fetch(
      `${API_BASE}/brics/trade${bricsQuery({
        country: opts?.country,
        year: opts?.year,
        extra: { category: opts?.category },
      })}`,
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch trade flows: ${res.status}`);
    }

    const json = await res.json();
    return json.data;
  },

  getBricsDemandFulfilment: async (
    country?: string,
    year?: number,
  ): Promise<DemandFulfilmentReport> => {
    const res = await fetch(
      `${API_BASE}/brics/demand-fulfilment${bricsQuery({ country, year })}`,
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch demand fulfilment: ${res.status}`);
    }

    const json = await res.json();
    return json.data;
  },

  // Reset Dataset
  resetSeedData: async () => {
    const res = await fetch(`${API_BASE}/system/reset-seed`, {
      method: "POST",
    });
    return await res.json();
  },
};
