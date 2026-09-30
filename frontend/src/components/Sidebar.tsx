import {
  Activity,
  BarChart3,
  Bot,
  Building,
  ChevronDown,
  FileSpreadsheet,
  Globe,
  Headphones,
  HelpCircle,
  Layers,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Phone,
  Scale,
  Settings,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import React from "react";
import type { TabType } from "./Navbar";

interface SidebarProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  badgeCounts: {
    gaps: number;
    grievances: number;
  };
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onChangeTab,
  badgeCounts,
  collapsed,
  onToggleCollapse,
}) => {
  const mainNav = [
    { id: "map" as TabType, label: "Dashboard & Map", icon: LayoutDashboard },
    {
      id: "gaps" as TabType,
      label: "Plan Gap Matrix",
      icon: Scale,
      badge: badgeCounts.gaps,
    },
    {
      id: "grievances" as TabType,
      label: "Grievance Stream",
      icon: Layers,
      badge: badgeCounts.grievances,
    },
  ];

  const intelligenceNav = [
    {
      id: "copilot" as TabType,
      label: "Policy AI Analyst",
      icon: Bot,
      isNew: true,
    },
    {
      id: "impact" as TabType,
      label: "Project Impact & Analytics",
      icon: BarChart3,
    },
    {
      id: "investment" as TabType,
      label: "BRICS Investment & Surplus",
      icon: Globe,
    },
  ];

  return (
    <aside
      className={`bg-white border-r border-slate-200 transition-all duration-200 flex flex-col justify-between shrink-0 select-none ${
        collapsed ? "w-18" : "w-64"
      } h-screen sticky top-0 z-30`}
    >
      <div>
        {/* Organization Brand Header */}
        <div className="h-16 px-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3 overflow-hidden">
            {/* LOGO */}
            {!collapsed && (
              <div className="truncate">
                <h1 className="text-sm font-bold text-slate-900 font-display tracking-tight leading-none">
                  NEXA
                </h1>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="p-3 space-y-6 overflow-y-auto max-h-[calc(100vh-140px)]">
          {/* Main Section */}
          <div>
            {!collapsed && (
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 block">
                Main
              </span>
            )}
            <div className="space-y-1">
              {mainNav.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onChangeTab(item.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      isActive
                        ? "bg-slate-900 text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                    title={item.label}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${isActive ? "text-blue-300" : "text-slate-500"}`}
                    />
                    {!collapsed && (
                      <span className="truncate flex-1 text-left">
                        {item.label}
                      </span>
                    )}
                    {!collapsed &&
                      item.badge !== undefined &&
                      item.badge > 0 && (
                        <span
                          className={`px-1.5 py-0.2 text-[9px] font-bold rounded ${
                            isActive
                              ? "bg-slate-800 text-slate-200"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Decision Intelligence Section */}
          <div>
            {!collapsed && (
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 block">
                Intelligence
              </span>
            )}
            <div className="space-y-1">
              {intelligenceNav.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onChangeTab(item.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      isActive
                        ? "bg-slate-900 text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                    title={item.label}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${isActive ? "text-blue-300" : "text-slate-500"}`}
                    />
                    {!collapsed && (
                      <span className="truncate flex-1 text-left">
                        {item.label}
                      </span>
                    )}
                    {!collapsed && item.isNew && (
                      <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-blue-50 text-blue-700 border border-blue-200">
                        AI
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* User Profile Pill at Bottom */}
      <div className="p-3 border-t border-slate-200">
        <div className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200/80 flex items-center justify-between transition cursor-pointer">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
              PD
            </div>
            {!collapsed && (
              <div className="truncate">
                <span className="block text-xs font-bold text-slate-900 truncate">
                  Policy Director
                </span>
                <span className="block text-[10px] text-slate-500 truncate">
                  gov.planning@nexa.dpi
                </span>
              </div>
            )}
          </div>
          {!collapsed && (
            <Settings className="w-4 h-4 text-slate-400 shrink-0" />
          )}
        </div>
      </div>
    </aside>
  );
};
