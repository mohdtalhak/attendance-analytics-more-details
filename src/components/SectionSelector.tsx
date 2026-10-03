import React from "react";
import {
  LayoutDashboard,
  Calendar,
  Users,
  AlertTriangle,
  Download,
  ShieldCheck,
  Grid,
  BarChart3,
  Trophy,
} from "lucide-react";
import { DashboardNavSection } from "../types";

interface SectionSelectorProps {
  activeSection: DashboardNavSection;
  onSelectSection: (section: DashboardNavSection) => void;
  alertCount?: number;
  warningsCount?: number;
}

export const SectionSelector: React.FC<SectionSelectorProps> = ({
  activeSection,
  onSelectSection,
  alertCount = 0,
  warningsCount = 0,
}) => {
  const sections: Array<{
    id: DashboardNavSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "scorecards", label: "Scorecards", icon: Grid },
    { id: "charts", label: "Visualizations", icon: BarChart3 },
    { id: "leaderboard", label: "Leaderboard", icon: Trophy },
    { id: "monthly-report", label: "Monthly report", icon: Calendar },
    { id: "students", label: "Students", icon: Users },
    {
      id: "insights-alerts",
      label: "Insights & alerts",
      icon: AlertTriangle,
      badge: alertCount > 0 ? alertCount : undefined,
    },
    {
      id: "data-quality",
      label: "Data quality",
      icon: ShieldCheck,
      badge: warningsCount > 0 ? warningsCount : undefined,
    },
    { id: "export", label: "Export", icon: Download },
  ];

  return (
    <div
      role="tablist"
      aria-label="Dashboard sections"
      className="no-print relative overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 dark:border-slate-800 dark:bg-slate-900 shadow-xs"
    >
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 px-0.5">
        {sections.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              role="tab"
              type="button"
              onClick={() => onSelectSection(sec.id)}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                isActive
                  ? "bg-[#3b6fe0] text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              }`}
              aria-selected={isActive}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{sec.label}</span>
              {sec.badge !== undefined && sec.badge > 0 && (
                <span
                  className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.2 text-[10px] font-bold font-mono ${
                    isActive
                      ? "bg-white/25 text-white"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                  }`}
                >
                  {sec.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
