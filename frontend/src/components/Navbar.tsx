import {
  BarChart3,
  Bot,
  Layers,
  MapPin,
  MessageSquare,
  Scale,
  TrendingUp,
} from 'lucide-react';
import React from 'react';

export type TabType =
  | 'map'
  | 'gaps'
  | 'grievances'
  | 'copilot'
  | 'impact'
  | 'investment'
  | 'simulator';

interface NavbarProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  badgeCounts: {
    gaps: number;
    grievances: number;
  };
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onChangeTab,
  badgeCounts,
}) => {
  const tabs = [
    {
      id: 'map' as TabType,
      label: 'Geographic Intelligence & Hotspots',
      shortLabel: 'Map & Hotspots',
      icon: MapPin,
    },
    {
      id: 'gaps' as TabType,
      label: 'Current Plan vs Demand Gap Matrix',
      shortLabel: 'Policy Gap Matrix',
      icon: Scale,
      badge: badgeCounts.gaps > 0 ? `${badgeCounts.gaps} Gaps` : undefined,
      badgeColor: 'bg-rose-100 text-rose-700 border-rose-200',
    },
    {
      id: 'grievances' as TabType,
      label: 'Live Citizen Grievance Stream',
      shortLabel: 'Grievance Stream',
      icon: Layers,
      badge: badgeCounts.grievances > 0 ? `${badgeCounts.grievances}` : undefined,
      badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
    },
    {
      id: 'copilot' as TabType,
      label: 'Policy AI Analyst Copilot',
      shortLabel: 'Policy AI Analyst',
      icon: Bot,
      highlight: true,
    },
    {
      id: 'impact' as TabType,
      label: 'Project Impact & Demographics',
      shortLabel: 'Impact & Analytics',
      icon: BarChart3,
    },
    {
      id: 'investment' as TabType,
      label: 'BRICS Investment, Trade & Surplus',
      shortLabel: 'Investment',
      icon: TrendingUp,
    },
    {
      id: 'simulator' as TabType,
      label: 'Citizen WhatsApp & Voice Portal',
      shortLabel: 'Citizen Portal',
      icon: MessageSquare,
    },
  ];

  return (
    <div className="bg-white border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 overflow-x-auto py-2 scrollbar-none" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onChangeTab(tab.id)}
                className={`flex items-center space-x-2 py-2.5 px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive
                      ? 'text-blue-300'
                      : tab.highlight
                      ? 'text-indigo-600'
                      : 'text-slate-500'
                  }`}
                />
                <span className="hidden md:inline">{tab.label}</span>
                <span className="md:hidden">{tab.shortLabel}</span>

                {tab.badge && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded border ${
                      isActive ? 'bg-slate-800 text-slate-200 border-slate-700' : tab.badgeColor
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
