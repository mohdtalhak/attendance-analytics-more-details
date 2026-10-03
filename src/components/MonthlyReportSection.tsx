import React, { useEffect, useRef, useState, useMemo } from "react";
import Chart from "chart.js/auto";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  AlertCircle,
  Clock,
  Layers,
  Award,
} from "lucide-react";
import { AttendanceRecord, FilterState, MonthlyReportData } from "../types";
import { computeMonthlyReport } from "../utils/analytics";
import { formatDateIndian } from "../utils/dateUtils";
import { downloadCanvasAsPng, exportMonthlyReportCsv, exportMonthlyReportPdf } from "../utils/exportUtils";
import { Pagination } from "./Pagination";

interface MonthlyReportSectionProps {
  allRecords: AttendanceRecord[];
  allDates: string[];
  activeDaysMap: Record<string, string[]>;
  filters: FilterState;
  effectivePrograms: string[];
  isDark: boolean;
}

export const MonthlyReportSection: React.FC<MonthlyReportSectionProps> = ({
  allRecords,
  allDates,
  activeDaysMap,
  filters,
  effectivePrograms,
  isDark,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  const report = useMemo<MonthlyReportData>(() => {
    return computeMonthlyReport(
      allRecords,
      allDates,
      activeDaysMap,
      selectedMonth,
      effectivePrograms,
      filters.semester
    );
  }, [
    allRecords,
    allDates,
    activeDaysMap,
    selectedMonth,
    effectivePrograms,
    filters.semester,
  ]);

  // Sync selectedMonth if empty
  useEffect(() => {
    if (!selectedMonth && report.availableMonths.length > 0) {
      setSelectedMonth(report.availableMonths[0].value);
    }
  }, [selectedMonth, report.availableMonths]);

  // Top rolls table pagination
  const [topRollsPage, setTopRollsPage] = useState<number>(1);
  const TOP_ROLLS_PAGE_SIZE = 10;

  useEffect(() => {
    setTopRollsPage(1);
  }, [selectedMonth, filters.semester]);

  const paginatedTopRolls = useMemo(() => {
    const start = (topRollsPage - 1) * TOP_ROLLS_PAGE_SIZE;
    return report.topRolls.slice(start, start + TOP_ROLLS_PAGE_SIZE);
  }, [report.topRolls, topRollsPage]);

  // Chart canvas refs
  const weeklyCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dailyCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const programCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const textColor = isDark ? "#cbd5e1" : "#475569";
  const gridColor = isDark ? "rgba(148, 163, 184, 0.12)" : "rgba(15, 23, 42, 0.08)";
  const tooltipBg = isDark ? "#0f172a" : "#1e293b";

  // 1. Weekly breakdown bar chart
  useEffect(() => {
    const canvas = weeklyCanvasRef.current;
    if (!canvas || report.weeklyBreakdown.length === 0) return;

    const labels = report.weeklyBreakdown.map((w) => `Week ${w.weekIndex}`);
    const chart = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Absent",
            data: report.weeklyBreakdown.map((w) => w.absent),
            backgroundColor: "#3b6fe0",
            borderRadius: 4,
          },
          {
            label: "Late",
            data: report.weeklyBreakdown.map((w) => w.late),
            backgroundColor: "#e5484d",
            borderRadius: 4,
          },
          {
            label: "Bunk",
            data: report.weeklyBreakdown.map((w) => w.bunk),
            backgroundColor: "#f5a524",
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: { color: textColor, boxWidth: 10, font: { size: 11 } },
          },
          tooltip: {
            backgroundColor: tooltipBg,
            callbacks: {
              title: (items) => {
                const idx = items[0]?.dataIndex ?? 0;
                const item = report.weeklyBreakdown[idx];
                return item ? `${item.label} (${item.activeDays} active days)` : "";
              },
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor, font: { size: 10 } } },
          y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 } } },
        },
      },
    });

    return () => chart.destroy();
  }, [report.weeklyBreakdown, textColor, gridColor, tooltipBg]);

  // 2. Daily trend line chart for month
  useEffect(() => {
    const canvas = dailyCanvasRef.current;
    if (!canvas || report.dailyTrend.length === 0) return;

    const chart = new Chart(canvas, {
      type: "line",
      data: {
        labels: report.dailyTrend.map((d) => d.shortLabel),
        datasets: [
          {
            label: "Absent",
            data: report.dailyTrend.map((d) => d.absent),
            borderColor: "#3b6fe0",
            backgroundColor: "rgba(59, 111, 224, 0.1)",
            tension: 0.2,
            borderWidth: 2,
            pointRadius: 2.5,
          },
          {
            label: "Late",
            data: report.dailyTrend.map((d) => d.late),
            borderColor: "#e5484d",
            backgroundColor: "transparent",
            tension: 0.2,
            borderWidth: 2,
            pointRadius: 2,
          },
          {
            label: "Bunk",
            data: report.dailyTrend.map((d) => d.bunk),
            borderColor: "#f5a524",
            backgroundColor: "transparent",
            tension: 0.2,
            borderWidth: 2,
            pointRadius: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: { color: textColor, boxWidth: 10, font: { size: 11 } },
          },
          tooltip: {
            backgroundColor: tooltipBg,
            callbacks: {
              title: (items) => {
                const idx = items[0]?.dataIndex ?? 0;
                return report.dailyTrend[idx]?.label || "";
              },
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor, font: { size: 10 }, maxRotation: 45 } },
          y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 } } },
        },
      },
    });

    return () => chart.destroy();
  }, [report.dailyTrend, textColor, gridColor, tooltipBg]);

  // 3. Program comparison chart for month
  useEffect(() => {
    const canvas = programCanvasRef.current;
    if (!canvas || report.programBreakdown.length === 0) return;

    const chart = new Chart(canvas, {
      type: "bar",
      data: {
        labels: report.programBreakdown.map((p) => p.program),
        datasets: [
          {
            label: "Absent",
            data: report.programBreakdown.map((p) => p.absent),
            backgroundColor: "#3b6fe0",
            borderRadius: 4,
          },
          {
            label: "Late",
            data: report.programBreakdown.map((p) => p.late),
            backgroundColor: "#e5484d",
            borderRadius: 4,
          },
          {
            label: "Bunk",
            data: report.programBreakdown.map((p) => p.bunk),
            backgroundColor: "#f5a524",
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: { color: textColor, boxWidth: 10, font: { size: 11 } },
          },
          tooltip: { backgroundColor: tooltipBg },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor, font: { size: 10 } } },
          y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 } } },
        },
      },
    });

    return () => chart.destroy();
  }, [report.programBreakdown, textColor, gridColor, tooltipBg]);

  const handleExportPdf = () => {
    const dateStamp = new Date().toISOString().split("T")[0];
    const filterSummary = [
      `Programs: ${effectivePrograms.join(", ")}`,
      `Semester: ${filters.semester}`,
      `Type: ${filters.type}`,
    ];
    exportMonthlyReportPdf(report, filterSummary, dateStamp);
  };

  const handleExportCsv = () => {
    const dateStamp = new Date().toISOString().split("T")[0];
    const monthRecords = allRecords.filter((r) => r.date.startsWith(report.selectedMonth));
    exportMonthlyReportCsv(report.monthLabel, monthRecords, dateStamp);
  };

  const comp = report.prevMonthComparison;

  return (
    <section
      id="monthly-report"
      aria-label="Monthly attendance report"
      className="space-y-6"
    >
      {/* Printable Report Header */}
      <div className="hidden print:block mb-6 border-b border-slate-300 pb-4">
        <h1 className="text-xl font-bold text-slate-900">Attendance monthly report</h1>
        <p className="text-xs text-slate-600 mt-1">
          Month: <strong>{report.monthLabel}</strong> · Generated: {new Date().toLocaleString("en-IN")}
        </p>
        <p className="text-xs text-slate-600">
          Filters used: Programs ({effectivePrograms.join(", ")}), Semester ({filters.semester})
        </p>
      </div>

      {/* Header controls bar */}
      <div className="no-print rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#3b6fe0]" />
              <span>Monthly report</span>
              {report.isMonthInProgress && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  <AlertCircle className="h-3 w-3" />
                  Month in progress
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comprehensive month-level attendance analysis, comparisons, and exportable A4 report.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Month picker */}
            <div className="flex items-center gap-2">
              <label htmlFor="month-picker-select" className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                Select month:
              </label>
              <select
                id="month-picker-select"
                value={report.selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {report.availableMonths.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Export Buttons: CSV and PDF */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shrink-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={handleExportPdf}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#3b6fe0] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-600 transition-colors shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* Total Absent */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900 print:border-slate-300">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total absent</span>
          <p className="mt-1 text-2xl font-bold font-mono text-[#3b6fe0] dark:text-blue-400">
            {report.totalAbsent.toLocaleString("en-IN")}
          </p>
          {comp && comp.hasPrevData ? (
            <div
              className={`mt-1 flex items-center gap-1 text-[11px] font-mono font-medium ${
                comp.absentDiff > 0
                  ? "text-rose-600 dark:text-rose-400"
                  : comp.absentDiff < 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-500"
              }`}
            >
              {comp.absentDiff > 0 ? (
                <TrendingUp className="h-3 w-3 shrink-0" />
              ) : comp.absentDiff < 0 ? (
                <TrendingDown className="h-3 w-3 shrink-0" />
              ) : (
                <Minus className="h-3 w-3 shrink-0" />
              )}
              <span>
                {comp.absentDiff > 0 ? "Up" : comp.absentDiff < 0 ? "Down" : "No change"}{" "}
                {Math.abs(comp.absentDiff)} ({comp.absentPercentChange !== null ? `${comp.absentPercentChange.toFixed(1)}%` : ""}) vs {comp.prevMonthLabel}
              </span>
            </div>
          ) : (
            <span className="text-[10px] text-slate-400 font-mono">No prior month in data</span>
          )}
        </div>

        {/* Total Late */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900 print:border-slate-300">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total late</span>
          <p className="mt-1 text-2xl font-bold font-mono text-[#e5484d] dark:text-rose-400">
            {report.totalLate.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-slate-400 font-mono">In {report.monthLabel}</span>
        </div>

        {/* Total Bunk */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900 print:border-slate-300">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total bunk</span>
          <p className="mt-1 text-2xl font-bold font-mono text-[#f5a524] dark:text-amber-400">
            {report.totalBunk.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-slate-400 font-mono">In {report.monthLabel}</span>
        </div>

        {/* Avg per Active Day */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900 print:border-slate-300">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Avg per active day</span>
          <p className="mt-1 text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {report.avgAbsentPerDay.toFixed(1)}
          </p>
          {comp && comp.hasPrevData ? (
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              vs {comp.prevAvgAbsentPerDay.toFixed(1)}/day in {comp.prevMonthLabel}
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 font-mono">{report.activeDaysCount} active days</span>
          )}
        </div>

        {/* Worst Day */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900 print:border-slate-300">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Clock className="h-3 w-3 text-slate-400" />
            Worst day
          </span>
          <p className="mt-1 text-base font-bold font-mono text-slate-900 dark:text-slate-100">
            {report.worstDay ? formatDateIndian(report.worstDay.date) : "—"}
          </p>
          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-mono">
            {report.worstDay ? `${report.worstDay.absent} absences` : "None"}
          </span>
        </div>

        {/* Worst Weekday & Program */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900 print:border-slate-300">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Worst program / day</span>
          <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
            {report.worstProgram ? report.worstProgram.program : "—"}
            <span className="text-slate-400 font-normal"> · </span>
            {report.worstWeekday ? report.worstWeekday.dayName : "—"}
          </p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            {report.worstProgram ? `${report.worstProgram.absent} absences` : ""}
          </span>
        </div>
      </div>

      {/* Week-by-Week Breakdown & Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Table */}
        <div className="lg:col-span-6 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 print:border-slate-300">
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-[#3b6fe0]" />
            <span>Week-by-week breakdown (Monday to Sunday)</span>
          </h3>
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                  <th className="px-3 py-2 font-semibold whitespace-nowrap">Week</th>
                  <th className="px-3 py-2 font-semibold whitespace-nowrap">Dates</th>
                  <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">Active days</th>
                  <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">Absent</th>
                  <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">Late</th>
                  <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">Bunk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {report.weeklyBreakdown.map((w) => (
                  <tr key={w.weekIndex} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-2 font-mono font-bold text-slate-900 dark:text-slate-100">
                      Week {w.weekIndex}
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {w.label}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-700 dark:text-slate-300">
                      {w.activeDays}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-[#3b6fe0] dark:text-blue-400">
                      {w.absent}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-[#e5484d] dark:text-rose-400">
                      {w.late}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-[#f5a524] dark:text-amber-400">
                      {w.bunk}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Weekly Chart */}
        <div className="lg:col-span-6 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 print:border-slate-300 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Weekly totals chart
            </h3>
            <button
              type="button"
              onClick={() => downloadCanvasAsPng(weeklyCanvasRef.current, `monthly_weekly_${report.selectedMonth}`)}
              className="no-print inline-flex items-center gap-1 text-[11px] text-[#3b6fe0] hover:underline"
            >
              <Download className="h-3 w-3" />
              <span>Download PNG</span>
            </button>
          </div>
          <div className="h-56 w-full">
            <canvas ref={weeklyCanvasRef} />
          </div>
        </div>
      </div>

      {/* Daily Chart & Program Comparison for Month */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Daily chart */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 print:border-slate-300">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Daily trend in {report.monthLabel}
            </h3>
            <button
              type="button"
              onClick={() => downloadCanvasAsPng(dailyCanvasRef.current, `monthly_daily_${report.selectedMonth}`)}
              className="no-print inline-flex items-center gap-1 text-[11px] text-[#3b6fe0] hover:underline"
            >
              <Download className="h-3 w-3" />
              <span>Download PNG</span>
            </button>
          </div>
          <div className="h-64 w-full">
            <canvas ref={dailyCanvasRef} />
          </div>
        </div>

        {/* Program breakdown chart */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 print:border-slate-300">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Department comparison ({report.monthLabel})
            </h3>
            <button
              type="button"
              onClick={() => downloadCanvasAsPng(programCanvasRef.current, `monthly_programs_${report.selectedMonth}`)}
              className="no-print inline-flex items-center gap-1 text-[11px] text-[#3b6fe0] hover:underline"
            >
              <Download className="h-3 w-3" />
              <span>Download PNG</span>
            </button>
          </div>
          <div className="h-64 w-full">
            <canvas ref={programCanvasRef} />
          </div>
        </div>
      </div>

      {/* Top 10 roll numbers for month */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 print:border-slate-300">
        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
          <Award className="h-3.5 w-3.5 text-[#3b6fe0]" />
          <span>Verified roll numbers with absences in {report.monthLabel}</span>
        </h3>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 italic">
          Based on verified entries. Roll lists are missing or inconsistent for the rest, so real numbers may be higher.
        </p>

        {report.topRolls.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">
            No verified roll numbers with absences recorded in this month.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                    <th className="px-3 py-2 font-semibold">Rank</th>
                    <th className="px-3 py-2 font-semibold">Roll number</th>
                    <th className="px-3 py-2 font-semibold">Program</th>
                    <th className="px-3 py-2 font-semibold">Semester(s)</th>
                    <th className="px-3 py-2 text-right font-semibold">Absent</th>
                    <th className="px-3 py-2 text-right font-semibold">Late</th>
                    <th className="px-3 py-2 text-right font-semibold">Bunk</th>
                    <th className="px-3 py-2 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {paginatedTopRolls.map((r, idx) => (
                    <tr key={`${r.program}-${r.roll}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2 font-mono text-slate-500">
                        #{(topRollsPage - 1) * TOP_ROLLS_PAGE_SIZE + idx + 1}
                      </td>
                      <td className="px-3 py-2 font-mono font-bold text-slate-900 dark:text-slate-100">
                        Roll {r.roll}
                      </td>
                      <td className="px-3 py-2 font-mono font-medium">{r.program}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{r.semesters.join(", ")}</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-[#3b6fe0] dark:text-blue-400">
                        {r.absent}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[#e5484d] dark:text-rose-400">
                        {r.late}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[#f5a524] dark:text-amber-400">
                        {r.bunk}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {r.totalOccurrences}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={topRollsPage}
              totalItems={report.topRolls.length}
              pageSize={TOP_ROLLS_PAGE_SIZE}
              onPageChange={setTopRollsPage}
              itemName="students"
            />
          </div>
        )}
      </div>
    </section>
  );
};
