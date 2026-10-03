import React from "react";
import {
  Download,
  FileText,
  ShieldAlert,
} from "lucide-react";
import { AttendanceRecord, FilterState, LeaderboardRow } from "../types";
import { formatDateIndian } from "../utils/dateUtils";
import { exportAttendanceRecordsCsv, exportAttendanceRecordsPdf } from "../utils/exportUtils";

interface ExportSectionProps {
  filteredRecords: AttendanceRecord[];
  leaderboardRows: LeaderboardRow[];
  dailyTotals: Array<{
    date: string;
    absent: number;
    late: number;
    bunk: number;
  }>;
  filters: FilterState;
  effectivePrograms: string[];
}

export const ExportSection: React.FC<ExportSectionProps> = ({
  filteredRecords,
  filters,
  effectivePrograms,
}) => {
  const count = filteredRecords.length;
  const isNoRecords = count === 0;
  const dateStamp = new Date().toISOString().split("T")[0];

  // Build readable filter summary text
  const filterSummaryParts: string[] = [];
  if (filters.programs.length > 0) {
    filterSummaryParts.push(`Programs: ${filters.programs.join(", ")}`);
  } else {
    filterSummaryParts.push(`Programs: All (${effectivePrograms.length})`);
  }
  if (filters.semester !== "all") {
    filterSummaryParts.push(`Semester: ${filters.semester}`);
  } else {
    filterSummaryParts.push("Semester: All");
  }
  if (filters.type !== "all") {
    filterSummaryParts.push(`Type: ${filters.type}`);
  } else {
    filterSummaryParts.push("Type: All");
  }
  if (filters.dateFrom && filters.dateTo) {
    filterSummaryParts.push(
      `Dates: ${formatDateIndian(filters.dateFrom)} to ${formatDateIndian(filters.dateTo)}`
    );
  }

  const handleExportCsv = () => {
    if (isNoRecords) return;
    exportAttendanceRecordsCsv(filteredRecords, dateStamp);
  };

  const handleExportPdf = () => {
    if (isNoRecords) return;
    exportAttendanceRecordsPdf(filteredRecords, filterSummaryParts, dateStamp);
  };

  return (
    <section id="export" aria-label="Export attendance data" className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Download className="h-4 w-4 text-[#3b6fe0]" />
            <span>Export dataset &amp; reports</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Export client-side in-memory filtered records directly into CSV or PDF format.
          </p>
        </div>

        {/* Current Filter & Row Summary Card */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-850 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Active export scope:
            </span>
            <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
              {count.toLocaleString("en-IN")} records ready to export
            </span>
          </div>
          <p className="text-xs font-mono text-slate-600 dark:text-slate-400">
            {filterSummaryParts.join(" · ")}
          </p>
        </div>

        {/* Export Buttons Grid: Only CSV and PDF */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. CSV Export */}
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
                <FileText className="h-4 w-4 text-[#3b6fe0]" />
                <span>CSV export</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                UTF-8 with BOM and formula injection protection. Contains date, program, semester, type, count, verified, roll numbers, note.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={isNoRecords}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#3b6fe0] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isNoRecords ? "No records for these filters" : "Export CSV (.csv)"}</span>
            </button>
          </div>

          {/* 2. PDF Export */}
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
                <Download className="h-4 w-4 text-[#8b5cf6]" />
                <span>PDF export</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Clean A4 document layout with headers, summary metrics, and active filter configuration.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isNoRecords}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#8b5cf6] px-4 py-2 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isNoRecords ? "No records for these filters" : "Export PDF (.pdf)"}</span>
            </button>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Confidentiality Notice:</strong> Exports contain student roll numbers and absence records. Share them only with authorized college staff and faculty advisors.
          </p>
        </div>
      </div>
    </section>
  );
};
