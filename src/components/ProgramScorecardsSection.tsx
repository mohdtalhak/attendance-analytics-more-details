import React, { useEffect, useRef, useState, useMemo } from "react";
import Chart from "chart.js/auto";
import {
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  GitCompare,
  Calendar,
  Grid,
  Download,
  Award,
} from "lucide-react";
import {
  AttendanceRecord,
  FilterState,
  ProgramScorecardItem,
  ProgramSemesterMatrixItem,
  SemesterFilter,
  TermWeeksSummary,
} from "../types";
import { computeTwoProgramComparison } from "../utils/analytics";
import { formatDateIndian } from "../utils/dateUtils";
import { downloadCanvasAsPng } from "../utils/exportUtils";

interface ProgramScorecardsSectionProps {
  scorecards: ProgramScorecardItem[];
  matrix: ProgramSemesterMatrixItem[];
  termWeeks: TermWeeksSummary;
  allPrograms: string[];
  allRecords: AttendanceRecord[];
  activeDaysMap: Record<string, string[]>;
  filters: FilterState;
  onSelectProgramAndSemester: (prog: string, sem: SemesterFilter) => void;
  isDark: boolean;
}

export const ProgramScorecardsSection: React.FC<ProgramScorecardsSectionProps> = ({
  scorecards,
  matrix,
  termWeeks,
  allPrograms,
  allRecords,
  activeDaysMap,
  filters,
  onSelectProgramAndSemester,
  isDark,
}) => {
  // Compare two programs state
  const [progA, setProgA] = useState<string>(allPrograms[0] || "CO-A");
  const [progB, setProgB] = useState<string>(
    allPrograms[1] || (allPrograms[0] ? allPrograms[0] : "ME")
  );

  const comparisonData = useMemo(() => {
    return computeTwoProgramComparison(
      allRecords,
      progA,
      progB,
      activeDaysMap,
      filters.dateFrom,
      filters.dateTo
    );
  }, [allRecords, progA, progB, activeDaysMap, filters.dateFrom, filters.dateTo]);

  // Chart canvas refs
  const compareBarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const compareLineCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const textColor = isDark ? "#cbd5e1" : "#475569";
  const gridColor = isDark ? "rgba(148, 163, 184, 0.12)" : "rgba(15, 23, 42, 0.08)";
  const tooltipBg = isDark ? "#0f172a" : "#1e293b";

  // Grouped bar chart comparing Program A vs Program B
  useEffect(() => {
    const canvas = compareBarCanvasRef.current;
    if (!canvas) return;

    const chart = new Chart(canvas, {
      type: "bar",
      data: {
        labels: ["Absent", "Late", "Bunk"],
        datasets: [
          {
            label: progA,
            data: [
              comparisonData.dataA.absent,
              comparisonData.dataA.late,
              comparisonData.dataA.bunk,
            ],
            backgroundColor: "#3b6fe0",
            borderRadius: 4,
          },
          {
            label: progB,
            data: [
              comparisonData.dataB.absent,
              comparisonData.dataB.late,
              comparisonData.dataB.bunk,
            ],
            backgroundColor: "#8b5cf6",
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
  }, [comparisonData, progA, progB, textColor, gridColor, tooltipBg]);

  // Daily trend with both lines
  useEffect(() => {
    const canvas = compareLineCanvasRef.current;
    if (!canvas) return;

    const chart = new Chart(canvas, {
      type: "line",
      data: {
        labels: comparisonData.dailyTrendComparison.map((d) => d.shortLabel),
        datasets: [
          {
            label: `${progA} (Absent)`,
            data: comparisonData.dailyTrendComparison.map((d) => d.absentA),
            borderColor: "#3b6fe0",
            backgroundColor: "rgba(59, 111, 224, 0.1)",
            tension: 0.2,
            borderWidth: 2,
            pointRadius: 2,
          },
          {
            label: `${progB} (Absent)`,
            data: comparisonData.dailyTrendComparison.map((d) => d.absentB),
            borderColor: "#8b5cf6",
            backgroundColor: "rgba(139, 92, 246, 0.1)",
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
                return comparisonData.dailyTrendComparison[idx]?.label || "";
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
  }, [comparisonData, progA, progB, textColor, gridColor, tooltipBg]);

  // Max value for matrix heatmap color intensity
  const maxMatrixAbsent = useMemo(() => {
    let max = 0;
    for (const item of matrix) {
      if (item.first > max) max = item.first;
      if (item.third > max) max = item.third;
      if (item.fifth > max) max = item.fifth;
    }
    return max || 1;
  }, [matrix]);

  return (
    <section id="scorecards" aria-label="Program scorecards and comparison" className="space-y-6">
      {/* Best and Worst Weeks of the Term */}
      {(termWeeks.bestWeek || termWeeks.worstWeek) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {termWeeks.bestWeek && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/40">
              <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="h-4 w-4" />
                Best week of term (Lowest absences)
              </span>
              <p className="mt-1 text-base font-bold font-mono text-emerald-950 dark:text-emerald-100">
                {formatDateIndian(termWeeks.bestWeek.startDate)} to {formatDateIndian(termWeeks.bestWeek.endDate)}
              </p>
              <p className="mt-0.5 text-xs text-emerald-800 dark:text-emerald-300 font-mono font-medium">
                {termWeeks.bestWeek.totalAbsent} total absences across Monday to Saturday
              </p>
            </div>
          )}

          {termWeeks.worstWeek && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900/60 dark:bg-rose-950/40">
              <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                Worst week of term (Highest absences)
              </span>
              <p className="mt-1 text-base font-bold font-mono text-rose-950 dark:text-rose-100">
                {formatDateIndian(termWeeks.worstWeek.startDate)} to {formatDateIndian(termWeeks.worstWeek.endDate)}
              </p>
              <p className="mt-0.5 text-xs text-rose-800 dark:text-rose-300 font-mono font-medium">
                {termWeeks.worstWeek.totalAbsent} total absences across Monday to Saturday
              </p>
            </div>
          )}
        </div>
      )}

      {/* Program Scorecards: 1 Card Per Program */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#3b6fe0]" />
            <span>Department scorecards</span>
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            {scorecards.length} programs ranked by absences
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {scorecards.map((sc) => {
            const tr = sc.trend7d;
            return (
              <div
                key={sc.program}
                className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs flex flex-col justify-between space-y-3"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono">
                      {sc.program}
                    </h3>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      {sc.activeDays} active days
                    </span>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold font-mono text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    Rank #{sc.rank}
                  </span>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 py-1 border-y border-slate-100 dark:border-slate-800/80">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Absent</span>
                    <p className="text-base font-bold font-mono text-[#3b6fe0] dark:text-blue-400">
                      {sc.absent}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Late</span>
                    <p className="text-base font-bold font-mono text-[#e5484d] dark:text-rose-400">
                      {sc.late}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Bunk</span>
                    <p className="text-base font-bold font-mono text-[#f5a524] dark:text-amber-400">
                      {sc.bunk}
                    </p>
                  </div>
                </div>

                {/* Daily Avg & 7-day trend */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-slate-500 dark:text-slate-400">Avg per day:</span>
                    <strong className="text-slate-900 dark:text-slate-100">
                      {sc.avgAbsentPerDay.toFixed(1)}
                    </strong>
                  </div>

                  {/* Trend arrow */}
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">7d active trend:</span>
                    {tr.hasEnoughDays ? (
                      <span
                        className={`inline-flex items-center gap-0.5 font-bold ${
                          tr.diff > 0
                            ? "text-rose-600 dark:text-rose-400"
                            : tr.diff < 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-slate-500"
                        }`}
                      >
                        {tr.diff > 0 ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : tr.diff < 0 ? (
                          <ArrowDownRight className="h-3 w-3" />
                        ) : (
                          <Minus className="h-3 w-3" />
                        )}
                        <span>
                          {tr.last7Count} vs {tr.prev7Count}{" "}
                          ({tr.percentChange !== null ? `${tr.percentChange > 0 ? "+" : ""}${tr.percentChange.toFixed(0)}%` : ""})
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">
                        Fewer than 14 active days
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Side-by-Side Comparison of Two Programs */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <GitCompare className="h-4 w-4 text-[#3b6fe0]" />
              <span>Compare two departments</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Direct head-to-head comparison of absence patterns, totals, and daily timelines.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={progA}
              onChange={(e) => setProgA(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono font-bold text-[#3b6fe0] focus:outline-none dark:border-slate-700 dark:bg-slate-800"
            >
              {allPrograms.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <span className="text-xs font-bold text-slate-400">VS</span>
            <select
              value={progB}
              onChange={(e) => setProgB(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono font-bold text-[#8b5cf6] focus:outline-none dark:border-slate-700 dark:bg-slate-800"
            >
              {allPrograms.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Comparison stats table */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Total absent</span>
            <div className="mt-1 flex items-baseline gap-2 font-mono font-bold">
              <span className="text-[#3b6fe0] text-lg">{comparisonData.dataA.absent}</span>
              <span className="text-slate-400 text-xs">vs</span>
              <span className="text-[#8b5cf6] text-lg">{comparisonData.dataB.absent}</span>
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Avg per active day</span>
            <div className="mt-1 flex items-baseline gap-2 font-mono font-bold">
              <span className="text-[#3b6fe0] text-lg">{comparisonData.dataA.avgAbsentPerDay.toFixed(1)}</span>
              <span className="text-slate-400 text-xs">vs</span>
              <span className="text-[#8b5cf6] text-lg">{comparisonData.dataB.avgAbsentPerDay.toFixed(1)}</span>
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Total late</span>
            <div className="mt-1 flex items-baseline gap-2 font-mono font-bold">
              <span className="text-[#3b6fe0] text-lg">{comparisonData.dataA.late}</span>
              <span className="text-slate-400 text-xs">vs</span>
              <span className="text-[#8b5cf6] text-lg">{comparisonData.dataB.late}</span>
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Total bunk</span>
            <div className="mt-1 flex items-baseline gap-2 font-mono font-bold">
              <span className="text-[#3b6fe0] text-lg">{comparisonData.dataA.bunk}</span>
              <span className="text-slate-400 text-xs">vs</span>
              <span className="text-[#8b5cf6] text-lg">{comparisonData.dataB.bunk}</span>
            </div>
          </div>
        </div>

        {/* Dual charts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2">
          {/* Grouped Bar */}
          <div className="lg:col-span-5 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Totals comparison
              </span>
              <button
                type="button"
                onClick={() => downloadCanvasAsPng(compareBarCanvasRef.current, `compare_totals_${progA}_${progB}`)}
                className="inline-flex items-center gap-1 text-[11px] text-[#3b6fe0] hover:underline"
              >
                <Download className="h-3 w-3" />
                <span>PNG</span>
              </button>
            </div>
            <div className="h-52 w-full">
              <canvas ref={compareBarCanvasRef} />
            </div>
          </div>

          {/* Daily Trend Lines */}
          <div className="lg:col-span-7 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Daily trend comparison
              </span>
              <button
                type="button"
                onClick={() => downloadCanvasAsPng(compareLineCanvasRef.current, `compare_daily_${progA}_${progB}`)}
                className="inline-flex items-center gap-1 text-[11px] text-[#3b6fe0] hover:underline"
              >
                <Download className="h-3 w-3" />
                <span>PNG</span>
              </button>
            </div>
            <div className="h-52 w-full">
              <canvas ref={compareLineCanvasRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Program x Semester Grid */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Grid className="h-4 w-4 text-[#3b6fe0]" />
              <span>Department &times; Semester matrix</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Absence distribution by department and semester. Click any cell to filter the entire dashboard.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                <th className="px-3.5 py-2 font-semibold">Program</th>
                <th className="px-3.5 py-2 text-center font-semibold">First semester</th>
                <th className="px-3.5 py-2 text-center font-semibold">Third semester</th>
                <th className="px-3.5 py-2 text-center font-semibold">Fifth semester</th>
                <th className="px-3.5 py-2 text-right font-semibold">Total absent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {matrix.map((row) => {
                const getOpacity = (val: number) => {
                  if (val === 0) return 0;
                  const ratio = val / maxMatrixAbsent;
                  return Math.max(0.12, Math.min(0.9, ratio));
                };

                return (
                  <tr key={row.program} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900 dark:text-slate-100">
                      {row.program}
                    </td>

                    {/* First sem cell */}
                    <td
                      onClick={() => onSelectProgramAndSemester(row.program, "First")}
                      className="px-3.5 py-2.5 text-center cursor-pointer font-mono font-semibold transition-transform hover:scale-105"
                      style={{
                        backgroundColor: `rgba(59, 111, 224, ${getOpacity(row.first)})`,
                        color: getOpacity(row.first) > 0.5 ? "#ffffff" : isDark ? "#ffffff" : "#0f172a",
                      }}
                      title={`Click to filter by ${row.program} - First Semester`}
                    >
                      {row.first}
                    </td>

                    {/* Third sem cell */}
                    <td
                      onClick={() => onSelectProgramAndSemester(row.program, "Third")}
                      className="px-3.5 py-2.5 text-center cursor-pointer font-mono font-semibold transition-transform hover:scale-105"
                      style={{
                        backgroundColor: `rgba(139, 92, 246, ${getOpacity(row.third)})`,
                        color: getOpacity(row.third) > 0.5 ? "#ffffff" : isDark ? "#ffffff" : "#0f172a",
                      }}
                      title={`Click to filter by ${row.program} - Third Semester`}
                    >
                      {row.third}
                    </td>

                    {/* Fifth sem cell */}
                    <td
                      onClick={() => onSelectProgramAndSemester(row.program, "Fifth")}
                      className="px-3.5 py-2.5 text-center cursor-pointer font-mono font-semibold transition-transform hover:scale-105"
                      style={{
                        backgroundColor: `rgba(6, 182, 212, ${getOpacity(row.fifth)})`,
                        color: getOpacity(row.fifth) > 0.5 ? "#ffffff" : isDark ? "#ffffff" : "#0f172a",
                      }}
                      title={`Click to filter by ${row.program} - Fifth Semester`}
                    >
                      {row.fifth}
                    </td>

                    <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      {row.total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
