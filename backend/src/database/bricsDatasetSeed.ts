import type { BricsCountry } from "@prisma/client";
import { prisma } from "../config/prisma.config.js";

/**
 * =========================================================
 * BRICS MACRO / INVESTMENT / TRADE DATASET SEED
 * =========================================================
 * Builds ~11,000 rows of cross-border BRICS economic data:
 *
 *   - BricsMacroIndicator  : 11 countries x 10 years (2015-2024)
 *   - BricsInvestmentFlow  : FDI + BRI + ODA flows, sector split
 *   - BricsTradeFlow       : bilateral goods trade, category split
 *
 * REAL ANCHORS used (2024 unless stated):
 *   World Bank WDI        - GDP / population / growth
 *   China Customs 2024    - China-Russia USD 244.8bn (CN exp 115.5,
 *                           RU exp 129.3), China-Brazil ~USD 184bn,
 *                           China-India ~USD 136bn
 *   Ministry of Comm. IN  - India exports to China USD 14.25bn,
 *                           imports USD 113.5bn (FY2024-25),
 *                           India-BRICS trade USD 399bn (2024)
 *   Reuters / Secex       - Brazil trade surplus USD 74.6bn,
 *                           imports USD 262.5bn
 *   BCB BRICS Bulletin    - China current account +USD 423.9bn,
 *                           Russia +USD 62bn, India -USD 37bn (Apr-Dec),
 *                           Iran +USD 16.2bn, Egypt +USD 9.7bn (FY23/24)
 *   NDB Annual Report 24  - cumulative approvals USD 39.1bn / 120
 *                           projects; shares India 27%, China 25%,
 *                           South Africa 19%, Brazil 17%, Russia 11%
 *   MOFCOM / Nedopil BRI  - China non-financial ODI USD 143.85bn,
 *                           BRI investment USD 121.8bn (2024),
 *                           Saudi construction USD 18.9bn, UAE 3.1bn
 *   CBUAE / SARS / CBE /  - UAE goods surplus AED 243.7bn, Egypt
 *   BPS / GASTAT / NBE    - deficit, Indonesia +USD 29bn, etc.
 *
 * Everything not directly published is generated with a seeded
 * deterministic PRNG (mulberry32) so re-seeding is stable and the
 * gravity-model rows are labelled as estimates in `source`.
 * =========================================================
 */

export const BRICS_INVESTMENT_SECTORS = [
  "TRANSPORT",
  "ENERGY",
  "DIGITAL",
  "WATER_SANITATION",
  "HEALTHCARE",
  "AGRI_FOOD",
  "HOUSING_URBAN",
  "EDUCATION",
  "MANUFACTURING",
] as const;

export const BRICS_TRADE_CATEGORIES = [
  "ENERGY_MINERALS",
  "MACHINERY_ELECTRONICS",
  "AGRI_FOOD",
  "PHARMA_HEALTH",
  "TEXTILES_APPAREL",
  "VEHICLES_TRANSPORT",
] as const;

export const BRICS_INSTRUMENTS = [
  "FDI",
  "BRI_CONSTRUCTION",
  "BRI_FINANCE",
  "OFFICIAL_DEVELOPMENT",
] as const;

/* =========================================================
   COUNTRY METADATA — 2024 anchors
   ========================================================= */

export interface BricsCountryMeta {
  name: string;
  gdp2024: number; // USD bn (World Bank WDI)
  populationMn2024: number;
  fx2015: number; // local currency units per USD
  fx2024: number;
  exports2024: number; // goods exports to world, USD bn
  imports2024: number; // goods imports from world, USD bn
  currentAccount2024: number; // USD bn
  infraPctGdp2024: number;
  fdiIn2024: number; // USD bn
  fdiOut2024: number; // USD bn
  /** Share of that country's outward FDI that lands in BRICS partners. */
  outBricsShare: number;
  publicDemandIndex2024: number; // 0-100
  demandFulfilment2024: number; // %
  /** Real GDP growth % 2015..2024 (IMF/World Bank). */
  growth: number[];
  source: string;
}

