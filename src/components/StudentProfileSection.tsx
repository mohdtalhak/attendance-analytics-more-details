import React, { useEffect, useId, useMemo, useState } from "react";
import {
  User,
  Search,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Download,
  Info,
  Clock,
  Flame,
  Award,
} from "lucide-react";
import { AttendanceRecord, FilterState, SemesterName } from "../types";
import {
  computeStudentProfile,
  computeTopAbsentRollsScoped,
} from "../utils/analytics";
import { formatDateIndian, formatDateShortIndian } from "../utils/dateUtils";
import { exportStudentProfilePdf, exportStudentTimelineCsv } from "../utils/exportUtils";
import { Pagination } from "./Pagination";

interface StudentProfileSectionProps {
  allPrograms: string[];
  allRecords: AttendanceRecord[];
  activeDaysMap: Record<string, string[]>;
  filters: FilterState;
  initialRoll?: number | null;
  initialProgram?: string;
  initialSemester?: string;
}

const SEMESTERS: SemesterName[] = ["First", "Third", "Fifth"];

export const StudentProfileSection: React.FC<StudentProfileSectionProps> = ({
  allPrograms,
  allRecords,
  activeDaysMap,
  filters,
  initialRoll,
  initialProgram,
  initialSemester,
}) => {
  const [program, setProgram] = useState<string>(
    initialProgram || (filters.programs[0] ? filters.programs[0] : allPrograms[0] || "CO-A")
  );
  const [semester, setSemester] = useState<string>(
    initialSemester || (filters.semester !== "all" ? filters.semester : "First")
  );
  const [rollInput, setRollInput] = useState<string>(
    initialRoll ? String(initialRoll) : ""
  );
  const [threshold, setThreshold] = useState<number>(5);
  const [timelinePage, setTimelinePage] = useState<number>(1);
  const [rollsPage, setRollsPage] = useState<number>(1);
  const ROLLS_PAGE_SIZE = 10;
  const [activeTooltip, setActiveTooltip] = useState<{
    date: string;
    text: string;
  } | null>(null);

  const rollInputId = useId();
  const programSelectId = useId();
  const semesterSelectId = useId();
  const thresholdInputId = useId();

  // Reset pagination on filter or selection changes
  useEffect(() => {
    setTimelinePage(1);
    setRollsPage(1);
  }, [program, semester, rollInput]);

  // Parse roll input safely
  const parsedRoll = useMemo(() => {
    const trimmed = rollInput.trim();
    if (!trimmed) return null;
    const num = Number.parseInt(trimmed, 10);
    return Number.isNaN(num) || num <= 0 ? null : num;
  }, [rollInput]);

  // Compute student profile
  const profile = useMemo(() => {
    return computeStudentProfile(
      allRecords,
      program,
      semester,
      parsedRoll,
      activeDaysMap,
      filters.dateFrom,
      filters.dateTo
    );
  }, [
    allRecords,
    program,
    semester,
    parsedRoll,
    activeDaysMap,
    filters.dateFrom,
    filters.dateTo,
  ]);

  // All verified absent rolls scoped to program and semester
  const topRollsData = useMemo(() => {
    return computeTopAbsentRollsScoped(allRecords, program, semester, filters);
  }, [allRecords, program, semester, filters]);

  const paginatedRolls = useMemo(() => {
    const start = (rollsPage - 1) * ROLLS_PAGE_SIZE;
    return topRollsData.entries.slice(start, start + ROLLS_PAGE_SIZE);
  }, [topRollsData.entries, rollsPage]);

  const handleExportCsv = () => {
    if (!profile || !parsedRoll) return;
    const dateStamp = new Date().toISOString().split("T")[0];
    exportStudentTimelineCsv(program, semester, parsedRoll, profile.timeline, dateStamp);
  };

  const handleExportPdf = () => {
    if (!profile || !parsedRoll) return;
    const dateStamp = new Date().toISOString().split("T")[0];
    exportStudentProfilePdf(program, semester, parsedRoll, profile, dateStamp);
  };

  const hasMissingInput = !program || !semester || parsedRoll === null;

  return (
    <section
      id="student-profile-section"
      aria-label="Student attendance profile and history"
      className="space-y-6"
    >
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <User className="h-4 w-4 text-[#3b6fe0]" />
              <span>Student profile</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Verified individual student attendance lookup and calendar timeline. Rolls repeat across programs and semesters.
            </p>
          </div>

          {/* Verification note always visible */}
          <div className="text-xs text-slate-600 dark:text-slate-400 font-mono">
            {profile ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-1">
                <CheckCircle className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                <span>
                  Based on <strong>{profile.verifiedEntriesCount}</strong> verified entries in {program} ({semester} sem).
                </span>
              </span>
            ) : (
              <span className="text-slate-400">Select program, semester & roll number</span>
            )}
          </div>
        </div>

        {/* Search & Selector Bar */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-750 items-end">
          <div className="sm:col-span-4">
            <label
              htmlFor={programSelectId}
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Program <span className="text-rose-500">*</span>
            </label>
            <select
              id={programSelectId}
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {allPrograms.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-4">
            <label
              htmlFor={semesterSelectId}
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Semester <span className="text-rose-500">*</span>
            </label>
            <select
              id={semesterSelectId}
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {SEMESTERS.map((s) => (
                <option key={s} value={s}>
                  {s} Semester
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-4">
            <label
              htmlFor={rollInputId}
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Roll number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id={rollInputId}
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 14"
                value={rollInput}
                onChange={(e) => setRollInput(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-2 text-xs font-mono text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Note on data completeness */}
        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 italic">
          Based on verified entries. Roll lists are missing or inconsistent for the rest, so real numbers may be higher.
        </p>

        {/* Missing input prompt */}
        {hasMissingInput && (
          <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 py-12 text-center">
            <Info className="h-8 w-8 text-[#3b6fe0] mb-2" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Select program, semester, and enter a roll number
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 max-w-sm">
              Please choose a program and semester from the dropdowns above and enter a student roll number to view their verified timeline and streak analytics.
            </p>
          </div>
        )}

        {/* Loaded Profile Display */}
        {profile && parsedRoll !== null && (
          <div className="mt-6 space-y-6">
            {/* Top row: Summary Cards + Risk Badge */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {/* Absent */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-850">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Total absent
                </span>
                <p className="mt-1 text-2xl font-bold font-mono text-[#3b6fe0] dark:text-blue-400">
                  {profile.absent}
                </p>
                <span className="text-[10px] text-slate-400">Verified entries</span>
              </div>

              {/* Late */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-850">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Total late
                </span>
                <p className="mt-1 text-2xl font-bold font-mono text-[#e5484d] dark:text-rose-400">
                  {profile.late}
                </p>
                <span className="text-[10px] text-slate-400">Verified entries</span>
              </div>

              {/* Bunk */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-850">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Total bunk
                </span>
                <p className="mt-1 text-2xl font-bold font-mono text-[#f5a524] dark:text-amber-400">
                  {profile.bunk}
                </p>
                <span className="text-[10px] text-slate-400">Verified entries</span>
              </div>

              {/* Worst Weekday */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-850">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-slate-400" />
                  Worst weekday
                </span>
                <p className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                  {profile.worstWeekday ? profile.worstWeekday.dayName : "None"}
                </p>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  {profile.worstWeekday ? `${profile.worstWeekday.count} absences` : "No absences recorded"}
                </span>
              </div>

              {/* Date span */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-850">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-slate-400" />
                  Dates seen
                </span>
                <p className="mt-1 text-xs font-semibold font-mono text-slate-900 dark:text-slate-100">
                  {profile.firstDateSeen ? formatDateIndian(profile.firstDateSeen) : "—"}
                </p>
                <span className="text-[10px] text-slate-400 font-mono">
                  to {profile.lastDateSeen ? formatDateIndian(profile.lastDateSeen) : "—"}
                </span>
              </div>

              {/* Ranking */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-850">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Award className="h-3 w-3 text-slate-400" />
                  Ranking
                </span>
                <p className="mt-1 text-sm font-bold font-mono text-slate-900 dark:text-slate-100">
                  {profile.rank ? `Rank ${profile.rank.rank} of ${profile.rank.totalRollsWithAbsences}` : "No absences"}
                </p>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  roll numbers with verified absences
                </span>
              </div>
            </div>

            {/* Middle row: Streaks & Risk Threshold */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Streaks card */}
              <div className="md:col-span-7 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-850 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Flame className="h-4 w-4 text-[#e5484d]" />
                    <span>Absence streaks on active days</span>
                  </h3>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    Ordered college active days
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      Longest absence streak
                    </span>
                    <p className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
                      {profile.longestStreak ? `${profile.longestStreak.count} consecutive active days` : "0 days"}
                    </p>
                    {profile.longestStreak && (
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block mt-0.5">
                        {formatDateIndian(profile.longestStreak.startDate)} to {formatDateIndian(profile.longestStreak.endDate)}
                      </span>
                    )}
                  </div>

                  <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      Current streak
                    </span>
                    <p className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
                      {profile.currentStreak} active days
                    </p>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      {profile.currentStreak > 0 ? "Ending at latest active day" : "Not absent on latest active day"}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  Streaks are minimums because some roll lists are unverified.
                </p>
              </div>

              {/* Risk threshold card */}
              <div className="md:col-span-5 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-850 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-[#f5a524]" />
                      <span>Risk flag threshold</span>
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Set minimum absences to flag this student for academic follow-up.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <label htmlFor={thresholdInputId} className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    Flag at N or more absences:
                  </label>
                  <input
                    id={thresholdInputId}
                    type="number"
                    min="1"
                    max="100"
                    value={threshold}
                    onChange={(e) => {
                      const v = Number.parseInt(e.target.value, 10);
                      setThreshold(Number.isNaN(v) || v < 1 ? 1 : v);
                    }}
                    className="w-20 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-mono font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>

                {profile.absent >= threshold ? (
                  <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200 border border-rose-200 dark:border-rose-900">
                    <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span className="text-xs font-bold">
                      Above threshold ({profile.absent} absences &ge; {threshold})
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-900">
                    <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-xs font-bold">
                      Within threshold ({profile.absent} absences &lt; {threshold})
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Calendar timeline strip */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-850 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-[#3b6fe0]" />
                    <span>Active days timeline</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Hover over any active day to view date and recorded incidents.
                  </p>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <span className="h-3 w-3 rounded-sm bg-[#3b6fe0]"></span>
                    <span>Absent</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="h-3 w-3 rounded-sm bg-[#e5484d]"></span>
                    <span>Late</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="h-3 w-3 rounded-sm bg-[#f5a524]"></span>
                    <span>Bunk</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="h-3 w-3 rounded-sm bg-purple-600"></span>
                    <span>Multiple</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="h-3 w-3 rounded-sm bg-slate-200 dark:bg-slate-700"></span>
                    <span>Active / No incident</span>
                  </div>
                </div>
              </div>

              {/* Day cells grid */}
              <div className="relative">
                {activeTooltip && (
                  <div className="absolute -top-8 left-0 rounded bg-slate-900 px-2.5 py-1 text-[11px] font-mono text-white shadow-md z-20 pointer-events-none">
                    {activeTooltip.text}
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 py-2">
                  {profile.activeDaysStatus.map((d) => {
                    let bg = "bg-slate-200 hover:bg-slate-300 dark:bg-slate-750 dark:hover:bg-slate-700 text-slate-600";
                    if (d.status === "absent") bg = "bg-[#3b6fe0] hover:bg-blue-600 text-white";
                    else if (d.status === "late") bg = "bg-[#e5484d] hover:bg-rose-600 text-white";
                    else if (d.status === "bunk") bg = "bg-[#f5a524] hover:bg-amber-500 text-white";
                    else if (d.status === "multiple") bg = "bg-purple-600 hover:bg-purple-700 text-white";

                    const tooltipText = `${formatDateIndian(d.date)}: ${
                      d.status === "neutral" ? "Active (No incident)" : d.types.join(", ")
                    }`;

                    return (
                      <div
                        key={d.date}
                        onMouseEnter={() => setActiveTooltip({ date: d.date, text: tooltipText })}
                        onMouseLeave={() => setActiveTooltip(null)}
                        className={`h-7 w-7 rounded flex items-center justify-center text-[10px] font-mono font-bold cursor-pointer transition-transform hover:scale-110 ${bg}`}
                        title={tooltipText}
                      >
                        {d.date.slice(8)}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Timeline table */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-850 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Verified incident timeline ({profile.timeline.length} entries)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Chronological history of recorded absences, late entries, and bunks.
                  </p>
                </div>

                <div className="no-print flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    disabled={profile.timeline.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Export student CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#3b6fe0] px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Export student PDF</span>
                  </button>
                </div>
              </div>

              {profile.timeline.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No verified attendance incidents found for Roll {parsedRoll} in {program} ({semester} Semester).
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                          <th className="px-3 py-2 font-semibold whitespace-nowrap">Date</th>
                          <th className="px-3 py-2 font-semibold whitespace-nowrap">Type</th>
                          <th className="px-3 py-2 font-semibold whitespace-nowrap">Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {profile.timeline
                          .slice((timelinePage - 1) * 10, timelinePage * 10)
                          .map((entry, idx) => (
                            <tr
                              key={`${entry.date}-${entry.type}-${idx}`}
                              className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                            >
                              <td className="px-3 py-2 font-mono font-medium whitespace-nowrap">
                                {formatDateIndian(entry.date)}
                              </td>
                              <td className="px-3 py-2 font-semibold whitespace-nowrap capitalize">
                                <span
                                  className={
                                    entry.type === "absent"
                                      ? "text-[#3b6fe0] dark:text-blue-400"
                                      : entry.type === "late"
                                      ? "text-[#e5484d] dark:text-rose-400"
                                      : "text-[#f5a524] dark:text-amber-400"
                                  }
                                >
                                  {entry.type}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                                {entry.note || "—"}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  <Pagination
                    currentPage={timelinePage}
                    totalItems={profile.timeline.length}
                    pageSize={10}
                    onPageChange={setTimelinePage}
                    itemName="incidents"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Top Absent Rolls Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Most frequently absent roll numbers ({program} · {semester} sem)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verified roll numbers ranked by absences. Click any row to view that student&apos;s full profile.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Based on {topRollsData.verifiedCount} verified entries
          </span>
        </div>

        {topRollsData.entries.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            No verified roll numbers with absences found for {program} ({semester} sem).
          </p>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                    <th className="px-3.5 py-2 font-semibold whitespace-nowrap">Rank</th>
                    <th className="px-3.5 py-2 font-semibold whitespace-nowrap">Roll number</th>
                    <th className="px-3.5 py-2 text-right font-semibold whitespace-nowrap">Absent</th>
                    <th className="px-3.5 py-2 text-right font-semibold whitespace-nowrap">Late</th>
                    <th className="px-3.5 py-2 text-right font-semibold whitespace-nowrap">Bunk</th>
                    <th className="px-3.5 py-2 text-right font-semibold whitespace-nowrap">Total</th>
                    <th className="px-3.5 py-2 text-right font-semibold whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {paginatedRolls.map((item, idx) => (
                    <tr
                      key={item.roll}
                      onClick={() => setRollInput(String(item.roll))}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="px-3.5 py-2 font-mono text-slate-500 dark:text-slate-400">
                        #{(rollsPage - 1) * ROLLS_PAGE_SIZE + idx + 1}
                      </td>
                      <td className="px-3.5 py-2 font-mono font-bold text-slate-900 dark:text-slate-100">
                        Roll {item.roll}
                      </td>
                      <td className="px-3.5 py-2 text-right font-mono font-semibold text-[#3b6fe0] dark:text-blue-400">
                        {item.absent}
                      </td>
                      <td className="px-3.5 py-2 text-right font-mono text-[#e5484d] dark:text-rose-400">
                        {item.late}
                      </td>
                      <td className="px-3.5 py-2 text-right font-mono text-[#f5a524] dark:text-amber-400">
                        {item.bunk}
                      </td>
                      <td className="px-3.5 py-2 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {item.totalOccurrences}
                      </td>
                      <td className="px-3.5 py-2 text-right">
                        <span className="text-[11px] font-semibold text-[#3b6fe0] hover:underline">
                          View profile &rarr;
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={rollsPage}
              totalItems={topRollsData.entries.length}
              pageSize={ROLLS_PAGE_SIZE}
              onPageChange={setRollsPage}
              itemName="students"
            />
          </div>
        )}
      </div>
    </section>
  );
};
