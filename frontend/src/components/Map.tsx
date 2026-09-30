"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Flame,
  Users,
  ChevronRight,
  MapPin,
  AlertTriangle,
  Activity,
} from "lucide-react";

type Hotspot = {
  id: string | number;
  district: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  compositeRiskScore: number;
  keyIssue: string;
  totalComplaints: number;
  criticalComplaints: number;
};

type District = {
  district: string;
  state: string;
  country: string;
  latitude?: number;
  longitude?: number;
  [key: string]: any;
};

type Props = {
  hotspots: Hotspot[];
  districts: District[];
  onSelectDistrict: (district: District) => void;
};

export default function HotspotMap({
  hotspots,
  districts,
  onSelectDistrict,
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  /*
   * ---------------------------------------------------------
   * Risk helpers
   * ---------------------------------------------------------
   */

  const getRiskColor = (score: number) => {
    if (score >= 80) return "#e11d48"; // Critical
    if (score >= 60) return "#f97316"; // High
    if (score >= 40) return "#eab308"; // Medium
    return "#22c55e"; // Low
  };

  const getRiskLabel = (score: number) => {
    if (score >= 80) return "Critical";
    if (score >= 60) return "High";
    if (score >= 40) return "Moderate";
    return "Low";
  };

  /*
   * ---------------------------------------------------------
   * Initialize Leaflet
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView([20.5937, 78.9629], 5);

    /*
     * OpenStreetMap
     */
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);

    /*
     * Custom zoom control
     */
    L.control
      .zoom({
        position: "bottomright",
      })
      .addTo(map);

    /*
     * Layer group for hotspot markers
     */
    const markerLayer = L.layerGroup().addTo(map);

    mapRef.current = map;
    markersRef.current = markerLayer;

    /*
     * Small delay helps Leaflet calculate dimensions
     * correctly inside responsive containers.
     */
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      markerLayer.clearLayers();
      map.remove();

      mapRef.current = null;
      markersRef.current = null;
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * Add / update hotspot markers
   * ---------------------------------------------------------
   */

  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markersRef.current;

    if (!map || !markerLayer) return;

    markerLayer.clearLayers();

    const validHotspots = hotspots.filter(
      (h) =>
        typeof h.latitude === "number" &&
        typeof h.longitude === "number" &&
        !Number.isNaN(h.latitude) &&
        !Number.isNaN(h.longitude),
    );

    const bounds: L.LatLngExpression[] = [];

    validHotspots.forEach((h, index) => {
      const color = getRiskColor(h.compositeRiskScore);
      const riskLabel = getRiskLabel(h.compositeRiskScore);

      bounds.push([h.latitude, h.longitude]);

      /*
       * Outer circle
       */
      const marker = L.circleMarker([h.latitude, h.longitude], {
        radius: 10,
        color: "#ffffff",
        weight: 3,
        fillColor: color,
        fillOpacity: 0.95,
      });

      marker.addTo(markerLayer);

      /*
       * Popup
       */
      marker.bindPopup(`
        <div style="
          width: 240px;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
          padding: 4px;
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
                font-weight:700;
                color:#0f172a;
                margin-bottom:2px;
              ">
                ${h.district}
              </div>

              <div style="
                font-size:11px;
                color:#64748b;
              ">
                ${h.state}, ${h.country}
              </div>
            </div>

            <div style="
              background:${color}18;
              color:${color};
              border:1px solid ${color}35;
              padding:3px 7px;
              border-radius:999px;
              font-size:10px;
              font-weight:700;
            ">
              ${riskLabel}
            </div>
          </div>

          <div style="
            background:#f8fafc;
            border:1px solid #e2e8f0;
            border-radius:8px;
            padding:10px;
            margin-bottom:10px;
          ">
            <div style="
              font-size:10px;
              color:#64748b;
              margin-bottom:3px;
            ">
              Composite Risk Score
            </div>

            <div style="
              font-size:20px;
              font-weight:800;
              color:${color};
            ">
              ${h.compositeRiskScore}
              <span style="
                font-size:11px;
                color:#94a3b8;
                font-weight:500;
              ">
                / 100
              </span>
            </div>
          </div>

          <div style="
            font-size:11px;
            line-height:1.5;
            color:#475569;
            margin-bottom:10px;
          ">
            ${h.keyIssue}
          </div>

          <div style="
            display:flex;
            justify-content:space-between;
            border-top:1px solid #e2e8f0;
            padding-top:8px;
            font-size:10px;
            color:#64748b;
          ">
            <span>
              ${h.totalComplaints} requests
            </span>

            <span style="
              color:#e11d48;
              font-weight:700;
            ">
              ${h.criticalComplaints} critical
            </span>
          </div>
        </div>
      `);

      /*
       * Clicking marker selects district
       */
      marker.on("click", () => {
        const fullDistrict = districts.find(
          (d) => d.district.toLowerCase() === h.district.toLowerCase(),
        );

        if (fullDistrict) {
          onSelectDistrict(fullDistrict);
        }
      });

      /*
       * Slight pulse effect for top 3 hotspots
       */
      if (index < 3) {
        const pulse = L.circle([h.latitude, h.longitude], {
          radius: 15000,
          color,
          weight: 1,
          opacity: 0.15,
          fillColor: color,
          fillOpacity: 0.04,
          interactive: false,
        });

        pulse.addTo(markerLayer);
      }
    });

    /*
     * Automatically fit map around hotspots
     */
    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), {
        padding: [50, 50],
        maxZoom: 8,
      });
    }
  }, [hotspots, districts, onSelectDistrict]);

  /*
   * ---------------------------------------------------------
   * Panel -> Map interaction
   * ---------------------------------------------------------
   */

  const focusHotspot = (hotspot: Hotspot) => {
    const map = mapRef.current;

    if (!map) return;

    map.flyTo([hotspot.latitude, hotspot.longitude], 9, {
      duration: 0.8,
    });

    /*
     * Find the marker and open its popup
     */
    setTimeout(() => {
      markersRef.current?.eachLayer((layer: any) => {
        if (
          layer instanceof L.CircleMarker &&
          layer.getLatLng().lat === hotspot.latitude &&
          layer.getLatLng().lng === hotspot.longitude
        ) {
          layer.openPopup();
        }
      });
    }, 850);

    const fullDistrict = districts.find(
      (d) => d.district.toLowerCase() === hotspot.district.toLowerCase(),
    );

    if (fullDistrict) {
      onSelectDistrict(fullDistrict);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
      {/* =====================================================
          MAP
      ====================================================== */}

      <div className="xl:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Map Header */}
        <div className="h-[62px] px-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-blue-600" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Geographic Risk Map
              </h3>

              <p className="text-[10px] text-slate-500 mt-0.5">
                Live hotspot distribution
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Critical
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              High
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              Moderate
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="relative h-[523px]">
          <div ref={mapContainerRef} className="absolute inset-0 z-0" />

          {/* Map Overlay */}
          <div className="absolute left-4 bottom-4 z-[500]">
            <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg px-3 py-2.5">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-3.5 h-3.5 text-blue-600" />

                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  Risk intensity
                </span>
              </div>

              <div className="flex items-center gap-1">
                <span className="w-8 h-2 rounded-l-full bg-green-500" />
                <span className="w-8 h-2 bg-yellow-500" />
                <span className="w-8 h-2 bg-orange-500" />
                <span className="w-8 h-2 rounded-r-full bg-rose-600" />
              </div>

              <div className="flex justify-between mt-1 text-[8px] text-slate-400">
                <span>Low</span>
                <span>Critical</span>
              </div>
            </div>
          </div>

          {/* Hotspot count */}
          <div className="absolute top-4 right-4 z-[500]">
            <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-md px-3 py-2">
              <div className="text-[9px] uppercase tracking-wider font-bold text-slate-400">
                Active hotspots
              </div>

              <div className="text-lg font-black text-slate-900 leading-tight">
                {hotspots.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          HOTSPOT RANKING
      ====================================================== */}

      <div className="xl:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-4 border-b border-slate-100 bg-gradient-to-br from-white to-rose-50/40">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                <Flame className="w-4 h-4 text-rose-600" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Priority Hotspots
                </h3>

                <p className="text-[10px] text-slate-500 mt-0.5">
                  Ranked by composite risk
                </p>
              </div>
            </div>

            <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-2 py-1 rounded-full border border-rose-100">
              LIVE
            </span>
          </div>
        </div>

        {/* List */}
        <div className="p-3 space-y-2.5 overflow-y-auto flex-1">
          {hotspots.map((h, idx) => {
            const fullDistrict = districts.find(
              (d) => d.district.toLowerCase() === h.district.toLowerCase(),
            );

            const color = getRiskColor(h.compositeRiskScore);
            const riskLabel = getRiskLabel(h.compositeRiskScore);

            return (
              <button
                key={h.id}
                type="button"
                onClick={() => {
                  focusHotspot(h);

                  if (fullDistrict) {
                    onSelectDistrict(fullDistrict);
                  }
                }}
                className="w-full text-left p-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl transition-all duration-200 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {/* Top */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    {/* Rank */}
                    <div
                      className={`
                        shrink-0 w-6 h-6 rounded-lg
                        flex items-center justify-center
                        text-[10px] font-black
                        ${
                          idx === 0
                            ? "bg-rose-600 text-white"
                            : idx === 1
                              ? "bg-orange-500 text-white"
                              : idx === 2
                                ? "bg-amber-500 text-white"
                                : "bg-slate-100 text-slate-600"
                        }
                      `}
                    >
                      {idx + 1}
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition truncate">
                        {h.district}
                      </h4>

                      <p className="text-[9px] text-slate-500 mt-0.5 truncate">
                        {h.state} · {h.country}
                      </p>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right shrink-0">
                    <div className="text-sm font-black" style={{ color }}>
                      {h.compositeRiskScore}
                    </div>

                    <div className="text-[8px] text-slate-400">/ 100</div>
                  </div>
                </div>

                {/* Risk bar */}
                <div className="mt-2.5">
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(h.compositeRiskScore, 100)}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>

                {/* Risk + Issue */}
                <div className="mt-2.5 flex items-center gap-1.5">
                  <span
                    className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                    style={{
                      color,
                      backgroundColor: `${color}12`,
                    }}
                  >
                    {riskLabel}
                  </span>

                  {h.compositeRiskScore >= 80 && (
                    <AlertTriangle className="w-3 h-3 text-rose-500" />
                  )}
                </div>

                <p className="mt-2 text-[10px] text-slate-600 line-clamp-2 leading-relaxed">
                  {h.keyIssue}
                </p>

                {/* Bottom stats */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-[9px] font-medium text-slate-500">
                    <Users className="w-3 h-3 text-slate-400" />
                    {h.totalComplaints} requests
                  </span>

                  <span className="text-[9px] font-semibold text-rose-600">
                    {h.criticalComplaints} critical
                  </span>

                  <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
                </div>
              </button>
            );
          })}

          {hotspots.length === 0 && (
            <div className="h-full flex items-center justify-center text-center p-8">
              <div>
                <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-3" />

                <p className="text-xs font-semibold text-slate-600">
                  No hotspots found
                </p>

                <p className="text-[10px] text-slate-400 mt-1">
                  There are currently no locations to display.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
