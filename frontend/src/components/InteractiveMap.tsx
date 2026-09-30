"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import {
  AlertTriangle,
  ChevronRight,
  Filter,
  Flame,
  Layers,
  Map as MapIcon,
  MapPin,
  Search,
  Users,
  X,
} from "lucide-react";

import type {
  DistrictDemographic,
  HotspotItem,
  SectorCategory,
} from "../types";
import { formatCr, toBricsEnum } from "../utils/country";

interface InteractiveMapProps {
  districts: DistrictDemographic[];
  hotspots: HotspotItem[];
  onSelectDistrict: (district: DistrictDemographic) => void;
  /** ISO-2 country code ("IN", "BR", ... "ALL"). */
  selectedCountry?: string;
}

const SECTORS: {
  id: SectorCategory | "ALL";
  label: string;
}[] = [
  { id: "ALL", label: "All Sectors" },
  { id: "WATER_SUPPLY", label: "Water Supply" },
  { id: "RURAL_ROADS", label: "Rural Roads" },
  { id: "POWER_GRID", label: "Power Grid" },
  { id: "HEALTHCARE", label: "Healthcare" },
  { id: "SANITATION", label: "Sanitation" },
  { id: "FLOOD_DRAINAGE", label: "Flood & Drainage" },
];

/** Map viewport per country so changing the country recenters the map. */
const COUNTRY_VIEW: Record<string, { center: [number, number]; zoom: number }> = {
  ALL: { center: [20, 10], zoom: 2 },
  IN: { center: [22.5, 79.5], zoom: 5 },
  BR: { center: [-12.5, -52.5], zoom: 4 },
  RU: { center: [60, 90], zoom: 3 },
  CN: { center: [35.5, 104], zoom: 4 },
  ZA: { center: [-29.5, 25], zoom: 5 },
  EG: { center: [26.8, 30.8], zoom: 6 },
  ET: { center: [9.1, 40.5], zoom: 6 },
  IR: { center: [32.5, 53.5], zoom: 5 },
  SA: { center: [24, 45], zoom: 5 },
  AE: { center: [24.4, 54.4], zoom: 7 },
  ID: { center: [-2.5, 118], zoom: 5 },
};

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  districts,
  hotspots,
  onSelectDistrict,
  selectedCountry,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [selectedSector, setSelectedSector] = useState<SectorCategory | "ALL">(
    "ALL",
  );

  const [selectedDistrict, setSelectedDistrict] =
    useState<DistrictDemographic | null>(null);

  const [search, setSearch] = useState("");

  /*
   * -------------------------------------------------------
   * Filter districts
   * -------------------------------------------------------
   */

  const filteredDistricts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const countryFilter = toBricsEnum(selectedCountry);

    return districts.filter((district) => {
      const districtCountry = district.bricsCountry ?? district.country;
      const countryMatch =
        !countryFilter || districtCountry === countryFilter;
      const sectorMatch =
        selectedSector === "ALL" || district.topGapSector === selectedSector;

      const searchMatch =
        !query ||
        district.district.toLowerCase().includes(query) ||
        district.state.toLowerCase().includes(query) ||
        district.district.toLowerCase().includes(query);

      return countryMatch && sectorMatch && searchMatch;
    });
  }, [districts, selectedSector, search, selectedCountry]);

  /*
   * -------------------------------------------------------
   * Risk helpers
   * -------------------------------------------------------
   */

  const getRisk = (district: DistrictDemographic) => {
    if (
      district.vulnerabilityIndex >= 80 ||
      district.totalComplaintsCount >= 4
    ) {
      return {
        label: "Critical",
        color: "#e11d48",
        fill: "#f43f5e",
        bg: "bg-rose-50",
        text: "text-rose-700",
        border: "border-rose-200",
        radius: 13,
      };
    }

    if (
      district.vulnerabilityIndex >= 60 ||
      district.totalComplaintsCount >= 2
    ) {
      return {
        label: "Moderate",
        color: "#d97706",
        fill: "#f59e0b",
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
        radius: 10,
      };
    }

    return {
      label: "Stable",
      color: "#059669",
      fill: "#10b981",
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      radius: 8,
    };
  };

  const stats = useMemo(() => {
    const critical = filteredDistricts.filter(
      (d) => d.vulnerabilityIndex >= 80 || d.totalComplaintsCount >= 4,
    ).length;

    const moderate = filteredDistricts.filter(
      (d) =>
        (d.vulnerabilityIndex >= 60 && d.vulnerabilityIndex < 80) ||
        (d.totalComplaintsCount >= 2 && d.totalComplaintsCount < 4),
    ).length;

    const stable = Math.max(filteredDistricts.length - critical - moderate, 0);

    return {
      total: filteredDistricts.length,
      critical,
      moderate,
      stable,
    };
  }, [filteredDistricts]);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [23.5, 82],
      zoom: 5,
      zoomControl: false,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);

    L.control
      .zoom({
        position: "bottomright",
      })
      .addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      markersLayerRef.current = null;
    };
  }, []);

  /*
   * -------------------------------------------------------
   * Render markers
   * -------------------------------------------------------
   */

  useEffect(() => {
    const map = mapInstanceRef.current;
    const markerLayer = markersLayerRef.current;

    if (!map || !markerLayer) return;

    markerLayer.clearLayers();

    const validDistricts = filteredDistricts.filter(
      (district) =>
        district.coordinates &&
        typeof district.coordinates.lat === "number" &&
        typeof district.coordinates.lng === "number",
    );

    validDistricts.forEach((district) => {
      const risk = getRisk(district);

      const marker = L.circleMarker(
        [district.coordinates.lat, district.coordinates.lng],
        {
          radius: risk.radius,
          color: "#ffffff",
          fillColor: risk.fill,
          fillOpacity: 0.9,
          weight: 3,
        },
      );

      /*
       * Popup
       */
      const popup = `
        <div style="
          width:260px;
          font-family:Inter,ui-sans-serif,system-ui,sans-serif;
          padding:4px;
        ">
          <div style="
            display:flex;
            justify-content:space-between;
            align-items:flex-start;
            gap:12px;
            margin-bottom:10px;
          ">
            <div>
              <div style="
                font-size:14px;
                font-weight:800;
                color:#0f172a;
              ">
                ${district.district}
              </div>

              <div style="
                font-size:11px;
                color:#64748b;
                margin-top:2px;
              ">
                ${district.state}
              </div>
            </div>

            <span style="
              background:${risk.color}15;
              color:${risk.color};
              border:1px solid ${risk.color}30;
              border-radius:999px;
              padding:3px 8px;
              font-size:9px;
              font-weight:800;
              text-transform:uppercase;
            ">
              ${risk.label}
            </span>
          </div>

          <div style="
            background:#f8fafc;
            border:1px solid #e2e8f0;
            border-radius:10px;
            padding:10px;
            margin-bottom:10px;
          ">
            <div style="
              display:flex;
              justify-content:space-between;
              margin-bottom:7px;
              font-size:10px;
            ">
              <span style="color:#64748b">
                Vulnerability
              </span>

              <strong style="color:${risk.color}">
                ${district.vulnerabilityIndex}/100
              </strong>
            </div>

            <div style="
              height:5px;
              background:#e2e8f0;
              border-radius:999px;
              overflow:hidden;
            ">
              <div style="
                width:${Math.min(district.vulnerabilityIndex, 100)}%;
                height:100%;
                background:${risk.fill};
                border-radius:999px;
              "></div>
            </div>
          </div>

          <div style="
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:6px;
            margin-bottom:10px;
          ">
            <div style="
              background:#f8fafc;
              border-radius:8px;
              padding:8px;
            ">
              <div style="
                font-size:9px;
                color:#94a3b8;
              ">
                Grievances
              </div>

              <div style="
                font-size:14px;
                font-weight:800;
                color:#0f172a;
              ">
                ${district.totalComplaintsCount}
              </div>
            </div>

            <div style="
              background:#f8fafc;
              border-radius:8px;
              padding:8px;
            ">
              <div style="
                font-size:9px;
                color:#94a3b8;
              ">
                Budget
              </div>

              <div style="
                font-size:14px;
                font-weight:800;
                color:#0f172a;
              ">
                ${formatCr(district.sanctionedBudgetInCr, selectedCountry)}
              </div>
            </div>
          </div>

          <div style="
            font-size:10px;
            color:#64748b;
            border-top:1px solid #e2e8f0;
            padding-top:8px;
          ">
            Population:
            <strong style="color:#334155">
              ${(district.population / 100000).toFixed(1)} Lakh
            </strong>
            · ${district.ruralPercentage}% Rural
          </div>
        </div>
      `;

      marker.bindPopup(popup, {
        closeButton: true,
        maxWidth: 300,
      });

      marker.bindTooltip(
        `<strong>${district.district}</strong><br/>${risk.label} · ${district.vulnerabilityIndex}/100`,
        {
          direction: "top",
          offset: [0, -8],
        },
      );

      marker.on("click", () => {
        setSelectedDistrict(district);
        onSelectDistrict(district);
      });

      markerLayer.addLayer(marker);
    });

    /*
     * Fit map to filtered districts, otherwise center on the selected country
     * so changing the country always moves the map.
     */
    if (validDistricts.length > 0) {
      const bounds = L.latLngBounds(
        validDistricts.map((d) => [d.coordinates.lat, d.coordinates.lng]),
      );

      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 7,
        animate: true,
      });
    } else {
      const view = COUNTRY_VIEW[(selectedCountry || "ALL").toUpperCase()] ?? COUNTRY_VIEW.ALL;
      map.flyTo(view.center, view.zoom, { duration: 0.8 });
    }
  }, [filteredDistricts, onSelectDistrict, selectedCountry]);

  /*
   * -------------------------------------------------------
   * Recenter when the selected country changes
   * -------------------------------------------------------
   * Runs immediately on country change so the map moves even before
   * the new district payload arrives; the marker effect above then
   * refines with fitBounds when data exists.
   */
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const view =
      COUNTRY_VIEW[(selectedCountry || "ALL").toUpperCase()] ?? COUNTRY_VIEW.ALL;
    map.flyTo(view.center, view.zoom, { duration: 0.9 });
  }, [selectedCountry]);

  /*
   * -------------------------------------------------------
   * Focus district
   * -------------------------------------------------------
   */

  const focusDistrict = (district: DistrictDemographic) => {
    setSelectedDistrict(district);
    onSelectDistrict(district);

    const map = mapInstanceRef.current;

    if (!map || !district.coordinates) return;

    map.flyTo([district.coordinates.lat, district.coordinates.lng], 8, {
      duration: 0.8,
    });
  };

  /*
   * -------------------------------------------------------
   * Hotspot -> corresponding district
   * -------------------------------------------------------
   */

  const hotspotDistricts = useMemo(() => {
    return hotspots
      .map((hotspot) => districts.find(
        (district) =>
          district.district.toLowerCase() === hotspot.district.toLowerCase(),
      ))
      .filter((district): district is DistrictDemographic => Boolean(district));
  }, [hotspots, districts]);

  return (
    <div className="space-y-4">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 border border-blue-100">
              <MapIcon className="h-4 w-4 text-blue-600" />
            </div>

            <h2 className="text-base font-bold tracking-tight text-slate-900">
              Geographic Risk Intelligence
            </h2>
          </div>

          <p className="mt-1 text-xs text-slate-500">
            Explore district-level vulnerability, grievances and infrastructure
            gaps.
          </p>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Live district dataset
        </div>
      </div>

      {/* =====================================================
          FILTER BAR
      ====================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 p-3 md:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Sector filter */}
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <Filter className="h-3.5 w-3.5 text-slate-600" />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Sector
                </p>

                <p className="text-xs font-semibold text-slate-700">
                  Filter map
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="relative w-full lg:w-64">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search district or state..."
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-8 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Sector pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {SECTORS.map((sector) => {
              const active = selectedSector === sector.id;

              return (
                <button
                  key={sector.id}
                  type="button"
                  onClick={() =>
                    setSelectedSector(sector.id as SectorCategory | "ALL")
                  }
                  className={[
                    "shrink-0 rounded-lg border px-3 py-1.5 text-[10px] font-semibold transition-all",
                    active
                      ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-900",
                  ].join(" ")}
                >
                  {sector.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 border-t border-slate-100 sm:grid-cols-4">
          <div className="border-r border-slate-100 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Districts
              </span>
              <Layers className="h-3.5 w-3.5 text-slate-400" />
            </div>

            <p className="mt-1 text-lg font-black text-slate-900">
              {stats.total}
            </p>
          </div>

          <div className="border-r border-slate-100 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-wider text-rose-500">
                Critical
              </span>
              <Flame className="h-3.5 w-3.5 text-rose-500" />
            </div>

            <p className="mt-1 text-lg font-black text-rose-600">
              {stats.critical}
            </p>
          </div>

          <div className="border-r border-slate-100 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-500">
                Moderate
              </span>

              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            </div>

            <p className="mt-1 text-lg font-black text-amber-600">
              {stats.moderate}
            </p>
          </div>

          <div className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-500">
                Stable
              </span>

              <MapPin className="h-3.5 w-3.5 text-emerald-500" />
            </div>

            <p className="mt-1 text-lg font-black text-emerald-600">
              {stats.stable}
            </p>
          </div>
        </div>
      </div>

      {/* =====================================================
          MAP + PRIORITY PANEL
      ====================================================== */}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* MAP */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-8">
          {/* Map */}
          <div className="relative h-[560px]">
            <div ref={mapContainerRef} className="absolute inset-0 z-0" />

            {/* Top-right map status */}
            <div className="absolute right-4 top-4 z-[400]">
              <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm">
                <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                  Showing
                </p>

                <p className="text-sm font-black text-slate-900">
                  {filteredDistricts.length}
                  <span className="ml-1 text-[9px] font-medium text-slate-400">
                    districts
                  </span>
                </p>
              </div>
            </div>

            {/* Bottom-left legend */}
            <div className="absolute bottom-4 left-4 z-[400]">
              <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm">
                <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Vulnerability
                </p>

                <div className="flex items-center gap-1">
                  <span className="h-2 w-7 rounded-l-full bg-emerald-500" />
                  <span className="h-2 w-7 bg-amber-500" />
                  <span className="h-2 w-7 rounded-r-full bg-rose-500" />
                </div>

                <div className="mt-1 flex justify-between text-[8px] text-slate-400">
                  <span>Stable</span>
                  <span>Critical</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================
            PRIORITY PANEL
        ==================================================== */}

        <div className="flex min-h-[620px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-4">
          {/* Panel header */}
          <div className="border-b border-slate-100 bg-gradient-to-br from-white to-rose-50/40 p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-100 bg-rose-50">
                  <Flame className="h-4 w-4 text-rose-600" />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Priority Hotspots
                  </h3>

                  <p className="mt-0.5 text-[9px] text-slate-500">
                    Highest-risk locations
                  </p>
                </div>
              </div>

              <span className="rounded-full border border-rose-100 bg-rose-50 px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-rose-600">
                {hotspots.length} Active
              </span>
            </div>
          </div>

          {/* Hotspot list */}
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {hotspots.length === 0 && (
              <div className="flex h-full min-h-[300px] items-center justify-center text-center">
                <div>
                  <MapPin className="mx-auto mb-3 h-8 w-8 text-slate-300" />

                  <p className="text-xs font-bold text-slate-600">
                    No hotspots
                  </p>

                  <p className="mt-1 text-[10px] text-slate-400">
                    No priority locations match the current data.
                  </p>
                </div>
              </div>
            )}

            {hotspots.map((hotspot, index) => {
              const district = hotspotDistricts.find(
                (d) =>
                  d.district.toLowerCase() === hotspot.district.toLowerCase(),
              );

              if (!district) return null;

              const risk = getRisk(district);

              return (
                <button
                  key={hotspot.id}
                  type="button"
                  onClick={() => focusDistrict(district)}
                  className={[
                    "group w-full rounded-xl border bg-white p-3 text-left transition-all",
                    "hover:-translate-y-[1px] hover:border-slate-300 hover:shadow-md",
                    selectedDistrict?.district === district.district
                      ? "border-blue-300 bg-blue-50/30 ring-2 ring-blue-100"
                      : "border-slate-200",
                  ].join(" ")}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <div
                        className={[
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[9px] font-black",
                          index === 0
                            ? "bg-rose-600 text-white"
                            : index === 1
                              ? "bg-orange-500 text-white"
                              : index === 2
                                ? "bg-amber-500 text-white"
                                : "bg-slate-100 text-slate-600",
                        ].join(" ")}
                      >
                        {index + 1}
                      </div>

                      <div className="min-w-0">
                        <h4 className="truncate text-xs font-bold text-slate-900 group-hover:text-blue-700">
                          {hotspot.district}
                        </h4>

                        <p className="mt-0.5 truncate text-[9px] text-slate-500">
                          {hotspot.state} · {hotspot.country}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div
                        className="text-sm font-black"
                        style={{ color: risk.color }}
                      >
                        {hotspot.compositeRiskScore}
                      </div>

                      <div className="text-[8px] text-slate-400">/ 100</div>
                    </div>
                  </div>

                  {/* Risk bar */}
                  <div className="mt-2.5">
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(
                            hotspot.compositeRiskScore,
                            100,
                          )}%`,
                          backgroundColor: risk.fill,
                        }}
                      />
                    </div>
                  </div>

                  {/* Badge */}
                  <div className="mt-2 flex items-center gap-1.5">
                    <span
                      className={[
                        "rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide",
                        risk.bg,
                        risk.text,
                      ].join(" ")}
                    >
                      {risk.label}
                    </span>

                    {hotspot.compositeRiskScore >= 80 && (
                      <AlertTriangle className="h-3 w-3 text-rose-500" />
                    )}
                  </div>

                  {/* Issue */}
                  <p className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-slate-600">
                    {hotspot.keyIssue}
                  </p>

                  {/* Footer */}
                  <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2">
                    <span className="flex items-center gap-1 text-[9px] font-medium text-slate-500">
                      <Users className="h-3 w-3 text-slate-400" />
                      {hotspot.totalComplaints} requests
                    </span>

                    <span className="text-[9px] font-semibold text-rose-600">
                      {hotspot.criticalComplaints} critical
                    </span>

                    <ChevronRight className="h-3 w-3 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-slate-500">
                Click a hotspot to inspect
              </span>

              <span className="flex items-center gap-1 text-[9px] font-semibold text-blue-600">
                Map linked
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