export const BRICS_COUNTRY_META: Record<BricsCountry, BricsCountryMeta> = {
  CHINA: {
    name: "China",
    gdp2024: 18743.8,
    populationMn2024: 1411.8,
    fx2015: 6.28,
    fx2024: 7.2,
    exports2024: 3580,
    imports2024: 2590,
    currentAccount2024: 423.9,
    infraPctGdp2024: 4.4,
    fdiIn2024: 18.0,
    fdiOut2024: 143.9,
    outBricsShare: 0.12,
    publicDemandIndex2024: 28,
    demandFulfilment2024: 88,
    growth: [7.0, 6.8, 6.9, 6.7, 6.0, 2.2, 8.4, 3.0, 5.2, 5.0],
    source:
      "World Bank WDI 2024; China Customs 2024; BCB BRICS Bulletin 2025; MOFCOM 2024",
  },
  INDIA: {
    name: "India",
    gdp2024: 3909.9,
    populationMn2024: 1428.6,
    fx2015: 64.0,
    fx2024: 83.4,
    exports2024: 437.7,
    imports2024: 721.2,
    currentAccount2024: -49.0,
    infraPctGdp2024: 3.4,
    fdiIn2024: 68.0,
    fdiOut2024: 22.0,
    outBricsShare: 0.35,
    publicDemandIndex2024: 62,
    demandFulfilment2024: 62,
    growth: [8.0, 8.3, 6.8, 6.5, 3.9, -5.8, 9.1, 7.0, 8.2, 6.5],
    source:
      "World Bank WDI 2024; MoC India FY2024-25; BCB BRICS Bulletin 2025; Rubix/PIB 2024",
  },
  RUSSIA: {
    name: "Russia",
    gdp2024: 2173.8,
    populationMn2024: 146.0,
    fx2015: 61.0,
    fx2024: 92.6,
    exports2024: 434.0,
    imports2024: 295.0,
    currentAccount2024: 62.0,
    infraPctGdp2024: 4.0,
    fdiIn2024: 15.0,
    fdiOut2024: 30.0,
    outBricsShare: 0.45,
    publicDemandIndex2024: 40,
    demandFulfilment2024: 74,
    growth: [-2.0, 0.2, 1.8, 2.8, 2.2, -2.7, 5.9, -1.2, 3.6, 4.3],
    source:
      "World Bank WDI 2024; BCB BRICS Bulletin 2025; Federal Customs Service 2024",
  },
  BRAZIL: {
    name: "Brazil",
    gdp2024: 2185.8,
    populationMn2024: 211.9,
    fx2015: 3.9,
    fx2024: 5.4,
    exports2024: 337.1,
    imports2024: 262.5,
    currentAccount2024: -61.0,
    infraPctGdp2024: 2.5,
    fdiIn2024: 74.0,
    fdiOut2024: 25.0,
    outBricsShare: 0.3,
    publicDemandIndex2024: 45,
    demandFulfilment2024: 70,
    growth: [-3.5, -3.3, 1.3, 1.8, 1.2, -3.3, 4.8, 2.9, 2.9, 3.4],
    source:
      "World Bank WDI 2024; Reuters/Secex Jan 2025; BCB BRICS Bulletin 2025",
  },
  SOUTH_AFRICA: {
    name: "South Africa",
    gdp2024: 401.1,
    populationMn2024: 62.0,
    fx2015: 12.8,
    fx2024: 18.5,
    exports2024: 121.5,
    imports2024: 99.6,
    currentAccount2024: -2.4,
    infraPctGdp2024: 3.0,
    fdiIn2024: 6.0,
    fdiOut2024: 8.0,
    outBricsShare: 0.4,
    publicDemandIndex2024: 58,
    demandFulfilment2024: 55,
    growth: [1.3, 1.1, 1.4, 1.5, 0.3, -6.3, 4.7, 1.9, 0.7, 0.5],
    source: "World Bank WDI 2024; SARS trade statistics 2024; BCB BRICS Bulletin 2025",
  },
  INDONESIA: {
    name: "Indonesia",
    gdp2024: 1371.2,
    populationMn2024: 277.5,
    fx2015: 13700,
    fx2024: 15780,
    exports2024: 264.0,
    imports2024: 235.0,
    currentAccount2024: -8.9,
    infraPctGdp2024: 3.4,
    fdiIn2024: 21.0,
    fdiOut2024: 6.0,
    outBricsShare: 0.45,
    publicDemandIndex2024: 50,
    demandFulfilment2024: 66,
    growth: [4.9, 5.0, 5.1, 5.2, 5.0, -2.1, 3.7, 5.3, 5.0, 5.0],
    source: "World Bank WDI 2024; Bank Indonesia/BPS BoP 2024",
  },
  SAUDI_ARABIA: {
    name: "Saudi Arabia",
    gdp2024: 1109.4,
    populationMn2024: 34.0,
    fx2015: 3.75,
    fx2024: 3.75,
    exports2024: 306.0,
    imports2024: 232.0,
    currentAccount2024: 28.0,
    infraPctGdp2024: 7.5,
    fdiIn2024: 12.0,
    fdiOut2024: 25.0,
    outBricsShare: 0.35,
    publicDemandIndex2024: 30,
    demandFulfilment2024: 84,
    growth: [4.1, 1.7, -0.7, 2.4, 0.8, -4.3, 5.1, 8.7, -0.8, 1.3],
    source: "World Bank WDI 2024; GASTAT trade bulletin 2024; Nedopil BRI Report 2024",
  },
  UAE: {
    name: "United Arab Emirates",
    gdp2024: 545.3,
    populationMn2024: 10.7,
    fx2015: 3.67,
    fx2024: 3.67,
    exports2024: 467.4,
    imports2024: 400.4,
    currentAccount2024: 87.0,
    infraPctGdp2024: 5.5,
    fdiIn2024: 30.0,
    fdiOut2024: 25.0,
    outBricsShare: 0.4,
    publicDemandIndex2024: 24,
    demandFulfilment2024: 90,
    growth: [5.1, 3.0, 3.1, 1.3, 1.1, -5.0, 4.4, 3.9, 3.6, 4.0],
    source: "World Bank WDI 2024; CBUAE Balance of Payments 2024-2025",
  },
  EGYPT: {
    name: "Egypt",
    gdp2024: 345.6,
    populationMn2024: 114.0,
    fx2015: 7.7,
    fx2024: 47.8,
    exports2024: 42.0,
    imports2024: 86.0,
    currentAccount2024: -20.8,
    infraPctGdp2024: 4.0,
    fdiIn2024: 15.0,
    fdiOut2024: 1.5,
    outBricsShare: 0.45,
    publicDemandIndex2024: 68,
    demandFulfilment2024: 48,
    growth: [4.4, 4.3, 4.2, 5.3, 5.6, 3.6, 3.3, 6.6, 2.4, 2.4],
    source: "World Bank WDI 2024; CBE Balance of Payments FY2023/24 & FY2024/25; AmCham Egypt 2025",
  },
  IRAN: {
    name: "Iran",
    gdp2024: 434.5,
    populationMn2024: 89.0,
    fx2015: 28000,
    fx2024: 42000,
    exports2024: 55.0,
    imports2024: 60.0,
    currentAccount2024: 16.2,
    infraPctGdp2024: 3.5,
    fdiIn2024: 3.0,
    fdiOut2024: 5.0,
    outBricsShare: 0.6,
    publicDemandIndex2024: 64,
    demandFulfilment2024: 52,
    growth: [-1.9, 13.4, 3.8, -6.0, 3.3, 3.3, 4.7, 3.8, 5.0, 3.5],
    source: "World Bank/IMF estimates 2024; BCB BRICS Bulletin 2025 (current account)",
  },
  ETHIOPIA: {
    name: "Ethiopia",
    gdp2024: 145.6,
    populationMn2024: 128.0,
    fx2015: 21.0,
    fx2024: 118.0,
    exports2024: 4.5,
    imports2024: 17.5,
    currentAccount2024: -4.5,
    infraPctGdp2024: 5.0,
    fdiIn2024: 2.9,
    fdiOut2024: 0.2,
    outBricsShare: 0.5,
    publicDemandIndex2024: 76,
    demandFulfilment2024: 41,
    growth: [10.4, 7.3, 9.4, 6.8, 8.4, 6.1, 6.3, 6.3, 7.2, 7.0],
    source: "World Bank WDI 2024; National Bank of Ethiopia estimates 2024",
  },
};

