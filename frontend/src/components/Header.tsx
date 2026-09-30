import { Download, Globe2, Menu } from "lucide-react";
import React from "react";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Separator } from "../components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";

interface HeaderProps {
  selectedCountry: string;
  onSelectCountry: (country: string) => void;

  onOpenSimulator: () => void;
  onResetSeed: () => void;
  onExportBriefing: () => void;

  onToggleSidebar?: () => void;

  lastUpdated?: string;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

const countries = [
  {
    code: "ALL",
    name: "All BRICS",
    flag: "",
    region: "11 member countries",
  },
  {
    code: "IN",
    name: "India",
    flag: "🇮🇳",
    region: "South Asia",
  },
  {
    code: "BR",
    name: "Brazil",
    flag: "🇧🇷",
    region: "South America",
  },
  {
    code: "RU",
    name: "Russia",
    flag: "🇷🇺",
    region: "Eurasia",
  },
  {
    code: "CN",
    name: "China",
    flag: "🇨🇳",
    region: "East Asia",
  },
  {
    code: "ZA",
    name: "South Africa",
    flag: "🇿🇦",
    region: "Southern Africa",
  },
  {
    code: "EG",
    name: "Egypt",
    flag: "🇪🇬",
    region: "North Africa",
  },
  {
    code: "ET",
    name: "Ethiopia",
    flag: "🇪🇹",
    region: "East Africa",
  },
  {
    code: "IR",
    name: "Iran",
    flag: "🇮🇷",
    region: "West Asia",
  },
  {
    code: "SA",
    name: "Saudi Arabia",
    flag: "🇸🇦",
    region: "Middle East",
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    flag: "🇦🇪",
    region: "Middle East",
  },
  {
    code: "ID",
    name: "Indonesia",
    flag: "🇮🇩",
    region: "Southeast Asia",
  },
];

export const Header: React.FC<HeaderProps> = ({
  selectedCountry,
  onSelectCountry,
  onOpenSimulator,
  onResetSeed,
  onExportBriefing,
  onToggleSidebar,
  lastUpdated = "Just now",
  isRefreshing = false,
  onRefresh,
}) => {
  const selected =
    countries.find((country) => country.code === selectedCountry) ??
    countries[0];

  return (
    <TooltipProvider>
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b bg-white/95 px-4 backdrop-blur sm:px-6">
        {/* LEFT */}
        <div className="flex min-w-0 items-center gap-3">
          {onToggleSidebar && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleSidebar}
              className="shrink-0"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}

          <Separator orientation="vertical" className="hidden h-6 sm:block" />

          <div className="hidden min-w-0 sm:block">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Development Intelligence
            </p>

            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-semibold text-slate-900">
                BRICS Policy Command Center
              </h1>

              <Badge
                variant="secondary"
                className="hidden h-5 bg-slate-100 px-1.5 text-[9px] font-semibold text-slate-600 lg:inline-flex"
              >
                DIGITAL PUBLIC GOOD
              </Badge>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Select
            value={selectedCountry}
            onValueChange={(value) => value && onSelectCountry(value)}
          >
            <SelectTrigger className="h-10 p-5 w-40 border-slate-200 bg-white shadow-sm hover:bg-slate-50 sm:w-[230px]">
              <div className="flex min-w-0 items-center gap-2">
                <Globe2 className="h-4 w-4 shrink-0 text-slate-500" />

                <SelectValue>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-base">{selected.flag}</span>

                    <span className="truncate text-xs font-semibold">
                      {selected.name}
                    </span>
                  </div>
                </SelectValue>
              </div>
            </SelectTrigger>

            <SelectContent className="w-[280px] p-2">
              {countries.map((country) => (
                <SelectItem
                  key={country.code}
                  value={country.code}
                  className="py-2.5"
                >
                  <div className="flex w-full items-center gap-3">
                    <span className="text-lg">{country.flag}</span>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-xs font-medium">
                        {country.name}
                      </span>

                      <span className="text-[10px] text-muted-foreground">
                        {country.region}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Separator
            orientation="vertical"
            className="mt-2.5 hidden h-6 sm:block"
          />

          {/* AI */}
          <Button
            variant="default"
            size="sm"
            onClick={onOpenSimulator}
            className="hidden gap-1.5 border-slate-200 px-10 sm:flex py-5"
          >
            Policy AI
          </Button>

          {/* Export */}
          <Tooltip>
            {/* @ts-ignore */}
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onExportBriefing}>
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>

            <TooltipContent>Export policy briefing</TooltipContent>
          </Tooltip>
        </div>
      </header>
    </TooltipProvider>
  );
};
