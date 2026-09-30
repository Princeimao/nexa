/**
 * =========================================================
 * BRICS COUNTRY RESOLUTION
 * =========================================================
 * The frontend selects countries by ISO-2 code (IN, BR, RU ...).
 * The database stores country data in three shapes:
 *   - BricsCountry enum columns (Grievance.country, DistrictDemographic.bricsCountry)
 *   - Display name strings (GovernmentProject.country, PolicyGapInsight.country: "India")
 *   - Nothing ("ALL" = every BRICS nation)
 *
 * This module converts any of those inputs into the value each
 * query layer actually needs.
 * =========================================================
 */

import type { BricsCountry, BricsLanguage } from "@prisma/client";

export interface BricsCountryInfo {
  code: string;
  enumValue: BricsCountry;
  name: string;
  currency: string;
  currencySymbol: string;
  language: string;
}

export const BRICS_COUNTRIES: BricsCountryInfo[] = [
  { code: "IN", enumValue: "INDIA", name: "India", currency: "INR", currencySymbol: "\u20B9", language: "en" },
  { code: "BR", enumValue: "BRAZIL", name: "Brazil", currency: "BRL", currencySymbol: "R$", language: "pt" },
  { code: "RU", enumValue: "RUSSIA", name: "Russia", currency: "RUB", currencySymbol: "\u20BD", language: "ru" },
  { code: "CN", enumValue: "CHINA", name: "China", currency: "CNY", currencySymbol: "\u00A5", language: "zh" },
  { code: "ZA", enumValue: "SOUTH_AFRICA", name: "South Africa", currency: "ZAR", currencySymbol: "R", language: "en" },
  { code: "EG", enumValue: "EGYPT", name: "Egypt", currency: "EGP", currencySymbol: "E\u00A3", language: "ar" },
  { code: "ET", enumValue: "ETHIOPIA", name: "Ethiopia", currency: "ETB", currencySymbol: "\u1264", language: "am" },
  { code: "IR", enumValue: "IRAN", name: "Iran", currency: "IRR", currencySymbol: "\uFDFC", language: "fa" },
  { code: "SA", enumValue: "SAUDI_ARABIA", name: "Saudi Arabia", currency: "SAR", currencySymbol: "\u0631.\u0633", language: "ar" },
  { code: "AE", enumValue: "UAE", name: "United Arab Emirates", currency: "AED", currencySymbol: "\u062F.\u0625", language: "ar" },
  { code: "ID", enumValue: "INDONESIA", name: "Indonesia", currency: "IDR", currencySymbol: "Rp", language: "id" },
];

const ALIASES: Record<string, string> = {};
for (const c of BRICS_COUNTRIES) {
  ALIASES[c.code.toUpperCase()] = c.enumValue;
  ALIASES[c.enumValue] = c.enumValue;
  ALIASES[c.name.toUpperCase()] = c.enumValue;
}
ALIASES["SOUTH AFRICA"] = "SOUTH_AFRICA";
ALIASES["SAUDI ARABIA"] = "SAUDI_ARABIA";
ALIASES["UNITED ARAB EMIRATES"] = "UAE";
ALIASES["UAE"] = "UAE";
ALIASES["ALL"] = "";
ALIASES["ALL BRICS"] = "";

/**
 * Resolve any country input (ISO-2 code, enum value, display name,
 * "ALL", empty, undefined) into the BricsCountry enum value —
 * or undefined when the query should cover every country.
 */
export function resolveBricsCountry(
  input?: string | null,
): BricsCountry | undefined {
  if (!input) return undefined;
  const key = input.trim().toUpperCase();
  if (!key || key === "ALL" || key === "ALL BRICS") return undefined;
  const mapped = ALIASES[key];
  return mapped === "" || !mapped ? undefined : (mapped as BricsCountry);
}

/**
 * Resolve any country input into the human readable country name
 * stored on String columns ("India", "South Africa" ...).
 */
export function resolveCountryName(input?: string | null): string | undefined {
  const enumValue = resolveBricsCountry(input);
  if (!enumValue) return undefined;
  return BRICS_COUNTRIES.find((c) => c.enumValue === enumValue)?.name;
}

/**
 * Resolve any country input into the ISO-2 code used by the frontend.
 */
export function resolveCountryCode(input?: string | null): string | undefined {
  const enumValue = resolveBricsCountry(input);
  if (!enumValue) return undefined;
  return BRICS_COUNTRIES.find((c) => c.enumValue === enumValue)?.code;
}

/**
 * Full metadata for a country (currency, UI language ...).
 * Falls back to India when the input cannot be resolved.
 */
export function getCountryInfo(input?: string | null): BricsCountryInfo {
  const enumValue = resolveBricsCountry(input);
  return (
    BRICS_COUNTRIES.find((c) => c.enumValue === enumValue) ??
    BRICS_COUNTRIES[0]
  );
}

/**
 * Map a BCP-47 / ISO language tag (as stored on Grievance.language)
 * onto the BricsLanguage enum. Defaults to EN.
 */
export function resolveBricsLanguage(lang?: string | null): BricsLanguage {
  if (!lang) return "EN";
  const base = lang.split("-")[0].toLowerCase();
  const map: Record<string, string> = {
    ru: "RU",
    zh: "ZH",
    pt: "PT",
    hi: "HI",
    bn: "BN",
    ta: "TA",
    te: "TE",
    mr: "MR",
    gu: "GU",
    kn: "KN",
    ml: "ML",
    pa: "PA",
    en: "EN",
  };
  return (map[base] ?? "EN") as BricsLanguage;
}
