import {
  Building2,
  CheckCircle2,
  Clock3,
  Filter,
  Layers,
  MapPin,
  MessageCircle,
  Mic,
  Phone,
  Search,
  Sparkles,
  Volume2,
} from "lucide-react";
import React, { useState } from "react";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Separator } from "../components/ui/separator";

import {
  Grievance,
  GrievanceStatus,
  SectorCategory,
  SeverityLevel,
} from "../types";
import { countryName } from "../utils/country";

interface GrievanceFeedProps {
  grievances: Grievance[];
  country?: string;
  onUpdateStatus: (id: string, status: GrievanceStatus) => void;
  onOpenSimulator: () => void;
}

export const GrievanceFeed: React.FC<GrievanceFeedProps> = ({
  grievances,
  country,
  onUpdateStatus,
  onOpenSimulator,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    SectorCategory | "ALL"
  >("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState<
    SeverityLevel | "ALL"
  >("ALL");
  const [selectedStatus, setSelectedStatus] = useState<GrievanceStatus | "ALL">(
    "ALL",
  );
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const filteredGrievances = grievances.filter((g) => {
    if (selectedCategory !== "ALL" && g.category !== selectedCategory) {
      return false;
    }

    if (selectedSeverity !== "ALL" && g.severity !== selectedSeverity) {
      return false;
    }

    if (selectedStatus !== "ALL" && g.status !== selectedStatus) {
      return false;
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();

      return (
        g.ticketNumber.toLowerCase().includes(q) ||
        g.citizenName.toLowerCase().includes(q) ||
        g.location.district.toLowerCase().includes(q) ||
        g.location.villageWard?.toLowerCase().includes(q) ||
        g.rawTranscript.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q)
      );
    }

    return true;
  });

  const criticalCount = grievances.filter(
    (g) => g.severity === "CRITICAL",
  ).length;

  const unresolvedCount = grievances.filter(
    (g) => g.status !== "RESOLVED",
  ).length;

  const resolvedCount = grievances.filter(
    (g) => g.status === "RESOLVED",
  ).length;

  const resolutionRate =
    grievances.length > 0
      ? Math.round((resolvedCount / grievances.length) * 100)
      : 0;

  const handlePlayVoice = (id: string, text: string) => {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    if (playingAudioId === id) {
      setPlayingAudioId(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = "hi-IN";

    utterance.onend = () => {
      setPlayingAudioId(null);
    };

    utterance.onerror = () => {
      setPlayingAudioId(null);
    };

    setPlayingAudioId(id);
    window.speechSynthesis.speak(utterance);
  };

  const getSeverityBadge = (severity: SeverityLevel) => {
    switch (severity) {
      case "CRITICAL":
        return "border-rose-200 bg-rose-50 text-rose-700";

      case "HIGH":
        return "border-amber-200 bg-amber-50 text-amber-700";

      case "MEDIUM":
        return "border-blue-200 bg-blue-50 text-blue-700";

      default:
        return "border-slate-200 bg-slate-50 text-slate-600";
    }
  };

  const getStatusBadge = (status: GrievanceStatus) => {
    switch (status) {
      case "RESOLVED":
        return "border-emerald-200 bg-emerald-50 text-emerald-700";

      case "IN_PROGRESS":
        return "border-indigo-200 bg-indigo-50 text-indigo-700";

      case "ESCALATED_TO_PLANNING":
        return "border-purple-200 bg-purple-50 text-purple-700";

      case "UNDER_VERIFICATION":
        return "border-amber-200 bg-amber-50 text-amber-700";

      default:
        return "border-slate-200 bg-slate-50 text-slate-600";
    }
  };

  const formatCategory = (category: string) => {
    return category
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatStatus = (status: string) => {
    return status
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <div className="space-y-5">
      {/* =========================================================
          PAGE HEADER
      ========================================================== */}
      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardHeader className="border-b bg-white p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge
                  variant="secondary"
                  className="bg-slate-100 text-slate-700"
                >
                  Citizen Intelligence
                </Badge>

                <Badge
                  variant="outline"
                  className="border-blue-200 bg-blue-50 text-blue-700"
                >
                  {grievances.length} total requests
                </Badge>

                {country && country !== "ALL" && (
                  <Badge
                    variant="outline"
                    className="border-slate-200 text-slate-600"
                  >
                    {countryName(country)}
                  </Badge>
                )}
              </div>

              <h1 className="text-xl font-semibold tracking-tight text-slate-950">
                Citizen Grievance Stream
              </h1>

              <p className="mt-1.5 max-w-2xl text-sm leading-5 text-muted-foreground">
                Review citizen requests collected through voice, messaging, and
                digital channels, then track their movement through the policy
                workflow.
              </p>
            </div>

            <Button
              onClick={onOpenSimulator}
              variant="default"
              className="px-5 py-5"
            >
              Simulate Citizen Request
            </Button>
          </div>
        </CardHeader>

        {/* =====================================================
            SUMMARY METRICS
        ====================================================== */}
        <CardContent className="grid grid-cols-2 divide-x divide-slate-200 p-0 md:grid-cols-4">
          <div className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total Requests
            </p>

            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
              {grievances.length}
            </p>

            <p className="mt-1 text-[11px] text-muted-foreground">
              Across all intake channels
            </p>
          </div>

          <div className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-600">
              Critical
            </p>

            <p className="mt-1 text-2xl font-bold tracking-tight text-rose-700">
              {criticalCount}
            </p>

            <p className="mt-1 text-[11px] text-muted-foreground">
              Require priority review
            </p>
          </div>

          <div className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600">
              In Workflow
            </p>

            <p className="mt-1 text-2xl font-bold tracking-tight text-indigo-700">
              {unresolvedCount}
            </p>

            <p className="mt-1 text-[11px] text-muted-foreground">
              Currently unresolved
            </p>
          </div>

          <div className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
              Resolution Rate
            </p>

            <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-700">
              {resolutionRate}%
            </p>

            <p className="mt-1 text-[11px] text-muted-foreground">
              {resolvedCount} requests resolved
            </p>
          </div>
        </CardContent>
      </Card>

      {/* =========================================================
          SEARCH + FILTERS
      ========================================================== */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            {/* Search */}
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search ticket, citizen, district, village, or grievance text..."
                className="h-9 bg-slate-50 pl-9 text-xs focus-visible:bg-white"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="mr-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
                Filters
              </div>

              <Select
                value={selectedCategory}
                onValueChange={(value) =>
                  setSelectedCategory(value as SectorCategory | "ALL")
                }
              >
                <SelectTrigger className="h-9 w-[145px] bg-white text-xs">
                  <SelectValue placeholder="Sector" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="ALL">All Sectors</SelectItem>
                  <SelectItem value="WATER_SUPPLY">Water Supply</SelectItem>
                  <SelectItem value="RURAL_ROADS">Rural Roads</SelectItem>
                  <SelectItem value="POWER_GRID">Power Grid</SelectItem>
                  <SelectItem value="HEALTHCARE">Healthcare</SelectItem>
                  <SelectItem value="SANITATION">Sanitation</SelectItem>
                  <SelectItem value="FLOOD_DRAINAGE">
                    Flood & Drainage
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={selectedSeverity}
                onValueChange={(value) =>
                  setSelectedSeverity(value as SeverityLevel | "ALL")
                }
              >
                <SelectTrigger className="h-9 w-[130px] bg-white text-xs">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="ALL">All Severity</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={selectedStatus}
                onValueChange={(value) =>
                  setSelectedStatus(value as GrievanceStatus | "ALL")
                }
              >
                <SelectTrigger className="h-9 w-[155px] bg-white text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="REGISTERED">Registered</SelectItem>
                  <SelectItem value="UNDER_VERIFICATION">
                    Under Verification
                  </SelectItem>
                  <SelectItem value="ESCALATED_TO_PLANNING">
                    Escalated to Planning
                  </SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t pt-3">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Filter className="h-3 w-3" />

              <span>
                Showing{" "}
                <span className="font-semibold text-slate-800">
                  {filteredGrievances.length}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-800">
                  {grievances.length}
                </span>{" "}
                requests
              </span>
            </div>

            {(searchTerm ||
              selectedCategory !== "ALL" ||
              selectedSeverity !== "ALL" ||
              selectedStatus !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("ALL");
                  setSelectedSeverity("ALL");
                  setSelectedStatus("ALL");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* =========================================================
          GRIEVANCE RESULTS
      ========================================================== */}
      <div className="space-y-3">
        {filteredGrievances.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <Search className="h-5 w-5 text-slate-400" />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-slate-900">
                No matching requests
              </h3>

              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Try changing the search query or removing one of the active
                filters.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredGrievances.map((g) => (
            <Card
              key={g.id}
              className="overflow-hidden border-slate-200 shadow-sm transition hover:border-slate-300"
            >
              <CardContent className="p-0">
                {/* Request Header */}
                <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px] font-bold"
                      >
                        {g.ticketNumber}
                      </Badge>

                      <Badge
                        variant="outline"
                        className={getSeverityBadge(g.severity)}
                      >
                        {g.severity}
                      </Badge>

                      <Badge
                        variant="secondary"
                        className="bg-slate-100 text-slate-700"
                      >
                        {formatCategory(g.category)}
                      </Badge>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {g.citizenName}
                      </p>

                      <span className="text-xs text-muted-foreground">
                        {g.citizenPhone}
                      </span>
                    </div>
                  </div>

                  {/* Channel + Date */}
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge
                      variant="outline"
                      className="gap-1.5 bg-white text-[10px]"
                    >
                      {g.channel === "WHATSAPP" ? (
                        <>
                          <MessageCircle className="h-3 w-3 text-emerald-600" />
                          WhatsApp
                        </>
                      ) : g.channel === "VOICE_CALL" ? (
                        <>
                          <Phone className="h-3 w-3 text-blue-600" />
                          Voice Call
                        </>
                      ) : (
                        <>
                          <Layers className="h-3 w-3 text-slate-500" />
                          Web Portal
                        </>
                      )}
                    </Badge>

                    <span className="text-[11px] text-muted-foreground">
                      {new Date(g.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Location */}
                <div className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />

                    <span className="font-medium text-slate-800">
                      {g.location.villageWard || "Hamlet"}
                    </span>

                    <span className="text-slate-300">•</span>

                    <span className="text-muted-foreground">
                      {g.location.block || "Block"}
                    </span>

                    <span className="text-slate-300">•</span>

                    <span className="font-medium text-slate-700">
                      {g.location.district}
                    </span>

                    <span className="text-muted-foreground">
                      ({g.location.state}, {g.location.country})
                    </span>

                    <span className="ml-auto text-[11px] text-muted-foreground">
                      ~{g.affectedPopulationEst.toLocaleString()} affected
                    </span>
                  </div>
                </div>

                {/* Citizen Evidence */}
                <div className="px-4 pb-4">
                  <div className="rounded-xl border bg-slate-50/80 p-3.5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        {g.channel === "VOICE_CALL" ? (
                          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-100">
                            <Mic className="h-3.5 w-3.5 text-blue-600" />
                          </div>
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-200">
                            <MessageCircle className="h-3.5 w-3.5 text-slate-600" />
                          </div>
                        )}

                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                            Citizen Evidence
                          </p>

                          <p className="text-[10px] text-muted-foreground">
                            Original input • {g.language.toUpperCase()}
                          </p>
                        </div>
                      </div>

                      {g.channel === "VOICE_CALL" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 bg-white text-[10px]"
                          onClick={() => handlePlayVoice(g.id, g.rawTranscript)}
                        >
                          <Volume2 className="mr-1.5 h-3.5 w-3.5 text-blue-600" />

                          {playingAudioId === g.id
                            ? "Playing voice..."
                            : "Play synthetic voice"}
                        </Button>
                      )}
                    </div>

                    <p className="mt-3 text-xs leading-5 text-slate-700">
                      “{g.rawTranscript}”
                    </p>

                    {g.translatedText && g.language !== "en" && (
                      <div className="mt-3 border-t pt-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          English translation
                        </p>

                        <p className="mt-1 text-[11px] leading-5 text-slate-600">
                          {g.translatedText}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Workflow Footer */}
                <div className="border-t bg-white px-4 py-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-xs">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" />

                      <span className="text-muted-foreground">
                        Assigned department
                      </span>

                      <span className="font-semibold text-slate-800">
                        {g.assignedDepartment}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        Workflow status
                      </span>

                      <Select
                        value={g.status}
                        onValueChange={(value) =>
                          onUpdateStatus(g.id, value as GrievanceStatus)
                        }
                      >
                        <SelectTrigger
                          className={`h-8 w-[180px] text-[11px] font-semibold ${getStatusBadge(
                            g.status,
                          )}`}
                        >
                          <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                          <SelectItem value="REGISTERED">Registered</SelectItem>

                          <SelectItem value="UNDER_VERIFICATION">
                            Under Verification
                          </SelectItem>

                          <SelectItem value="ESCALATED_TO_PLANNING">
                            Escalated to Planning
                          </SelectItem>

                          <SelectItem value="IN_PROGRESS">
                            In Progress
                          </SelectItem>

                          <SelectItem value="RESOLVED">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
