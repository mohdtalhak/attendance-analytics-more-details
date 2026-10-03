import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Lightbulb,
  Clock,
  TrendingUp,
  Zap,
  CheckCircle,
  ChevronDown,
  Copy,
  Check,
  Calendar,
  User,
  ShieldCheck,
  Search,
} from "lucide-react";
import { InsightsAndAlertsData } from "../types";
import { formatDateIndian } from "../utils/dateUtils";
import { Pagination } from "./Pagination";

interface InsightsAlertsSectionProps {
  insightsData: InsightsAndAlertsData;
  consecutiveThreshold: number;
  onChangeConsecutiveThreshold: (n: number) => void;
  onOpenStudentProfile: (program: string, semester: string, roll: number) => void;
}

export const InsightsAlertsSection: React.FC<InsightsAlertsSectionProps> = ({
  insightsData,
  consecutiveThreshold,
  onChangeConsecutiveThreshold,
  onOpenStudentProfile,
}) => {
  // Collapsible accordion states
  const [missingOpen, setMissingOpen] = useState(true);
  const [streaksOpen, setStreaksOpen] = useState(true);
  const [warningsOpen, setWarningsOpen] = useState(true);

  // Pagination and search states
  const [streakPage, setStreakPage] = useState<number>(1);
  const [streakPageSize, setStreakPageSize] = useState<number>(10);
  const [streakSearch, setStreakSearch] = useState<string>("");
  const [missingPage, setMissingPage] = useState<number>(1);
  const [warningsPage, setWarningsPage] = useState<number>(1);

  // Copied warning index state
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyWarning = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  const {
    weekdayInsights,
    topSpikes,
    trend7dOverall,
    mostAffected,
    missingDataAlerts,
    consecutiveAbsenceAlerts,
    parsedWarnings,
    verifiedPercentage,
    totalRecords,
    verifiedRecords,
  } = insightsData;

  const filteredStreaks = useMemo(() => {
    const q = streakSearch.trim().toLowerCase();
    if (!q) return consecutiveAbsenceAlerts;
    return consecutiveAbsenceAlerts.filter((item) => {
      return (
        String(item.roll).includes(q) ||
        item.program.toLowerCase().includes(q) ||
        item.semester.toLowerCase().includes(q)
      );
    });
  }, [consecutiveAbsenceAlerts, streakSearch]);

  const paginatedStreaks = useMemo(() => {
    const start = (streakPage - 1) * streakPageSize;
    return filteredStreaks.slice(start, start + streakPageSize);
  }, [filteredStreaks, streakPage, streakPageSize]);

  const MISSING_PAGE_SIZE = 8;
  const paginatedMissing = missingDataAlerts.slice(
    (missingPage - 1) * MISSING_PAGE_SIZE,
    missingPage * MISSING_PAGE_SIZE
  );

  const WARNINGS_PAGE_SIZE = 10;
  const paginatedWarnings = parsedWarnings.slice(
    (warningsPage - 1) * WARNINGS_PAGE_SIZE,
    warningsPage * WARNINGS_PAGE_SIZE
  );

  return (
    <section id="insights-alerts" aria-label="Automated insights and alerts" className="space-y-6">
      {/* SECTION 1: AUTO-GENERATED PLAIN-LANGUAGE INSIGHTS */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-[#f5a524]" />
              <span>Automated attendance insights</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Statistically calculated patterns from the currently active filter selection.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Rules-driven analytics
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Weekday effect */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-850 space-y-2">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[#3b6fe0]" />
              <span>Weekday effect</span>
            </span>
            {weekdayInsights.length > 0 ? (
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                {weekdayInsights.map((w, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                    <span className="text-[#3b6fe0] font-bold">&bull;</span>
                    <span>
                      <strong>{w.dayName}</strong> have{" "}
                      <strong className="text-rose-600 dark:text-rose-400">{w.percentHigher}% more absences</strong>{" "}
                      than the average active day ({w.count} recorded absences).
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No weekday exceeds the overall average by 15% or more across at least 3 occurrences.
              </p>
            )}
          </div>

          {/* 2. Most affected program & semester */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-850 space-y-2">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-[#e5484d]" />
              <span>Highest attendance concentration</span>
            </span>
            {mostAffected ? (
              <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                <p>
                  <strong>{mostAffected.program} ({mostAffected.semester} semester)</strong> accounts for the largest share of absences:
                </p>
                <p className="mt-1 font-mono font-bold text-base text-[#3b6fe0] dark:text-blue-400">
                  {mostAffected.absent} absences ({mostAffected.sharePercent}% of total)
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Insufficient data to identify highest concentration.
              </p>
            )}
          </div>

          {/* 3. 7-day trend vs previous 7 */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-850 space-y-2">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-[#3b6fe0]" />
              <span>7-day overall trend</span>
            </span>
            {trend7dOverall.hasEnoughDays ? (
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                <li>
                  Absent entries:{" "}
                  <strong>
                    {trend7dOverall.absentDiff > 0
                      ? `rose from ${trend7dOverall.absentPrev7} to ${trend7dOverall.absentLast7} (+${trend7dOverall.absentDiff})`
                      : trend7dOverall.absentDiff < 0
                      ? `dropped from ${trend7dOverall.absentPrev7} to ${trend7dOverall.absentLast7} (${trend7dOverall.absentDiff})`
                      : `remained steady at ${trend7dOverall.absentLast7}`}
                  </strong>
                </li>
                <li>
                  Late arrivals:{" "}
                  <strong>
                    {trend7dOverall.lateDiff > 0
                      ? `rose from ${trend7dOverall.latePrev7} to ${trend7dOverall.lateLast7}`
                      : trend7dOverall.lateDiff < 0
                      ? `declined from ${trend7dOverall.latePrev7} to ${trend7dOverall.lateLast7}`
                      : `stayed at ${trend7dOverall.lateLast7}`}
                  </strong>
                </li>
                <li>
                  Bunk entries:{" "}
                  <strong>
                    {trend7dOverall.bunkDiff > 0
                      ? `rose from ${trend7dOverall.bunkPrev7} to ${trend7dOverall.bunkLast7}`
                      : trend7dOverall.bunkDiff < 0
                      ? `dropped from ${trend7dOverall.bunkPrev7} to ${trend7dOverall.bunkLast7}`
                      : `stable at ${trend7dOverall.bunkLast7}`}
                  </strong>
                </li>
              </ul>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Requires at least 14 active days in the filtered range to calculate full 7-day trend.
              </p>
            )}
          </div>

          {/* 4. Top spikes */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-850 space-y-2">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-[#f5a524]" />
              <span>Statistical spikes (&gt;1.5&times; normal &amp; &ge;2 std dev)</span>
            </span>
            {topSpikes.length > 0 ? (
              <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                {topSpikes.map((s, idx) => (
                  <li key={idx} className="flex items-baseline gap-1.5">
                    <span className="text-[#f5a524] font-bold">&bull;</span>
                    <span>
                      <strong>{s.program}</strong> had a spike on{" "}
                      <strong>{formatDateIndian(s.date)}</strong> ({s.multiple}&times; its normal average of {s.programAvg}/day, {s.absent} absences).
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No single department active day exceeded 1.5&times; average and 2 standard deviations.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: ALERTS */}
      <div className="space-y-4">
        {/* Verification banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/40 text-xs">
          <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              <strong>{verifiedPercentage.toFixed(1)}%</strong> of records in the current view have verified roll lists (<code className="font-mono">{verifiedRecords}</code> of <code className="font-mono">{totalRecords}</code> filtered records).
            </span>
          </div>
        </div>

        {/* Alert 1: Missing Data Alerts */}
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setMissingOpen((p) => !p)}
            className="flex w-full items-center justify-between p-4 text-left text-xs font-bold text-slate-900 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800/60"
          >
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-500 shrink-0" />
              <span>Missing data alerts</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                {missingDataAlerts.length}
              </span>
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              <span className="text-[11px] font-normal">{missingOpen ? "Collapse" : "Expand"}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${missingOpen ? "rotate-180" : ""}`} />
            </span>
          </button>

          {missingOpen && (
            <div className="border-t border-slate-200 p-4 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Dates scheduled as normal college instruction days (held by &ge;50% of programs) where a specific program has no attendance entry.
              </p>
              {missingDataAlerts.length === 0 ? (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 py-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>All scheduled programs have recorded entries for normal college days.</span>
                </p>
              ) : (
                <div className="space-y-3">
                  <ul className="space-y-1.5 font-mono text-xs">
                    {paginatedMissing.map((m, idx) => (
                      <li
                        key={idx}
                        className="flex items-center justify-between rounded bg-slate-50 px-3 py-1.5 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800"
                      >
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {m.program} has no entry for {formatDateIndian(m.date)}
                        </span>
                        <span className="text-[10px] text-slate-400">Scheduled active day</span>
                      </li>
                    ))}
                  </ul>

                  <Pagination
                    currentPage={missingPage}
                    totalItems={missingDataAlerts.length}
                    pageSize={MISSING_PAGE_SIZE}
                    onPageChange={setMissingPage}
                    itemName="alerts"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Alert 2: Consecutive Absences */}
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 gap-2 border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setStreaksOpen((p) => !p)}
              className="flex items-center gap-2 text-left text-xs font-bold text-slate-900 dark:text-slate-100"
            >
              <User className="h-4 w-4 text-[#e5484d] shrink-0" />
              <span>Consecutive absence alerts (Streak &ge; {consecutiveThreshold} days)</span>
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-mono font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                {consecutiveAbsenceAlerts.length}
              </span>
            </button>

            <div className="flex items-center gap-2">
              <label htmlFor="consec-threshold-input" className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                Minimum streak:
              </label>
              <input
                id="consec-threshold-input"
                type="number"
                min="2"
                max="30"
                value={consecutiveThreshold}
                onChange={(e) => {
                  const val = Number.parseInt(e.target.value, 10);
                  onChangeConsecutiveThreshold(Number.isNaN(val) || val < 2 ? 2 : val);
                  setStreakPage(1);
                }}
                className="w-16 rounded border border-slate-300 bg-white px-2 py-0.5 text-xs font-mono font-bold dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          {streaksOpen && (
            <div className="p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Verified students with consecutive absences on active days. Click any row to inspect full profile.
                </p>

                {consecutiveAbsenceAlerts.length > 0 && (
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="relative">
                      <Search
                        className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                        aria-hidden="true"
                      />
                      <input
                        type="text"
                        value={streakSearch}
                        onChange={(e) => {
                          setStreakSearch(e.target.value);
                          setStreakPage(1);
                        }}
                        placeholder="Search roll / program..."
                        aria-label="Filter streak students"
                        className="h-8 rounded-lg border border-slate-200 bg-white pl-8 pr-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#3b6fe0] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>

                    <select
                      value={streakPageSize}
                      onChange={(e) => {
                        setStreakPageSize(Number(e.target.value));
                        setStreakPage(1);
                      }}
                      aria-label="Streak table rows per page"
                      className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <option value={5}>5 / page</option>
                      <option value={10}>10 / page</option>
                      <option value={20}>20 / page</option>
                      <option value={50}>50 / page</option>
                    </select>
                  </div>
                )}
              </div>

              {consecutiveAbsenceAlerts.length === 0 ? (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 py-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>No students found with {consecutiveThreshold} or more consecutive active absences.</span>
                </p>
              ) : filteredStreaks.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  <p>No streak alerts match &ldquo;{streakSearch}&rdquo;</p>
                  <button
                    type="button"
                    onClick={() => {
                      setStreakSearch("");
                      setStreakPage(1);
                    }}
                    className="mt-2 text-xs font-semibold text-[#3b6fe0] hover:underline"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                          <th className="px-3 py-2 font-semibold">Student</th>
                          <th className="px-3 py-2 font-semibold">Program</th>
                          <th className="px-3 py-2 font-semibold">Semester</th>
                          <th className="px-3 py-2 text-right font-semibold">Consecutive active days</th>
                          <th className="px-3 py-2 font-semibold">Date range</th>
                          <th className="px-3 py-2 text-right font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {paginatedStreaks.map((item, idx) => (
                          <tr
                            key={`${item.program}-${item.semester}-${item.roll}-${idx}`}
                            onClick={() => onOpenStudentProfile(item.program, item.semester, item.roll)}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                          >
                            <td className="px-3 py-2 font-mono font-bold text-slate-900 dark:text-slate-100">
                              Roll {item.roll}
                            </td>
                            <td className="px-3 py-2 font-mono">{item.program}</td>
                            <td className="px-3 py-2">{item.semester}</td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-[#e5484d] dark:text-rose-400">
                              {item.streak} days
                            </td>
                            <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              {formatDateIndian(item.startDate)} to {formatDateIndian(item.endDate)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <span className="text-[11px] font-semibold text-[#3b6fe0] hover:underline">
                                Open profile &rarr;
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <Pagination
                    currentPage={streakPage}
                    totalItems={filteredStreaks.length}
                    pageSize={streakPageSize}
                    onPageChange={setStreakPage}
                    itemName="students"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Alert 3: Data Warnings Table */}
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setWarningsOpen((p) => !p)}
            className="flex w-full items-center justify-between p-4 text-left text-xs font-bold text-slate-900 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800/60"
          >
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <span>Sheet data-entry warnings ({parsedWarnings.length})</span>
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              <span className="text-[11px] font-normal">{warningsOpen ? "Collapse" : "Expand"}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${warningsOpen ? "rotate-180" : ""}`} />
            </span>
          </button>

          {warningsOpen && (
            <div className="border-t border-slate-200 p-4 dark:border-slate-800 space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Validation warnings parsed from institutional spreadsheet formulas and data-entry errors.
              </p>
              {parsedWarnings.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">No sheet warnings reported by the API.</p>
              ) : (
                <div className="space-y-3">
                  <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                          <th className="px-3.5 py-2 font-semibold">Tab</th>
                          <th className="px-3.5 py-2 font-semibold">Cell</th>
                          <th className="px-3.5 py-2 font-semibold">Problem</th>
                          <th className="px-3.5 py-2 text-right font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {paginatedWarnings.map((w, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                            <td className="px-3.5 py-2 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                              {w.tab}
                            </td>
                            <td className="px-3.5 py-2 font-mono text-[#3b6fe0] dark:text-blue-400 whitespace-nowrap">
                              {w.cell}
                            </td>
                            <td className="px-3.5 py-2 font-mono text-slate-700 dark:text-slate-300">
                              {w.problem}
                            </td>
                            <td className="px-3.5 py-2 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleCopyWarning(w.original, idx)}
                                className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                              >
                                {copiedIndex === idx ? (
                                  <>
                                    <Check className="h-3 w-3 text-emerald-600" />
                                    <span>Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <Pagination
                    currentPage={warningsPage}
                    totalItems={parsedWarnings.length}
                    pageSize={WARNINGS_PAGE_SIZE}
                    onPageChange={setWarningsPage}
                    itemName="warnings"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
