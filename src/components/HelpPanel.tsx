import React, { useState } from "react";
import { HelpCircle, ChevronDown, CheckCircle, Info, RefreshCw, AlertCircle } from "lucide-react";

export const HelpPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="no-print rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden shadow-xs transition-colors">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-slate-200 dark:hover:bg-slate-800/60"
      >
        <span className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-[#3b6fe0] shrink-0" aria-hidden="true" />
          <span>How to read this dashboard (rules, metrics & verification)</span>
        </span>
        <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <span>{isOpen ? "Hide guide" : "Show guide"}</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-slate-200 bg-slate-50/50 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/60 space-y-4 text-xs text-slate-700 dark:text-slate-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Attendance categories */}
            <div className="rounded-lg border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-850">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-2">
                <span className="h-2 w-2 rounded-full bg-[#3b6fe0]"></span>
                Attendance types
              </h4>
              <ul className="space-y-1.5 text-slate-600 dark:text-slate-400">
                <li>
                  <strong className="text-slate-800 dark:text-slate-200">Absent:</strong> Student did not attend the scheduled lecture or lab session.
                </li>
                <li>
                  <strong className="text-slate-800 dark:text-slate-200">Late:</strong> Student arrived after class commencement or marking cut-off.
                </li>
                <li>
                  <strong className="text-slate-800 dark:text-slate-200">Bunk:</strong> Student was present in college or earlier periods but skipped this specific class.
                </li>
              </ul>
            </div>

            {/* 2. Official Source & Counts */}
            <div className="rounded-lg border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-850">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-2">
                <Info className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Data source & total counts
              </h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                All totals, charts, and comparisons rely strictly on the official consolidated master spreadsheet count for each date, department, and semester. Figures reflect actual faculty-recorded occurrences.
              </p>
            </div>

            {/* 3. Verified Roll Numbers */}
            <div className="rounded-lg border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-850">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-2">
                <CheckCircle className="h-3.5 w-3.5 text-[#3b6fe0]" />
                Verified roll numbers
              </h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Individual student queries use only entries where roll lists were validated (<code className="font-mono text-emerald-600 dark:text-emerald-400">rollsOk = true</code>). If a teacher entered inconsistent roll numbers, those counts are included in aggregate summaries but excluded from student profiles.
              </p>
            </div>

            {/* 4. Active Days */}
            <div className="rounded-lg border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-850">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-2">
                <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                What is an active day?
              </h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                An active day is an official scheduled college day for that program according to academic department records. Weekends, designated holidays, and cancelled instruction days are never counted as zero days.
              </p>
            </div>

            {/* 5. Auto-sync & manual refresh */}
            <div className="rounded-lg border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-850">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-2">
                <RefreshCw className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                Real-time synchronization
              </h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Data automatically refreshes every 2 minutes while your browser tab remains active. Clicking <span className="font-medium text-slate-800 dark:text-slate-200">"Sync data"</span> in the header bypasses cache and forces an immediate fresh fetch from the server.
              </p>
            </div>

            {/* 6. Why no percentages */}
            <div className="rounded-lg border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-850">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-2">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                Why no attendance percentage?
              </h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                The institutional spreadsheet tracks absence occurrences, late arrivals, and bunks. Because enrolled class strength and individual present counts are not provided, this dashboard never estimates or invents attendance percentages.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
