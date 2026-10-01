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

const rawBase = (import.meta.env.VITE_BACKEND_API as string | undefined)
  ?.trim()
  .replace(/^["']|["']$/g, "");
if (!rawBase && import.meta.env.DEV) {
  console.warn(
    "[api] VITE_BACKEND_API is not set. Check frontend/.env and restart the dev server.",
  );
}
const API_BASE = `${(rawBase || "http://localhost:5000").replace(/\/$/, "")}/api`;

/**
 * POST a JSON payload without triggering a CORS preflight.
 *
 * `Content-Type: application/json` forces browsers to send an OPTIONS
 * preflight, which some gateways/proxies answer without CORS headers —
 * the browser then blocks the real POST and fetch throws
 * `TypeError: Failed to fetch`. Sending the same JSON string as
 * `text/plain` keeps it a CORS "simple request" (no preflight); the
 * backend parses both content types.
 */
const postJson = async <T>(path: string, payload: unknown, timeoutMs = 90000): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify(payload ?? {}),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(
        "Policy AI request timed out. The backend took too long to respond — please retry.",
      );
    }
    // Network-level failure (DNS, CORS-blocked, backend down, offline).
    throw new Error(
      `Failed to fetch (${API_BASE}${path}). The backend is unreachable from this browser — check VITE_BACKEND_API, CORS, and that the backend is running.`,
    );
  } finally {
    clearTimeout(timer);
  }
  const json = await res.json().catch(() => null);
  if (!res.ok || (json && json.success === false)) {
    throw new Error(
      (json && (json.error || json.message)) || `Request failed: ${res.status}`,
    );
  }
  return (json?.data ?? json) as T;
};

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
    // POST alias (see backend grievanceRouter): PATCH always triggers a CORS
    // preflight, POST with text/plain does not.
    return postJson<Grievance>(`/grievances/${id}/status`, { status });
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
    const data = await postJson<PolicyAiResponse>(
      "/ai/policy-analyst/analyze",
      { query, ...context },
    );
    if (!data?.answer) {
      throw new Error("Policy AI returned an empty response.");
    }
    return data;
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
    return postJson("/citizen/chat", payload);
  },

  resetCitizenSession: async (sessionId: string) => {
    return postJson("/citizen/session/reset", { sessionId });
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
    return postJson("/system/reset-seed", {});
  },
};
