import type { BricsCountry } from "../types";

export interface CountryInfo {
  code: string;
  enumValue: BricsCountry;
  name: string;
  currencySymbol: string;
  language: string;
}

export const COUNTRIES: CountryInfo[] = [
  { code: "IN", enumValue: "INDIA", name: "India", currencySymbol: "\u20B9", language: "en" },
  { code: "BR", enumValue: "BRAZIL", name: "Brazil", currencySymbol: "R$", language: "pt" },
  { code: "RU", enumValue: "RUSSIA", name: "Russia", currencySymbol: "\u20BD", language: "ru" },
  { code: "CN", enumValue: "CHINA", name: "China", currencySymbol: "\u00A5", language: "zh" },
  { code: "ZA", enumValue: "SOUTH_AFRICA", name: "South Africa", currencySymbol: "R", language: "en" },
  { code: "EG", enumValue: "EGYPT", name: "Egypt", currencySymbol: "E\u00A3", language: "ar" },
  { code: "ET", enumValue: "ETHIOPIA", name: "Ethiopia", currencySymbol: "\u1264", language: "am" },
  { code: "IR", enumValue: "IRAN", name: "Iran", currencySymbol: "\uFDFC", language: "fa" },
  { code: "SA", enumValue: "SAUDI_ARABIA", name: "Saudi Arabia", currencySymbol: "\u0631.\u0633", language: "ar" },
  { code: "AE", enumValue: "UAE", name: "United Arab Emirates", currencySymbol: "\u062F.\u0625", language: "ar" },
  { code: "ID", enumValue: "INDONESIA", name: "Indonesia", currencySymbol: "Rp", language: "id" },
];

const byCode = new Map(COUNTRIES.map((c) => [c.code, c]));

export const getCountryInfo = (code?: string | null): CountryInfo => {
  if (!code) return COUNTRIES[0];
  return byCode.get(code.toUpperCase()) ?? COUNTRIES[0];
};

/** ISO-2 code -> Prisma BricsCountry enum value (undefined = ALL). */
export const toBricsEnum = (code?: string | null): BricsCountry | undefined => {
  if (!code) return undefined;
  const upper = code.toUpperCase();
  if (upper === "ALL") return undefined;
  return byCode.get(upper)?.enumValue;
};

/** Currency symbol for a country code ("IN" -> "₹"). */
export const currencySymbol = (code?: string | null): string =>
  getCountryInfo(code).currencySymbol;

/** Display name for a country code ("IN" -> "India"). */
export const countryName = (code?: string | null): string =>
  getCountryInfo(code).name;

/** UI language for a country code ("BR" -> "pt"). */
export const countryLanguage = (code?: string | null): string =>
  getCountryInfo(code).language;

/** Format a Crore value with the country's currency symbol. */
export const formatCr = (value: number | undefined, code?: string | null): string =>
  `${currencySymbol(code)}${(value ?? 0).toLocaleString("en-US", {
    maximumFractionDigits: 1,
  })} Cr`;