export const BRICS_COUNTRIES = Object.keys(
  BRICS_COUNTRY_META,
) as BricsCountry[];

export const SEED_YEARS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
const LATEST_YEAR = 2024;

/* =========================================================
   DETERMINISTIC RANDOM HELPERS
   ========================================================= */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(...parts: (string | number)[]): number {
  let h = 2166136261;
  const text = parts.join("|");
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic value in [-spread, +spread]. */
function jitter(seedKey: string, spread: number): number {
  const rand = mulberry32(hashSeed(seedKey));
  return (rand() * 2 - 1) * spread;
}

const round = (value: number, decimals = 3) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

/* =========================================================
   GRAVITY MODEL
   ========================================================= */

/**
 * Pair affinity: trade intensity relative to pure GDP gravity.
 * Values >1 = historically deep ties (energy, adjacency, BRI).
 */
function pairAffinity(a: BricsCountry, b: BricsCountry): number {
  const key = [a, b].sort().join("|");
  const strong: Record<string, number> = {
    ["CHINA|INDIA"]: 1.1,
    ["CHINA|INDONESIA"]: 1.4,
    ["CHINA|RUSSIA"]: 2.0,
    ["CHINA|SAUDI_ARABIA"]: 1.5,
    ["CHINA|UAE"]: 1.4,
    ["CHINA|EGYPT"]: 1.4,
    ["CHINA|IRAN"]: 1.5,
    ["CHINA|ETHIOPIA"]: 1.3,
    ["CHINA|SOUTH_AFRICA"]: 1.2,
    ["INDIA|RUSSIA"]: 1.5,
    ["INDIA|SAUDI_ARABIA"]: 1.6,
    ["INDIA|UAE"]: 1.6,
    ["INDIA|IRAN"]: 1.4,
    ["EGYPT|SAUDI_ARABIA"]: 1.5,
    ["EGYPT|UAE"]: 1.5,
    ["SAUDI_ARABIA|UAE"]: 1.5,
    ["ETHIOPIA|SAUDI_ARABIA"]: 1.3,
    ["ETHIOPIA|UAE"]: 1.3,
    ["ETHIOPIA|EGYPT"]: 1.3,
    ["BRAZIL|RUSSIA"]: 1.1,
    ["BRAZIL|CHINA"]: 1.6,
    ["INDIA|INDONESIA"]: 1.3,
    ["INDONESIA|SAUDI_ARABIA"]: 1.3,
    ["SOUTH_AFRICA|ETHIOPIA"]: 1.2,
    ["IRAN|RUSSIA"]: 1.3,
  };
  return strong[key] ?? 1.0;
}

/**
 * Directional split of a two-way trade total: how much flows a -> b.
 * Based on the ratio of a's export capacity to b's import demand.
 */
function directionalShare(
  a: BricsCountry,
  b: BricsCountry,
  _yearIndex: number,
): number {
  const metaA = BRICS_COUNTRY_META[a];
  const metaB = BRICS_COUNTRY_META[b];
  const expA = metaA.exports2024;
  const impA = metaA.imports2024;
  const expB = metaB.exports2024;
  const impB = metaB.imports2024;
  const num = expA * impB;
  const den = num + expB * impA;
  if (den <= 0) return 0.5;
  return Math.min(0.88, Math.max(0.12, num / den));
}

/* =========================================================
   REAL BILATERAL ANCHORS (two-way goods trade, USD bn)
   ========================================================= */

/** Two-way 2024 totals from customs authorities. */
const BILATERAL_TOTAL_2024: Record<string, number> = {
  "CHINA|RUSSIA": 244.8, // China Customs: 115.5 + 129.3
  "BRAZIL|CHINA": 184.0, // China Customs (Jan-Oct 2024 = 158.3, annualised)
  "CHINA|INDIA": 136.0, // China Customs
  "CHINA|INDONESIA": 130.0, // China Customs estimate
  "CHINA|SAUDI_ARABIA": 107.5, // China Customs estimate
  "CHINA|UAE": 102.0, // China Customs estimate
  "CHINA|SOUTH_AFRICA": 56.0, // China Customs estimate
  "CHINA|EGYPT": 15.0, // China Customs estimate
  "CHINA|IRAN": 15.0, // China Customs estimate
  "CHINA|ETHIOPIA": 4.1, // China Customs estimate
  "INDIA|RUSSIA": 64.0, // India MoC FY2024-25 (crude-led surge)
  "INDIA|UAE": 85.0, // India MoC FY2024-25
  "INDIA|SAUDI_ARABIA": 48.0, // India MoC estimate
  "BRAZIL|INDIA": 15.0, // India MoC estimate
  "INDIA|SOUTH_AFRICA": 12.0, // India MoC estimate
  "BRAZIL|RUSSIA": 13.0, // Secex estimate
  "EGYPT|RUSSIA": 6.0, // CBE estimate
};

/**
 * Directional overrides where the split is published (USD bn).
 * Key must be the alphabetical pair key; values are
 * [first country of key -> second, second -> first].
 */
const BILATERAL_DIRECTION_2024: Record<string, [number, number]> = {
  "CHINA|RUSSIA": [115.5, 129.3], // CN -> RU 115.5, RU -> CN 129.3
  "BRAZIL|CHINA": [118.3, 65.7], // BR -> CN 118.3, CN -> BR 65.7
  "CHINA|INDIA": [113.5, 14.25], // CN -> IN 113.5, IN -> CN 14.25
};

/**
 * India's published BRICS totals for 2024 (Rubix/PIB): volume USD 399bn,
 * imports 304, exports 95. Pair table is scaled to match.
 */
const INDIA_BRICS_TOTAL_2024 = 399;
const INDIA_BRICS_EXPORTS_2024 = 95;

/* =========================================================
   TRADE CATEGORY PROFILES (exporter mix, normalised)
   ========================================================= */

const TRADE_PROFILE: Record<BricsCountry, number[]> = {
  CHINA: [0.05, 0.47, 0.03, 0.03, 0.07, 0.35],
  INDIA: [0.16, 0.2, 0.1, 0.13, 0.14, 0.27],
  RUSSIA: [0.72, 0.1, 0.1, 0.01, 0.02, 0.05],
  BRAZIL: [0.45, 0.12, 0.35, 0.02, 0.02, 0.04],
  SOUTH_AFRICA: [0.5, 0.15, 0.1, 0.03, 0.07, 0.15],
  INDONESIA: [0.4, 0.2, 0.2, 0.03, 0.12, 0.05],
  SAUDI_ARABIA: [0.75, 0.08, 0.05, 0.02, 0.05, 0.05],
  UAE: [0.55, 0.18, 0.08, 0.03, 0.1, 0.06],
  EGYPT: [0.35, 0.15, 0.15, 0.05, 0.25, 0.05],
  IRAN: [0.75, 0.08, 0.1, 0.02, 0.03, 0.02],
  ETHIOPIA: [0.65, 0.05, 0.25, 0.01, 0.03, 0.01],
};

function normalisedProfile(country: BricsCountry): number[] {
  const profile = TRADE_PROFILE[country];
  const total = profile.reduce((sum, v) => sum + v, 0);
  return profile.map((v) => v / total);
}

/* =========================================================
   HISTORICAL SERIES
   ========================================================= */

function gdpSeries(country: BricsCountry): number[] {
  const meta = BRICS_COUNTRY_META[country];
  const series = new Array(SEED_YEARS.length).fill(0) as number[];
  series[SEED_YEARS.length - 1] = meta.gdp2024;
  for (let i = SEED_YEARS.length - 2; i >= 0; i--) {
    const nextGrowth = meta.growth[i + 1] / 100;
    series[i] = series[i + 1] / (1 + nextGrowth);
  }
  return series;
}

function fxSeries(country: BricsCountry): number[] {
  const meta = BRICS_COUNTRY_META[country];
  const steps = SEED_YEARS.length - 1;
  return SEED_YEARS.map((_, i) => {
    const t = i / steps;
    return meta.fx2015 + (meta.fx2024 - meta.fx2015) * t;
  });
}

/* =========================================================
   SEEDERS
   ========================================================= */

async function seedMacroIndicators() {
  const rows: any[] = [];

  for (const country of BRICS_COUNTRIES) {
    const meta = BRICS_COUNTRY_META[country];
    const gdps = gdpSeries(country);
    const fxs = fxSeries(country);

    SEED_YEARS.forEach((year, i) => {
      const isLatest = year === LATEST_YEAR;
      const gdp = gdps[i];
      const ratio = gdp / meta.gdp2024;

      const exports = isLatest
        ? meta.exports2024
        : meta.exports2024 * ratio ** 0.92 * (1 + jitter(`${country}x${year}`, 0.04));
      const imports = isLatest
        ? meta.imports2024
        : meta.imports2024 * ratio ** 0.95 * (1 + jitter(`${country}m${year}`, 0.04));

      const infraPct = isLatest
        ? meta.infraPctGdp2024
        : Math.max(
            1.5,
            meta.infraPctGdp2024 + jitter(`${country}ip${year}`, 0.4),
          );

      rows.push({
        country,
        year,
        gdpUsdBn: round(gdp, 1),
        gdpGrowthPct: round(meta.growth[i], 1),
        populationMn: round(
          meta.populationMn2024 * ratio ** 0.35,
          1,
        ),
        localPerUsd: round(fxs[i], fxs[i] > 1000 ? 0 : 2),
        infraSpendUsdBn: round((gdp * infraPct) / 100, 2),
        infraSpendPctGdp: round(infraPct, 2),
        fdiInflowUsdBn: round(
          isLatest
            ? meta.fdiIn2024
            : meta.fdiIn2024 * ratio ** 0.9 * (1 + jitter(`${country}fi${year}`, 0.15)),
          2,
        ),
        fdiOutflowUsdBn: round(
          isLatest
            ? meta.fdiOut2024
            : meta.fdiOut2024 * ratio ** 0.9 * (1 + jitter(`${country}fo${year}`, 0.15)),
          2,
        ),
        tradeExportsUsdBn: round(exports, 2),
        tradeImportsUsdBn: round(imports, 2),
        tradeBalanceUsdBn: round(exports - imports, 2),
        currentAccountUsdBn: isLatest
          ? meta.currentAccount2024
          : round(
              (exports - imports) * 0.35 * (1 + jitter(`${country}ca${year}`, 0.3)),
              2,
            ),
        surplusInfraAllocationPct: round(
          15 + jitter(`${country}sa${year}`, 5),
          1,
        ),
        // Demand pressure rises over the decade; fulfilment improves.
        publicDemandIndex: Math.min(
          100,
          Math.max(
            0,
            meta.publicDemandIndex2024 - (LATEST_YEAR - year) * 0.8,
          ),
        ),
        demandFulfilmentPct: Math.min(
          99,
          Math.max(
            5,
            meta.demandFulfilment2024 - (LATEST_YEAR - year) * 1.2,
          ),
        ),
        source: meta.source,
        notes: isLatest
          ? "Latest published year; trade/current-account figures from national statistics offices."
          : "Historical series back-cast from published 2024 values using World Bank GDP growth.",
      });
    });
  }

  await prisma.bricsMacroIndicator.createMany({ data: rows, skipDuplicates: true });
  return rows.length;
}

/** Two-way trade total for a pair in 2024 (anchored or gravity-estimated). */
function pairTotal2024(a: BricsCountry, b: BricsCountry): number {
  const key = [a, b].sort().join("|");
  const anchored = BILATERAL_TOTAL_2024[key];
  if (anchored !== undefined) return anchored;

  const metaA = BRICS_COUNTRY_META[a];
  const metaB = BRICS_COUNTRY_META[b];
  const affinity = pairAffinity(a, b);
  // Gravity: sqrt(GDP_a x GDP_b) scaled so unanchored pairs land in the
  // same order of magnitude as published pairs (calibrated so a
  // medium pair such as BRAZIL|SOUTH_AFRICA ~ USD 9bn).
  const gravity =
    Math.sqrt(metaA.gdp2024 * metaB.gdp2024) * 0.0096 * affinity;
  return Math.max(0.4, gravity);
}

async function seedTradeFlows() {
  const rows: any[] = [];

  for (const exporter of BRICS_COUNTRIES) {
    const profile = normalisedProfile(exporter);

    for (const importer of BRICS_COUNTRIES) {
      if (exporter === importer) continue;

      const key = [exporter, importer].sort().join("|");
      const twoWay2024 = pairTotal2024(exporter, importer);

      // Direction of the 2024 two-way total.
      let exporterShare2024: number;
      const directionOverride = BILATERAL_DIRECTION_2024[key];
      if (directionOverride) {
        const [first, second] = directionOverride;
        const [a, b] = key.split("|") as [BricsCountry, BricsCountry];
        const total = first + second;
        const exportValue = a === exporter ? first : second;
        exporterShare2024 = exportValue / total;
      } else {
        exporterShare2024 = directionalShare(exporter, importer, 9);
      }

      const exporterMeta = BRICS_COUNTRY_META[exporter];

      SEED_YEARS.forEach((year, i) => {
        // Shrink historical years back from 2024 using the exporter's
        // published growth path (2024 => factor 1, 2015 => factor < 1).
        let growthFactor = 1;
        for (let t = i + 1; t < SEED_YEARS.length; t++) {
          growthFactor /= 1 + exporterMeta.growth[t] / 100;
        }
        const pairYearTotal =
          twoWay2024 * growthFactor * (1 + jitter(`${key}${year}`, 0.06));
        const exporterYearValue = pairYearTotal * exporterShare2024;

        BRICS_TRADE_CATEGORIES.forEach((category, ci) => {
          const value =
            exporterYearValue *
            profile[ci] *
            (1 + jitter(`${key}${year}${category}`, 0.12));

          if (value < 0.02) return;

          rows.push({
            exporter,
            importer,
            year,
            category,
            valueUsdBn: round(value),
            source:
              BILATERAL_TOTAL_2024[key] !== undefined
                ? "Customs authority bilateral statistics 2024, historic years scaled by World Bank GDP growth"
                : "Nexa gravity-model estimate calibrated to World Bank WDI 2024 trade aggregates",
          });
        });
      });
    }
  }

  // Scale India's BRICS rows to the published 2024 totals.
  const indiaTargets = rows.filter(
    (r) =>
      r.year === 2024 &&
      (r.exporter === "INDIA" || r.importer === "INDIA") &&
      r.exporter !== r.importer,
  );
  const indiaExportSum = indiaTargets
    .filter((r) => r.exporter === "INDIA")
    .reduce((s, r) => s + r.valueUsdBn, 0);
  const indiaImportSum = indiaTargets
    .filter((r) => r.importer === "INDIA")
    .reduce((s, r) => s + r.valueUsdBn, 0);

  if (indiaExportSum > 0) {
    const exportScale = INDIA_BRICS_EXPORTS_2024 / indiaExportSum;
    const importTarget = INDIA_BRICS_TOTAL_2024 - INDIA_BRICS_EXPORTS_2024;
    const importScale = indiaImportSum > 0 ? importTarget / indiaImportSum : 1;
    for (const row of rows) {
      if (row.year !== 2024) continue;
      if (row.exporter === "INDIA") row.valueUsdBn = round(row.valueUsdBn * exportScale);
      if (row.importer === "INDIA")
        row.valueUsdBn = round(row.valueUsdBn * importScale);
    }
  }

  await prisma.bricsTradeFlow.createMany({ data: rows, skipDuplicates: true });
  return rows.length;
}

/* =========================================================
   INVESTMENT FLOWS
   ========================================================= */

const SECTOR_INFRA_SHARE: Record<string, number> = {
  TRANSPORT: 95,
  ENERGY: 90,
  DIGITAL: 75,
  WATER_SANITATION: 95,
  HEALTHCARE: 40,
  AGRI_FOOD: 55,
  HOUSING_URBAN: 85,
  EDUCATION: 70,
  MANUFACTURING: 65,
};

const SECTOR_JOBS_PER_BN: Record<string, number> = {
  TRANSPORT: 8,
  ENERGY: 6,
  DIGITAL: 5,
  WATER_SANITATION: 7,
  HEALTHCARE: 4,
  AGRI_FOOD: 9,
  HOUSING_URBAN: 10,
  EDUCATION: 6,
  MANUFACTURING: 12,
};

/** Preferred sectors per investor (first N are used per pair). */
const INVESTOR_SECTOR_PRIORITY: Record<BricsCountry, string[]> = {
  CHINA: ["TRANSPORT", "ENERGY", "DIGITAL", "MANUFACTURING", "WATER_SANITATION"],
  INDIA: ["DIGITAL", "HEALTHCARE", "ENERGY", "AGRI_FOOD", "EDUCATION"],
  RUSSIA: ["ENERGY", "TRANSPORT", "DIGITAL", "HEALTHCARE", "WATER_SANITATION"],
  BRAZIL: ["AGRI_FOOD", "ENERGY", "TRANSPORT", "WATER_SANITATION", "EDUCATION"],
  SOUTH_AFRICA: ["ENERGY", "TRANSPORT", "DIGITAL", "HOUSING_URBAN", "AGRI_FOOD"],
  INDONESIA: ["ENERGY", "TRANSPORT", "AGRI_FOOD", "DIGITAL", "HOUSING_URBAN"],
  SAUDI_ARABIA: ["ENERGY", "TRANSPORT", "HOUSING_URBAN", "DIGITAL", "AGRI_FOOD"],
  UAE: ["DIGITAL", "TRANSPORT", "ENERGY", "HOUSING_URBAN", "HEALTHCARE"],
  EGYPT: ["TRANSPORT", "ENERGY", "HOUSING_URBAN", "AGRI_FOOD", "WATER_SANITATION"],
  IRAN: ["ENERGY", "TRANSPORT", "AGRI_FOOD", "WATER_SANITATION", "HEALTHCARE"],
  ETHIOPIA: ["AGRI_FOOD", "ENERGY", "WATER_SANITATION", "TRANSPORT", "HEALTHCARE"],
};

async function seedInvestmentFlows() {
  const rows: any[] = [];

  /* ---- 1. Bilateral FDI (gravity split of outward FDI stock) ---- */
  for (const investor of BRICS_COUNTRIES) {
    const meta = BRICS_COUNTRY_META[investor];
    const gdps = gdpSeries(investor);

    const recipients = BRICS_COUNTRIES.filter((c) => c !== investor);
    const weights = recipients.map((recipient) => {
      const recipientGdp = BRICS_COUNTRY_META[recipient].gdp2024;
      return (
        Math.sqrt(recipientGdp) *
        pairAffinity(investor, recipient) *
        (1 + jitter(`w${investor}${recipient}`, 0.25))
      );
    });
    const weightTotal = weights.reduce((s, w) => s + w, 0);

    SEED_YEARS.forEach((year, i) => {
      const isLatest = year === LATEST_YEAR;
      const gdpRatio = gdps[i] / meta.gdp2024;
      const outwardTotal =
        (isLatest
          ? meta.fdiOut2024
          : meta.fdiOut2024 * gdpRatio * (1 + jitter(`o${investor}${year}`, 0.12))) *
        meta.outBricsShare;

      recipients.forEach((recipient, ri) => {
        const pairFlow =
          (outwardTotal * weights[ri]) / weightTotal;
        if (pairFlow < 0.01) return;

        const priority = INVESTOR_SECTOR_PRIORITY[investor];
        const sectorCount = 4;
        const sectorShares = [0.4, 0.25, 0.2, 0.15];

        for (let s = 0; s < sectorCount; s++) {
          const sector = priority[s % priority.length];
          const amount = pairFlow * sectorShares[s];
          if (amount < 0.005) continue;

          rows.push({
            investorCountry: investor,
            recipientCountry: recipient,
            year,
            sector,
            instrument: "FDI",
            amountUsdBn: round(amount),
            projectCount: Math.max(1, Math.round(amount * 3)),
            infraSharePct: SECTOR_INFRA_SHARE[sector] ?? 60,
            jobsCreatedK: round(
              amount * (SECTOR_JOBS_PER_BN[sector] ?? 6) *
                (1 + jitter(`j${investor}${recipient}${year}${sector}`, 0.2)),
              1,
            ),
            source:
              "Nexa gravity-model estimate anchored to MOFCOM/UNCTAD outward FDI 2024",
          });
        }
      });
    });
  }

  /* ---- 2. Belt & Road construction / finance (China as investor) ---- */
  const briPartners = BRICS_COUNTRIES.filter((c) => c !== "CHINA");
  const briConstruction2024: Partial<Record<BricsCountry, number>> = {
    SAUDI_ARABIA: 18.9, // Nedopil BRI Investment Report 2024
    UAE: 3.1, // same
    EGYPT: 2.5,
    INDONESIA: 4.5,
    IRAN: 2.0,
    ETHIOPIA: 1.6,
    RUSSIA: 1.2,
    SOUTH_AFRICA: 1.4,
    BRAZIL: 1.0,
    INDIA: 0,
  };

  for (const recipient of briPartners) {
    const anchored = briConstruction2024[recipient];
    const base =
      anchored !== undefined
        ? anchored
        : Math.max(
            0.4,
            Math.sqrt(BRICS_COUNTRY_META[recipient].gdp2024) * 0.012,
          );

    const priority = INVESTOR_SECTOR_PRIORITY.CHINA;

    for (const year of SEED_YEARS) {
      if (year < 2016) continue;
      const ramp = 0.55 + 0.05 * (year - 2016); // BRI ramp-up
      const construction = base * ramp * (1 + jitter(`bri${recipient}${year}`, 0.15));
      const finance = construction * 0.4;

      const splitSectors = [
        priority[(recipient.length + year) % 3],
        priority[(recipient.length + year) % 3 + 1] ?? priority[0],
      ];

      [
        { instrument: "BRI_CONSTRUCTION", amount: construction },
        { instrument: "BRI_FINANCE", amount: finance },
      ].forEach((entry, idx) => {
        const share = 0.65;
        const amount = entry.amount * share;
        if (amount < 0.01) return;
        const sector = splitSectors[idx % splitSectors.length];
        rows.push({
          investorCountry: "CHINA",
          recipientCountry: recipient,
          year,
          sector,
          instrument: entry.instrument,
          amountUsdBn: round(amount),
          projectCount: Math.max(1, Math.round(amount * 2)),
          infraSharePct: SECTOR_INFRA_SHARE[sector] ?? 70,
          jobsCreatedK: round(amount * 7, 1),
          source:
            entry.instrument === "BRI_CONSTRUCTION"
              ? "Nedopil China BRI Investment Report 2024 (Saudi Arabia USD 18.9bn, UAE USD 3.1bn), partners estimated"
              : "Nedopil China BRI Investment Report 2024 (BRI finance USD 121.8bn total), BRICS share estimated",
        });

        const secondSector = splitSectors[(idx + 1) % splitSectors.length];
        const secondAmount = entry.amount * 0.35;
        if (secondAmount >= 0.01) {
          rows.push({
            investorCountry: "CHINA",
            recipientCountry: recipient,
            year,
            sector: secondSector,
            instrument: entry.instrument,
            amountUsdBn: round(secondAmount),
            projectCount: Math.max(1, Math.round(secondAmount * 2)),
            infraSharePct: SECTOR_INFRA_SHARE[secondSector] ?? 70,
            jobsCreatedK: round(secondAmount * 7, 1),
            source: "Nedopil China BRI Investment Report 2024 (estimated BRICS allocation)",
          });
        }
      });
    }
  }

  /* ---- 3. South-South official development assistance ---- */
  const odaPairs: Array<[BricsCountry, BricsCountry]> = [
    ["INDIA", "SOUTH_AFRICA"],
    ["INDIA", "ETHIOPIA"],
    ["INDIA", "EGYPT"],
    ["INDIA", "INDONESIA"],
    ["RUSSIA", "INDIA"],
    ["RUSSIA", "IRAN"],
    ["RUSSIA", "ETHIOPIA"],
    ["BRAZIL", "ETHIOPIA"],
    ["BRAZIL", "EGYPT"],
    ["CHINA", "ETHIOPIA"],
    ["CHINA", "EGYPT"],
    ["SAUDI_ARABIA", "EGYPT"],
    ["SAUDI_ARABIA", "ETHIOPIA"],
    ["UAE", "EGYPT"],
    ["UAE", "ETHIOPIA"],
    ["SOUTH_AFRICA", "ETHIOPIA"],
    ["INDONESIA", "ETHIOPIA"],
  ];

  for (const [investor, recipient] of odaPairs) {
    const base =
      Math.sqrt(BRICS_COUNTRY_META[investor].gdp2024) * 0.0004 *
      pairAffinity(investor, recipient);
    const sectors = ["AGRI_FOOD", "HEALTHCARE"];

    for (const year of SEED_YEARS) {
      if (year < 2016) continue;
      sectors.forEach((sector, si) => {
        const amount =
          base * (1 + si * 0.4) * (1 + jitter(`oda${investor}${recipient}${year}${sector}`, 0.3));
        if (amount < 0.005) return;
        rows.push({
          investorCountry: investor,
          recipientCountry: recipient,
          year,
          sector,
          instrument: "OFFICIAL_DEVELOPMENT",
          amountUsdBn: round(amount),
          projectCount: Math.max(1, Math.round(amount * 4)),
          infraSharePct: SECTOR_INFRA_SHARE[sector] ?? 60,
          jobsCreatedK: round(amount * 6, 1),
          source: "Nexa estimate from published ODA commitments (South-South cooperation)",
        });
      });
    }
  }

  await prisma.bricsInvestmentFlow.createMany({
    data: rows,
    skipDuplicates: true,
  });
  return rows.length;
}

/* =========================================================
   PUBLIC ENTRY POINT
   ========================================================= */

/**
 * Wipe + rebuild the BRICS macro / investment / trade dataset.
 * Deterministic: running it twice produces identical rows.
 */
export async function seedBricsDataset() {
  console.log("[BRICS Dataset] Building macro, investment and trade tables...");

  await prisma.bricsTradeFlow.deleteMany();
  await prisma.bricsInvestmentFlow.deleteMany();
  await prisma.bricsMacroIndicator.deleteMany();

  const macroRows = await seedMacroIndicators();
  console.log(`[BRICS Dataset] ✓ ${macroRows} macro indicators (11 countries x 10 years)`);

  const tradeRows = await seedTradeFlows();
  console.log(`[BRICS Dataset] ✓ ${tradeRows} bilateral trade flows`);

  const investmentRows = await seedInvestmentFlows();
  console.log(
    `[BRICS Dataset] ✓ ${investmentRows} investment flows (FDI / BRI / ODA)`,
  );
  console.log(
    `[BRICS Dataset] ✅ Total rows: ${macroRows + tradeRows + investmentRows}`,
  );

  return { macroRows, tradeRows, investmentRows };
}
