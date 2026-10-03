import {
  AttendanceApiSuccessResponse,
  AttendanceRecord,
  ConsecutiveAbsenceAlertItem,
  CumulativeTrendPoint,
  DailyTrendPoint,
  FilterState,
  FrequentRollEntry,
  HeatmapCellData,
  HeatmapMatrix,
  InsightsAndAlertsData,
  InsightSpikeItem,
  KpiMetrics,
  LeaderboardRow,
  MetricDelta,
  MissingDataAlertItem,
  MonthlyReportData,
  MonthlyWeekItem,
  OutlierDayItem,
  ParsedWarning,
  ProgramComparisonItem,
  ProgramScorecardItem,
  ProgramSemesterMatrixItem,
  SemesterBreakdownItem,
  StudentActiveDayStatus,
  StudentLookupSummary,
  StudentProfileData,
  StudentTimelineEntry,
  TermWeeksSummary,
  WeekdayPatternItem,
} from "../types";
import {
  addCalendarDays,
  computePreviousPeriodRange,
  formatDateIndian,
  formatDateShortIndian,
  getMonthDisplay,
  getMonthKey,
  getPreviousMonthKey,
  getWeekdayIndex,
  getWeekdayName,
  getWeeksForMonth,
  parseDateLocal,
  toISODateLocal,
} from "./dateUtils";

export function getEffectivePrograms(
  allPrograms: string[],
  selectedPrograms: string[]
): string[] {
  if (!selectedPrograms || selectedPrograms.length === 0) {
    return allPrograms;
  }
  const selectedSet = new Set(selectedPrograms);
  return allPrograms.filter((p) => selectedSet.has(p));
}

export function getActiveDaysForPrograms(
  activeDaysMap: Record<string, string[]>,
  programs: string[],
  dateFrom: string,
  dateTo: string,
  fallbackDates: string[] = []
): string[] {
  const dateSet = new Set<string>();

  if (activeDaysMap && Object.keys(activeDaysMap).length > 0) {
    for (const prog of programs) {
      const days = activeDaysMap[prog];
      if (Array.isArray(days)) {
        for (const d of days) {
          if ((!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo)) {
            dateSet.add(d);
          }
        }
      }
    }
  } else {
    for (const d of fallbackDates) {
      if ((!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo)) {
        dateSet.add(d);
      }
    }
  }

  return Array.from(dateSet).sort();
}

export function filterRecords(
  records: AttendanceRecord[],
  effectivePrograms: string[],
  semester: FilterState["semester"],
  type: FilterState["type"],
  dateFrom: string,
  dateTo: string
): AttendanceRecord[] {
  const progSet = new Set(effectivePrograms);

  return records.filter((r) => {
    if (!progSet.has(r.program)) return false;
    if (semester !== "all" && r.semester !== semester) return false;
    if (type !== "all" && r.type !== type) return false;
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo && r.date > dateTo) return false;
    return true;
  });
}

function buildMetricDelta(
  current: number,
  previous: number,
  hasPreviousData: boolean
): MetricDelta {
  const diff = current - previous;
  let percentChange: number | null = null;
  if (previous > 0) {
    percentChange = ((current - previous) / previous) * 100;
  } else if (previous === 0 && current === 0) {
    percentChange = 0;
  }
  return {
    current,
    previous,
    diff,
    percentChange,
    hasPreviousData,
  };
}

export function computeKpis(
  data: AttendanceApiSuccessResponse,
  filteredRecords: AttendanceRecord[],
  effectivePrograms: string[],
  activeDatesInRange: string[],
  filters: FilterState
): KpiMetrics {
  let totalAbsent = 0;
  let totalLate = 0;
  let totalBunk = 0;

  const absentByProgram = new Map<string, number>();
  const absentByDate = new Map<string, number>();

  for (const r of filteredRecords) {
    const count = Number(r.count) || 0;
    if (r.type === "absent") {
      totalAbsent += count;
      absentByProgram.set(r.program, (absentByProgram.get(r.program) || 0) + count);
      absentByDate.set(r.date, (absentByDate.get(r.date) || 0) + count);
    } else if (r.type === "late") {
      totalLate += count;
    } else if (r.type === "bunk") {
      totalBunk += count;
    }
  }

  let mostAbsentProgram: { program: string; count: number } | null = null;
  for (const [program, count] of absentByProgram.entries()) {
    if (
      count > 0 &&
      (!mostAbsentProgram ||
        count > mostAbsentProgram.count ||
        (count === mostAbsentProgram.count && program < mostAbsentProgram.program))
    ) {
      mostAbsentProgram = { program, count };
    }
  }

  let mostAbsentDay: { date: string; count: number } | null = null;
  for (const [date, count] of absentByDate.entries()) {
    if (
      count > 0 &&
      (!mostAbsentDay ||
        count > mostAbsentDay.count ||
        (count === mostAbsentDay.count && date > mostAbsentDay.date))
    ) {
      mostAbsentDay = { date, count };
    }
  }

  const activeDaysCount = activeDatesInRange.length;
  const avgAbsentPerActiveDay =
    activeDaysCount > 0 ? totalAbsent / activeDaysCount : 0;

  const allDates = data.dates || [];
  const minDatasetDate = allDates[0] || "";
  const maxDatasetDate = allDates[allDates.length - 1] || "";

  const isSubRange =
    Boolean(filters.dateFrom && filters.dateTo) &&
    (filters.datePreset !== "allTime" ||
      filters.dateFrom > minDatasetDate ||
      filters.dateTo < maxDatasetDate);

  let absentDelta: MetricDelta | null = null;
  let lateDelta: MetricDelta | null = null;
  let bunkDelta: MetricDelta | null = null;
  let avgAbsentDelta: MetricDelta | null = null;
  let comparisonDaysLength = 0;
  let prevPeriodRange: { from: string; to: string } | null = null;

  if (isSubRange) {
    const prevInfo = computePreviousPeriodRange(filters.dateFrom, filters.dateTo);
    if (prevInfo) {
      comparisonDaysLength = prevInfo.daysCount;
      prevPeriodRange = { from: prevInfo.prevFrom, to: prevInfo.prevTo };

      const prevActiveDates = getActiveDaysForPrograms(
        data.activeDays,
        effectivePrograms,
        prevInfo.prevFrom,
        prevInfo.prevTo,
        data.dates
      );
      const hasPreviousData = prevActiveDates.length > 0;

      const prevRecords = filterRecords(
        data.records,
        effectivePrograms,
        filters.semester,
        filters.type,
        prevInfo.prevFrom,
        prevInfo.prevTo
      );

      let prevAbsent = 0;
      let prevLate = 0;
      let prevBunk = 0;

      for (const r of prevRecords) {
        const count = Number(r.count) || 0;
        if (r.type === "absent") prevAbsent += count;
        else if (r.type === "late") prevLate += count;
        else if (r.type === "bunk") prevBunk += count;
      }

      const prevAvgAbsent =
        prevActiveDates.length > 0 ? prevAbsent / prevActiveDates.length : 0;

      absentDelta = buildMetricDelta(totalAbsent, prevAbsent, hasPreviousData);
      lateDelta = buildMetricDelta(totalLate, prevLate, hasPreviousData);
      bunkDelta = buildMetricDelta(totalBunk, prevBunk, hasPreviousData);
      avgAbsentDelta = buildMetricDelta(
        avgAbsentPerActiveDay,
        prevAvgAbsent,
        hasPreviousData
      );
    }
  }

  return {
    totalAbsent,
    totalLate,
    totalBunk,
    mostAbsentProgram,
    mostAbsentDay,
    activeDaysCount,
    avgAbsentPerActiveDay,
    isPeriodComparisonActive: isSubRange && prevPeriodRange !== null,
    comparisonDaysLength,
    prevPeriodRange,
    absentDelta,
    lateDelta,
    bunkDelta,
    avgAbsentDelta,
  };
}

export function computeDailyTrend(
  filteredRecords: AttendanceRecord[],
  activeDatesInRange: string[]
): DailyTrendPoint[] {
  const pointMap = new Map<string, DailyTrendPoint>();

  for (const date of activeDatesInRange) {
    pointMap.set(date, {
      date,
      label: formatDateIndian(date),
      shortLabel: formatDateShortIndian(date),
      absent: 0,
      late: 0,
      bunk: 0,
      notes: [],
    });
  }

  for (const r of filteredRecords) {
    let pt = pointMap.get(r.date);
    if (!pt) {
      pt = {
        date: r.date,
        label: formatDateIndian(r.date),
        shortLabel: formatDateShortIndian(r.date),
        absent: 0,
        late: 0,
        bunk: 0,
        notes: [],
      };
      pointMap.set(r.date, pt);
    }
    const count = Number(r.count) || 0;
    if (r.type === "absent") pt.absent += count;
    else if (r.type === "late") pt.late += count;
    else if (r.type === "bunk") pt.bunk += count;

    if (r.note && r.note.trim() !== "") {
      pt.notes.push({
        program: r.program,
        semester: r.semester,
        type: r.type,
        note: r.note.trim(),
      });
    }
  }

  return Array.from(pointMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

export function computeCumulativeTrend(
  dailyTrend: DailyTrendPoint[]
): CumulativeTrendPoint[] {
  let runningAbsent = 0;
  let runningLate = 0;
  let runningBunk = 0;

  return dailyTrend.map((pt) => {
    runningAbsent += pt.absent;
    runningLate += pt.late;
    runningBunk += pt.bunk;
    return {
      date: pt.date,
      label: pt.label,
      shortLabel: pt.shortLabel,
      cumulativeAbsent: runningAbsent,
      cumulativeLate: runningLate,
      cumulativeBunk: runningBunk,
      cumulativeTotal: runningAbsent + runningLate + runningBunk,
    };
  });
}

export function computeProgramComparison(
  filteredRecords: AttendanceRecord[],
  effectivePrograms: string[]
): ProgramComparisonItem[] {
  const map = new Map<string, ProgramComparisonItem>();
  for (const prog of effectivePrograms) {
    map.set(prog, { program: prog, absent: 0, late: 0, bunk: 0, total: 0 });
  }

  for (const r of filteredRecords) {
    const item = map.get(r.program);
    if (!item) continue;
    const count = Number(r.count) || 0;
    if (r.type === "absent") item.absent += count;
    else if (r.type === "late") item.late += count;
    else if (r.type === "bunk") item.bunk += count;
    item.total += count;
  }

  return Array.from(map.values());
}

export function computeProgramSemesterMatrix(
  filteredRecords: AttendanceRecord[],
  effectivePrograms: string[]
): ProgramSemesterMatrixItem[] {
  const map = new Map<string, ProgramSemesterMatrixItem>();
  for (const prog of effectivePrograms) {
    map.set(prog, { program: prog, first: 0, third: 0, fifth: 0, total: 0 });
  }

  for (const r of filteredRecords) {
    const item = map.get(r.program);
    if (!item) continue;
    const count = Number(r.count) || 0;
    if (r.semester === "First") item.first += count;
    else if (r.semester === "Third") item.third += count;
    else if (r.semester === "Fifth") item.fifth += count;
    item.total += count;
  }

  return Array.from(map.values());
}

export function computeOutlierDays(
  dailyTrend: DailyTrendPoint[]
): OutlierDayItem[] {
  if (dailyTrend.length === 0) return [];
  const total = dailyTrend.reduce((acc, p) => acc + p.absent, 0);
  const avg = total / dailyTrend.length;

  return dailyTrend.map((pt) => {
    const deviation = pt.absent - avg;
    return {
      date: pt.date,
      label: pt.label,
      absent: pt.absent,
      average: avg,
      deviation,
      isSurge: pt.absent > avg * 1.4 && pt.absent > 10,
    };
  });
}

export function computeSemesterBreakdown(
  filteredRecords: AttendanceRecord[]
): SemesterBreakdownItem[] {
  const canonicalSemesters = ["First", "Third", "Fifth"];
  const map = new Map<string, SemesterBreakdownItem>();

  for (const sem of canonicalSemesters) {
    map.set(sem, { semester: sem, absent: 0, late: 0, bunk: 0, total: 0 });
  }

  for (const r of filteredRecords) {
    let item = map.get(r.semester);
    if (!item) {
      item = { semester: r.semester, absent: 0, late: 0, bunk: 0, total: 0 };
      map.set(r.semester, item);
    }
    const count = Number(r.count) || 0;
    if (r.type === "absent") item.absent += count;
    else if (r.type === "late") item.late += count;
    else if (r.type === "bunk") item.bunk += count;
    item.total += count;
  }

  return Array.from(map.values());
}

export function computeWeekdayPattern(
  filteredRecords: AttendanceRecord[]
): WeekdayPatternItem[] {
  const weekdays: Array<{ index: number; name: string; short: string }> = [
    { index: 1, name: "Monday", short: "Mon" },
    { index: 2, name: "Tuesday", short: "Tue" },
    { index: 3, name: "Wednesday", short: "Wed" },
    { index: 4, name: "Thursday", short: "Thu" },
    { index: 5, name: "Friday", short: "Fri" },
    { index: 6, name: "Saturday", short: "Sat" },
  ];

  const map = new Map<number, WeekdayPatternItem>();
  for (const w of weekdays) {
    map.set(w.index, {
      dayIndex: w.index,
      dayName: w.name,
      shortName: w.short,
      absent: 0,
      late: 0,
      bunk: 0,
      total: 0,
    });
  }

  for (const r of filteredRecords) {
    const dt = parseDateLocal(r.date);
    if (Number.isNaN(dt.getTime())) continue;
    const dayIdx = dt.getDay();
    let item = map.get(dayIdx);
    if (!item && dayIdx === 0) {
      item = {
        dayIndex: 0,
        dayName: "Sunday",
        shortName: "Sun",
        absent: 0,
        late: 0,
        bunk: 0,
        total: 0,
      };
      map.set(0, item);
    }
    if (!item) continue;

    const count = Number(r.count) || 0;
    if (r.type === "absent") item.absent += count;
    else if (r.type === "late") item.late += count;
    else if (r.type === "bunk") item.bunk += count;
    item.total += count;
  }

  return Array.from(map.values());
}

export function computeHeatmapData(
  filteredRecords: AttendanceRecord[],
  effectivePrograms: string[],
  activeDatesInRange: string[],
  activeDaysMap: Record<string, string[]>
): HeatmapMatrix {
  const cells: Record<string, Record<string, HeatmapCellData>> = {};
  let maxAbsent = 0;

  for (const prog of effectivePrograms) {
    cells[prog] = {};
    const progActiveSet = new Set(activeDaysMap?.[prog] || []);
    for (const date of activeDatesInRange) {
      cells[prog][date] = {
        program: prog,
        date,
        absent: 0,
        late: 0,
        bunk: 0,
        isActiveDay: progActiveSet.has(date),
        notes: [],
      };
    }
  }

  for (const r of filteredRecords) {
    if (!cells[r.program] || !cells[r.program][r.date]) continue;
    const cell = cells[r.program][r.date];
    const count = Number(r.count) || 0;
    if (r.type === "absent") {
      cell.absent += count;
      if (cell.absent > maxAbsent) {
        maxAbsent = cell.absent;
      }
    } else if (r.type === "late") {
      cell.late += count;
    } else if (r.type === "bunk") {
      cell.bunk += count;
    }
    if (r.note && r.note.trim() !== "") {
      cell.notes.push(`${r.semester} (${r.type}): ${r.note.trim()}`);
    }
  }

  return {
    programs: effectivePrograms,
    dates: activeDatesInRange,
    cells,
    maxAbsent,
  };
}

export function computeLeaderboard(
  filteredRecords: AttendanceRecord[],
  effectivePrograms: string[],
  activeDaysMap: Record<string, string[]>,
  dateFrom: string,
  dateTo: string
): LeaderboardRow[] {
  const rowsMap = new Map<string, LeaderboardRow>();

  for (const prog of effectivePrograms) {
    const progDays = (activeDaysMap?.[prog] || []).filter(
      (d) => (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo)
    );
    rowsMap.set(prog, {
      program: prog,
      absent: 0,
      late: 0,
      bunk: 0,
      activeDays: progDays.length,
      avgAbsentPerDay: 0,
    });
  }

  for (const r of filteredRecords) {
    const row = rowsMap.get(r.program);
    if (!row) continue;
    const count = Number(r.count) || 0;
    if (r.type === "absent") row.absent += count;
    else if (r.type === "late") row.late += count;
    else if (r.type === "bunk") row.bunk += count;
  }

  const result: LeaderboardRow[] = [];
  for (const row of rowsMap.values()) {
    row.avgAbsentPerDay =
      row.activeDays > 0 ? row.absent / row.activeDays : 0;
    result.push(row);
  }

  return result;
}

export function computeStudentLookup(
  allRecords: AttendanceRecord[],
  program: string,
  rollNumber: number | null,
  filters: FilterState
): StudentLookupSummary {
  const programRecordsInFilter = allRecords.filter((r) => {
    if (r.program !== program) return false;
    if (filters.semester !== "all" && r.semester !== filters.semester)
      return false;
    if (filters.type !== "all" && r.type !== filters.type) return false;
    if (filters.dateFrom && r.date < filters.dateFrom) return false;
    if (filters.dateTo && r.date > filters.dateTo) return false;
    return true;
  });

  const verifiedRecords = programRecordsInFilter.filter(
    (r) => r.rollsOk === true && Array.isArray(r.rolls)
  );

  if (rollNumber === null || Number.isNaN(rollNumber) || rollNumber <= 0) {
    return {
      program,
      roll: 0,
      absent: 0,
      late: 0,
      bunk: 0,
      timeline: [],
      verifiedProgramRecordsCount: verifiedRecords.length,
      totalProgramRecordsCount: programRecordsInFilter.length,
    };
  }

  let absent = 0;
  let late = 0;
  let bunk = 0;
  const timeline: StudentTimelineEntry[] = [];

  for (const r of verifiedRecords) {
    const matches = r.rolls.filter((num) => Number(num) === rollNumber).length;
    if (matches > 0) {
      if (r.type === "absent") absent += matches;
      else if (r.type === "late") late += matches;
      else if (r.type === "bunk") bunk += matches;

      timeline.push({
        date: r.date,
        semester: r.semester,
        type: r.type,
        note: r.note ? r.note.trim() : "",
      });
    }
  }

  timeline.sort((a, b) => {
    const dateCmp = b.date.localeCompare(a.date);
    if (dateCmp !== 0) return dateCmp;
    return a.semester.localeCompare(b.semester);
  });

  return {
    program,
    roll: rollNumber,
    absent,
    late,
    bunk,
    timeline,
    verifiedProgramRecordsCount: verifiedRecords.length,
    totalProgramRecordsCount: programRecordsInFilter.length,
  };
}

export function computeTopAbsentRolls(
  allRecords: AttendanceRecord[],
  program: string,
  filters: FilterState,
  limit = 10
): {
  entries: FrequentRollEntry[];
  verifiedCount: number;
  totalCount: number;
} {
  const programRecordsInFilter = allRecords.filter((r) => {
    if (r.program !== program) return false;
    if (filters.semester !== "all" && r.semester !== filters.semester)
      return false;
    if (filters.type !== "all" && r.type !== filters.type) return false;
    if (filters.dateFrom && r.date < filters.dateFrom) return false;
    if (filters.dateTo && r.date > filters.dateTo) return false;
    return true;
  });

  const verifiedRecords = programRecordsInFilter.filter(
    (r) => r.rollsOk === true && Array.isArray(r.rolls)
  );

  const rollMap = new Map<
    number,
    {
      roll: number;
      semesters: Set<string>;
      absent: number;
      late: number;
      bunk: number;
      totalOccurrences: number;
    }
  >();

  for (const r of verifiedRecords) {
    for (const rawRoll of r.rolls) {
      const roll = Number(rawRoll);
      if (Number.isNaN(roll) || roll <= 0) continue;

      let entry = rollMap.get(roll);
      if (!entry) {
        entry = {
          roll,
          semesters: new Set<string>(),
          absent: 0,
          late: 0,
          bunk: 0,
          totalOccurrences: 0,
        };
        rollMap.set(roll, entry);
      }

      entry.semesters.add(r.semester);
      if (r.type === "absent") entry.absent += 1;
      else if (r.type === "late") entry.late += 1;
      else if (r.type === "bunk") entry.bunk += 1;
      entry.totalOccurrences += 1;
    }
  }

  const allEntries: FrequentRollEntry[] = Array.from(rollMap.values()).map(
    (item) => ({
      roll: item.roll,
      program,
      semesters: Array.from(item.semesters),
      absent: item.absent,
      late: item.late,
      bunk: item.bunk,
      totalOccurrences: item.totalOccurrences,
    })
  );

  const relevantEntries =
    filters.type === "late"
      ? allEntries.filter((e) => e.late > 0)
      : filters.type === "bunk"
      ? allEntries.filter((e) => e.bunk > 0)
      : allEntries.filter((e) => e.absent > 0);

  relevantEntries.sort((a, b) => {
    if (b.absent !== a.absent) return b.absent - a.absent;
    if (b.totalOccurrences !== a.totalOccurrences)
      return b.totalOccurrences - a.totalOccurrences;
    return a.roll - b.roll;
  });

  return {
    entries: relevantEntries.slice(0, limit),
    verifiedCount: verifiedRecords.length,
    totalCount: programRecordsInFilter.length,
  };
}

export function computeDataQuality(
  filteredRecords: AttendanceRecord[],
  effectivePrograms: string[]
) {
  const totalRecords = filteredRecords.length;
  const verifiedRecords = filteredRecords.filter((r) => r.rollsOk === true).length;
  const unverifiedRecords = totalRecords - verifiedRecords;
  const verifiedPercentage =
    totalRecords > 0 ? (verifiedRecords / totalRecords) * 100 : 100;

  const byProgram = effectivePrograms.map((prog) => {
    const progRecs = filteredRecords.filter((r) => r.program === prog);
    const progVerified = progRecs.filter((r) => r.rollsOk === true).length;
    const pct =
      progRecs.length > 0 ? (progVerified / progRecs.length) * 100 : 100;
    return {
      program: prog,
      total: progRecs.length,
      verified: progVerified,
      unverified: progRecs.length - progVerified,
      percentage: pct,
    };
  });

  const recordsWithNotes = filteredRecords
    .filter((r) => r.note && r.note.trim() !== "")
    .sort((a, b) => b.date.localeCompare(a.date));

  return {
    totalRecords,
    verifiedRecords,
    unverifiedRecords,
    verifiedPercentage,
    byProgram,
    recordsWithNotes,
  };
}

/**
 * Computes individual student profile strictly scoped to (program, semester, roll).
 * Uses ONLY verified records (rollsOk === true).
 */
export function computeStudentProfile(
  allRecords: AttendanceRecord[],
  program: string,
  semester: string,
  rollNumber: number | null,
  activeDaysMap: Record<string, string[]>,
  dateFrom: string = "",
  dateTo: string = ""
): StudentProfileData | null {
  if (!program || !semester || !rollNumber || rollNumber <= 0) {
    return null;
  }

  // Filter records strictly by program & semester & verified (rollsOk === true)
  const programSemesterVerifiedRecords = allRecords.filter((r) => {
    if (r.program !== program) return false;
    if (r.semester !== semester) return false;
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo && r.date > dateTo) return false;
    return r.rollsOk === true && Array.isArray(r.rolls);
  });

  const totalVerifiedCount = programSemesterVerifiedRecords.length;

  let absent = 0;
  let late = 0;
  let bunk = 0;
  const timeline: StudentTimelineEntry[] = [];
  const datesSeen = new Set<string>();
  const absentDatesSet = new Set<string>();
  const lateDatesSet = new Set<string>();
  const bunkDatesSet = new Set<string>();
  const absentWeekdayCounts = new Map<number, number>();

  for (const r of programSemesterVerifiedRecords) {
    const matches = r.rolls.filter((num) => Number(num) === rollNumber).length;
    if (matches > 0) {
      datesSeen.add(r.date);
      if (r.type === "absent") {
        absent += matches;
        absentDatesSet.add(r.date);
        const dayIdx = getWeekdayIndex(r.date);
        if (dayIdx >= 1 && dayIdx <= 6) {
          absentWeekdayCounts.set(dayIdx, (absentWeekdayCounts.get(dayIdx) || 0) + matches);
        }
      } else if (r.type === "late") {
        late += matches;
        lateDatesSet.add(r.date);
      } else if (r.type === "bunk") {
        bunk += matches;
        bunkDatesSet.add(r.date);
      }

      timeline.push({
        date: r.date,
        semester: r.semester,
        type: r.type,
        note: r.note ? r.note.trim() : "",
      });
    }
  }

  // Sort timeline newest first
  timeline.sort((a, b) => b.date.localeCompare(a.date));

  // First and last date seen
  const sortedDatesSeen = Array.from(datesSeen).sort();
  const firstDateSeen = sortedDatesSeen.length > 0 ? sortedDatesSeen[0] : null;
  const lastDateSeen = sortedDatesSeen.length > 0 ? sortedDatesSeen[sortedDatesSeen.length - 1] : null;

  // Worst weekday for student (Mon to Sat: 1 to 6)
  let worstWeekday: { dayIndex: number; dayName: string; count: number } | null = null;
  for (let d = 1; d <= 6; d++) {
    const count = absentWeekdayCounts.get(d) || 0;
    if (count > 0 && (!worstWeekday || count > worstWeekday.count)) {
      const dtSample = new Date(2026, 7, 2 + d); // 2026-08-03 is Monday (d=1)
      worstWeekday = {
        dayIndex: d,
        dayName: dtSample.toLocaleDateString("en-US", { weekday: "long" }),
        count,
      };
    }
  }

  // Active days sequence for this program
  const rawActiveDays = activeDaysMap[program] || [];
  const programActiveDays = rawActiveDays
    .filter((d) => (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo))
    .sort();

  // Streaks: consecutive active days on which the student has a verified ABSENT entry
  let longestStreak: { count: number; startDate: string; endDate: string } | null = null;
  let currentRun = 0;
  let currentRunStart = "";

  for (let i = 0; i < programActiveDays.length; i++) {
    const day = programActiveDays[i];
    if (absentDatesSet.has(day)) {
      if (currentRun === 0) {
        currentRun = 1;
        currentRunStart = day;
      } else {
        currentRun += 1;
      }
      if (!longestStreak || currentRun > longestStreak.count) {
        longestStreak = {
          count: currentRun,
          startDate: currentRunStart,
          endDate: day,
        };
      }
    } else {
      currentRun = 0;
      currentRunStart = "";
    }
  }

  // Current streak: ending at the latest active day of that program
  let currentStreak = 0;
  for (let i = programActiveDays.length - 1; i >= 0; i--) {
    const day = programActiveDays[i];
    if (absentDatesSet.has(day)) {
      currentStreak += 1;
    } else {
      break;
    }
  }

  // Ranking among verified roll numbers with absences in this program and semester
  const rollAbsentMap = new Map<number, number>();
  for (const r of programSemesterVerifiedRecords) {
    if (r.type === "absent") {
      for (const num of r.rolls) {
        const n = Number(num);
        if (!Number.isNaN(n) && n > 0) {
          rollAbsentMap.set(n, (rollAbsentMap.get(n) || 0) + 1);
        }
      }
    }
  }

  const rollsWithAbsences = Array.from(rollAbsentMap.entries()).filter(([, cnt]) => cnt > 0);
  rollsWithAbsences.sort((a, b) => b[1] - a[1]);

  let rank: { rank: number; totalRollsWithAbsences: number } | null = null;
  if (rollsWithAbsences.length > 0) {
    const foundIdx = rollsWithAbsences.findIndex(([r]) => r === rollNumber);
    if (foundIdx !== -1) {
      rank = {
        rank: foundIdx + 1,
        totalRollsWithAbsences: rollsWithAbsences.length,
      };
    } else {
      rank = {
        rank: rollsWithAbsences.length + 1,
        totalRollsWithAbsences: rollsWithAbsences.length,
      };
    }
  }

  // Calendar active days status list
  const activeDaysStatus: StudentActiveDayStatus[] = programActiveDays.map((day) => {
    const types: string[] = [];
    if (absentDatesSet.has(day)) types.push("absent");
    if (lateDatesSet.has(day)) types.push("late");
    if (bunkDatesSet.has(day)) types.push("bunk");

    let status: StudentActiveDayStatus["status"] = "neutral";
    if (types.length > 1) {
      status = "multiple";
    } else if (types.length === 1) {
      status = types[0] as StudentActiveDayStatus["status"];
    }

    return {
      date: day,
      status,
      types,
      count: types.length,
    };
  });

  return {
    program,
    semester,
    roll: rollNumber,
    absent,
    late,
    bunk,
    firstDateSeen,
    lastDateSeen,
    verifiedEntriesCount: totalVerifiedCount,
    totalProgramSemesterVerifiedRecords: totalVerifiedCount,
    worstWeekday,
    longestStreak,
    currentStreak,
    rank,
    timeline,
    activeDaysStatus,
  };
}

/**
 * Top absent roll numbers scoped to BOTH program AND semester.
 */
export function computeTopAbsentRollsScoped(
  allRecords: AttendanceRecord[],
  program: string,
  semester: string,
  filters: FilterState,
  limit?: number
): {
  entries: FrequentRollEntry[];
  verifiedCount: number;
  totalCount: number;
} {
  const scopedRecords = allRecords.filter((r) => {
    if (r.program !== program) return false;
    if (semester !== "all" && r.semester !== semester) return false;
    if (filters.type !== "all" && r.type !== filters.type) return false;
    if (filters.dateFrom && r.date < filters.dateFrom) return false;
    if (filters.dateTo && r.date > filters.dateTo) return false;
    return true;
  });

  const verifiedRecords = scopedRecords.filter(
    (r) => r.rollsOk === true && Array.isArray(r.rolls)
  );

  const rollMap = new Map<
    number,
    {
      roll: number;
      semesters: Set<string>;
      absent: number;
      late: number;
      bunk: number;
      totalOccurrences: number;
    }
  >();

  for (const r of verifiedRecords) {
    for (const rawRoll of r.rolls) {
      const roll = Number(rawRoll);
      if (Number.isNaN(roll) || roll <= 0) continue;

      let entry = rollMap.get(roll);
      if (!entry) {
        entry = {
          roll,
          semesters: new Set<string>(),
          absent: 0,
          late: 0,
          bunk: 0,
          totalOccurrences: 0,
        };
        rollMap.set(roll, entry);
      }

      entry.semesters.add(r.semester);
      if (r.type === "absent") entry.absent += 1;
      else if (r.type === "late") entry.late += 1;
      else if (r.type === "bunk") entry.bunk += 1;
      entry.totalOccurrences += 1;
    }
  }

  const allEntries: FrequentRollEntry[] = Array.from(rollMap.values()).map((item) => ({
    roll: item.roll,
    program,
    semesters: Array.from(item.semesters),
    absent: item.absent,
    late: item.late,
    bunk: item.bunk,
    totalOccurrences: item.totalOccurrences,
  }));

  const relevantEntries =
    filters.type === "late"
      ? allEntries.filter((e) => e.late > 0)
      : filters.type === "bunk"
      ? allEntries.filter((e) => e.bunk > 0)
      : allEntries.filter((e) => e.absent > 0);

  relevantEntries.sort((a, b) => {
    if (b.absent !== a.absent) return b.absent - a.absent;
    if (b.totalOccurrences !== a.totalOccurrences)
      return b.totalOccurrences - a.totalOccurrences;
    return a.roll - b.roll;
  });

  return {
    entries: limit && limit > 0 ? relevantEntries.slice(0, limit) : relevantEntries,
    verifiedCount: verifiedRecords.length,
    totalCount: scopedRecords.length,
  };
}

/**
 * Computes monthly report data for Part 2.
 */
export function computeMonthlyReport(
  allRecords: AttendanceRecord[],
  allDates: string[],
  activeDaysMap: Record<string, string[]>,
  selectedMonthParam: string,
  effectivePrograms: string[],
  semesterFilter: FilterState["semester"]
): MonthlyReportData {
  // Extract unique months from all dates in data (e.g. "2026-08")
  const monthsSet = new Set<string>();
  for (const d of allDates) {
    const m = getMonthKey(d);
    if (m) monthsSet.add(m);
  }
  const availableMonths = Array.from(monthsSet)
    .sort()
    .reverse()
    .map((m) => ({
      value: m,
      label: getMonthDisplay(m),
    }));

  const selectedMonth =
    selectedMonthParam && monthsSet.has(selectedMonthParam)
      ? selectedMonthParam
      : availableMonths[0]?.value || "";

  const monthLabel = getMonthDisplay(selectedMonth);

  // Filter records for this month
  const monthRecords = allRecords.filter((r) => {
    if (!r.date.startsWith(selectedMonth)) return false;
    if (!effectivePrograms.includes(r.program)) return false;
    if (semesterFilter !== "all" && r.semester !== semesterFilter) return false;
    return true;
  });

  // Active days in this month for effective programs
  const activeDaysInMonthSet = new Set<string>();
  for (const prog of effectivePrograms) {
    const days = activeDaysMap[prog] || [];
    for (const d of days) {
      if (d.startsWith(selectedMonth)) {
        activeDaysInMonthSet.add(d);
      }
    }
  }
  const activeDaysInMonth = Array.from(activeDaysInMonthSet).sort();
  const activeDaysCount = activeDaysInMonth.length;

  let totalAbsent = 0;
  let totalLate = 0;
  let totalBunk = 0;
  const absentByDay = new Map<string, number>();
  const absentByProgram = new Map<string, number>();
  const absentByWeekday = new Map<number, number>();

  for (const r of monthRecords) {
    const c = Number(r.count) || 0;
    if (r.type === "absent") {
      totalAbsent += c;
      absentByDay.set(r.date, (absentByDay.get(r.date) || 0) + c);
      absentByProgram.set(r.program, (absentByProgram.get(r.program) || 0) + c);
      const wIdx = getWeekdayIndex(r.date);
      if (wIdx >= 1 && wIdx <= 6) {
        absentByWeekday.set(wIdx, (absentByWeekday.get(wIdx) || 0) + c);
      }
    } else if (r.type === "late") {
      totalLate += c;
    } else if (r.type === "bunk") {
      totalBunk += c;
    }
  }

  const avgAbsentPerDay = activeDaysCount > 0 ? totalAbsent / activeDaysCount : 0;

  // Worst day
  let worstDay: { date: string; absent: number } | null = null;
  for (const [date, cnt] of absentByDay.entries()) {
    if (!worstDay || cnt > worstDay.absent) {
      worstDay = { date, absent: cnt };
    }
  }

  // Worst program
  let worstProgram: { program: string; absent: number } | null = null;
  for (const [prog, cnt] of absentByProgram.entries()) {
    if (!worstProgram || cnt > worstProgram.absent) {
      worstProgram = { program: prog, absent: cnt };
    }
  }

  // Worst weekday
  let worstWeekday: { dayName: string; absent: number } | null = null;
  for (let d = 1; d <= 6; d++) {
    const cnt = absentByWeekday.get(d) || 0;
    if (cnt > 0 && (!worstWeekday || cnt > worstWeekday.absent)) {
      const dt = new Date(2026, 7, 2 + d);
      worstWeekday = {
        dayName: dt.toLocaleDateString("en-US", { weekday: "long" }),
        absent: cnt,
      };
    }
  }

  // Check if month in progress (latest date in entire dataset < last calendar day of this month)
  const maxDatasetDate = allDates[allDates.length - 1] || "";
  let isMonthInProgress = false;
  if (selectedMonth && maxDatasetDate) {
    const [yStr, mStr] = selectedMonth.split("-");
    const y = Number.parseInt(yStr, 10);
    const m = Number.parseInt(mStr, 10);
    const lastDayOfMonth = new Date(y, m, 0).getDate();
    const lastDateStr = `${selectedMonth}-${String(lastDayOfMonth).padStart(2, "0")}`;
    if (maxDatasetDate.startsWith(selectedMonth) && maxDatasetDate < lastDateStr) {
      isMonthInProgress = true;
    }
  }

  // Comparison with previous month
  const prevMonthKey = getPreviousMonthKey(selectedMonth);
  let prevMonthComparison: MonthlyReportData["prevMonthComparison"] = null;

  if (prevMonthKey && monthsSet.has(prevMonthKey)) {
    const prevRecords = allRecords.filter((r) => {
      if (!r.date.startsWith(prevMonthKey)) return false;
      if (!effectivePrograms.includes(r.program)) return false;
      if (semesterFilter !== "all" && r.semester !== semesterFilter) return false;
      return r.type === "absent";
    });

    const prevActiveDaysSet = new Set<string>();
    for (const prog of effectivePrograms) {
      const days = activeDaysMap[prog] || [];
      for (const d of days) {
        if (d.startsWith(prevMonthKey)) {
          prevActiveDaysSet.add(d);
        }
      }
    }
    const prevActiveDays = prevActiveDaysSet.size;

    let prevAbsent = 0;
    for (const r of prevRecords) {
      prevAbsent += Number(r.count) || 0;
    }

    const absentDiff = totalAbsent - prevAbsent;
    let absentPercentChange: number | null = null;
    if (prevAbsent > 0) {
      absentPercentChange = (absentDiff / prevAbsent) * 100;
    }

    const prevAvgAbsentPerDay = prevActiveDays > 0 ? prevAbsent / prevActiveDays : 0;
    const avgAbsentDiff = avgAbsentPerDay - prevAvgAbsentPerDay;
    let avgAbsentPercentChange: number | null = null;
    if (prevAvgAbsentPerDay > 0) {
      avgAbsentPercentChange = (avgAbsentDiff / prevAvgAbsentPerDay) * 100;
    }

    prevMonthComparison = {
      prevMonth: prevMonthKey,
      prevMonthLabel: getMonthDisplay(prevMonthKey),
      prevAbsent,
      absentDiff,
      absentPercentChange,
      prevActiveDays,
      prevAvgAbsentPerDay,
      avgAbsentDiff,
      avgAbsentPercentChange,
      hasPrevData: true,
    };
  }

  // Week-by-week breakdown (Monday to Sunday)
  const monthWeeks = getWeeksForMonth(selectedMonth);
  const weeklyBreakdown: MonthlyWeekItem[] = monthWeeks.map((w) => {
    let wAbsent = 0;
    let wLate = 0;
    let wBunk = 0;
    const weekActiveDaysSet = new Set<string>();

    for (const d of activeDaysInMonth) {
      if (d >= w.startDate && d <= w.endDate) {
        weekActiveDaysSet.add(d);
      }
    }

    for (const r of monthRecords) {
      if (r.date >= w.startDate && r.date <= w.endDate) {
        const c = Number(r.count) || 0;
        if (r.type === "absent") wAbsent += c;
        else if (r.type === "late") wLate += c;
        else if (r.type === "bunk") wBunk += c;
      }
    }

    return {
      weekIndex: w.weekIndex,
      startDate: w.startDate,
      endDate: w.endDate,
      label: w.label,
      absent: wAbsent,
      late: wLate,
      bunk: wBunk,
      activeDays: weekActiveDaysSet.size,
    };
  });

  // Daily trend points for this month
  const dailyTrend = computeDailyTrend(monthRecords, activeDaysInMonth);

  // Program comparison for this month
  const programBreakdown = computeProgramComparison(monthRecords, effectivePrograms);

  // Top 10 roll numbers for this month
  const verifiedMonthRecords = monthRecords.filter((r) => r.rollsOk === true && Array.isArray(r.rolls));
  const monthRollMap = new Map<
    string,
    {
      roll: number;
      program: string;
      semesters: Set<string>;
      absent: number;
      late: number;
      bunk: number;
      totalOccurrences: number;
    }
  >();

  for (const r of verifiedMonthRecords) {
    for (const rawRoll of r.rolls) {
      const roll = Number(rawRoll);
      if (Number.isNaN(roll) || roll <= 0) continue;
      const key = `${r.program}-${r.semester}-${roll}`;
      let entry = monthRollMap.get(key);
      if (!entry) {
        entry = {
          roll,
          program: r.program,
          semesters: new Set<string>(),
          absent: 0,
          late: 0,
          bunk: 0,
          totalOccurrences: 0,
        };
        monthRollMap.set(key, entry);
      }
      entry.semesters.add(r.semester);
      if (r.type === "absent") entry.absent += 1;
      else if (r.type === "late") entry.late += 1;
      else if (r.type === "bunk") entry.bunk += 1;
      entry.totalOccurrences += 1;
    }
  }

  const topRolls = Array.from(monthRollMap.values())
    .filter((e) => e.absent > 0)
    .sort((a, b) => b.absent - a.absent)
    .slice(0, 10)
    .map((e) => ({
      roll: e.roll,
      program: e.program,
      semesters: Array.from(e.semesters),
      absent: e.absent,
      late: e.late,
      bunk: e.bunk,
      totalOccurrences: e.totalOccurrences,
    }));

  return {
    availableMonths,
    selectedMonth,
    monthLabel,
    isMonthInProgress,
    totalAbsent,
    totalLate,
    totalBunk,
    activeDaysCount,
    avgAbsentPerDay,
    worstDay,
    worstProgram,
    worstWeekday,
    prevMonthComparison,
    weeklyBreakdown,
    dailyTrend,
    programBreakdown,
    topRolls,
  };
}

/**
 * Computes individual program scorecards, ranks, and 7-day trend.
 */
export function computeProgramScorecards(
  filteredRecords: AttendanceRecord[],
  effectivePrograms: string[],
  activeDaysMap: Record<string, string[]>,
  dateFrom: string,
  dateTo: string
): ProgramScorecardItem[] {
  const items: ProgramScorecardItem[] = [];

  for (const prog of effectivePrograms) {
    const progRecords = filteredRecords.filter((r) => r.program === prog);
    const rawDays = activeDaysMap[prog] || [];
    const progActiveDays = rawDays
      .filter((d) => (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo))
      .sort();

    let absent = 0;
    let late = 0;
    let bunk = 0;

    for (const r of progRecords) {
      const c = Number(r.count) || 0;
      if (r.type === "absent") absent += c;
      else if (r.type === "late") late += c;
      else if (r.type === "bunk") bunk += c;
    }

    const activeDaysCount = progActiveDays.length;
    const avgAbsentPerDay = activeDaysCount > 0 ? absent / activeDaysCount : 0;

    // Trend: last 7 active days vs previous 7 active days of that program
    let last7Count = 0;
    let prev7Count = 0;
    const hasEnoughDays = progActiveDays.length >= 14;

    const last7Days = progActiveDays.slice(-7);
    const prev7Days = progActiveDays.slice(-14, -7);

    for (const r of progRecords) {
      if (r.type === "absent") {
        const c = Number(r.count) || 0;
        if (last7Days.includes(r.date)) {
          last7Count += c;
        } else if (prev7Days.includes(r.date)) {
          prev7Count += c;
        }
      }
    }

    const diff = last7Count - prev7Count;
    let percentChange: number | null = null;
    if (prev7Count > 0) {
      percentChange = (diff / prev7Count) * 100;
    } else if (prev7Count === 0 && last7Count === 0) {
      percentChange = 0;
    }

    items.push({
      program: prog,
      absent,
      late,
      bunk,
      activeDays: activeDaysCount,
      avgAbsentPerDay,
      rank: 0,
      trend7d: {
        last7Count,
        prev7Count,
        diff,
        percentChange,
        hasEnoughDays,
        last7DatesCount: last7Days.length,
        prev7DatesCount: prev7Days.length,
      },
    });
  }

  // Rank by absences descending
  items.sort((a, b) => b.absent - a.absent);
  items.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  return items;
}

/**
 * Computes best and worst complete Monday to Saturday weeks of the term.
 */
export function computeTermWeeks(
  filteredRecords: AttendanceRecord[],
  activeDatesInRange: string[]
): TermWeeksSummary {
  if (!activeDatesInRange || activeDatesInRange.length < 6) {
    return { bestWeek: null, worstWeek: null };
  }

  const minDate = activeDatesInRange[0];
  const maxDate = activeDatesInRange[activeDatesInRange.length - 1];

  // Group absences by date
  const absentByDate = new Map<string, number>();
  for (const r of filteredRecords) {
    if (r.type === "absent") {
      absentByDate.set(r.date, (absentByDate.get(r.date) || 0) + (Number(r.count) || 0));
    }
  }

  // Iterate calendar days to find complete Monday-Saturday weeks
  const dtCurrent = parseDateLocal(minDate);
  // Advance to first Monday
  while (dtCurrent.getDay() !== 1 && toISODateLocal(dtCurrent) <= maxDate) {
    dtCurrent.setDate(dtCurrent.getDate() + 1);
  }

  const completeWeeks: Array<{
    startDate: string;
    endDate: string;
    totalAbsent: number;
  }> = [];

  while (toISODateLocal(dtCurrent) <= maxDate) {
    const mondayIso = toISODateLocal(dtCurrent);
    const dtSat = new Date(dtCurrent);
    dtSat.setDate(dtSat.getDate() + 5); // Saturday
    const satIso = toISODateLocal(dtSat);

    if (satIso > maxDate) {
      break; // Incomplete week
    }

    let weekAbsent = 0;
    const dtDay = new Date(dtCurrent);
    for (let i = 0; i < 6; i++) {
      const dIso = toISODateLocal(dtDay);
      weekAbsent += absentByDate.get(dIso) || 0;
      dtDay.setDate(dtDay.getDate() + 1);
    }

    completeWeeks.push({
      startDate: mondayIso,
      endDate: satIso,
      totalAbsent: weekAbsent,
    });

    // Move to next Monday
    dtCurrent.setDate(dtCurrent.getDate() + 7);
  }

  if (completeWeeks.length === 0) {
    return { bestWeek: null, worstWeek: null };
  }

  completeWeeks.sort((a, b) => a.totalAbsent - b.totalAbsent);

  return {
    bestWeek: completeWeeks[0],
    worstWeek: completeWeeks[completeWeeks.length - 1],
  };
}

/**
 * Computes side-by-side comparison for two selected programs.
 */
export function computeTwoProgramComparison(
  records: AttendanceRecord[],
  progA: string,
  progB: string,
  activeDaysMap: Record<string, string[]>,
  dateFrom: string,
  dateTo: string
) {
  const getProgramData = (prog: string) => {
    const progRecords = records.filter((r) => r.program === prog);
    const rawDays = activeDaysMap[prog] || [];
    const activeDays = rawDays.filter(
      (d) => (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo)
    ).sort();

    let absent = 0;
    let late = 0;
    let bunk = 0;
    const dailyAbsent = new Map<string, number>();

    for (const r of progRecords) {
      const c = Number(r.count) || 0;
      if (r.type === "absent") {
        absent += c;
        dailyAbsent.set(r.date, (dailyAbsent.get(r.date) || 0) + c);
      } else if (r.type === "late") {
        late += c;
      } else if (r.type === "bunk") {
        bunk += c;
      }
    }

    const avgAbsentPerDay = activeDays.length > 0 ? absent / activeDays.length : 0;

    return {
      program: prog,
      absent,
      late,
      bunk,
      activeDays: activeDays.length,
      avgAbsentPerDay,
      dailyAbsent,
    };
  };

  const dataA = getProgramData(progA);
  const dataB = getProgramData(progB);

  // Union of active days for both programs
  const unionDays = Array.from(
    new Set([
      ...(activeDaysMap[progA] || []).filter((d) => (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo)),
      ...(activeDaysMap[progB] || []).filter((d) => (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo)),
    ])
  ).sort();

  const dailyTrendComparison = unionDays.map((d) => ({
    date: d,
    label: formatDateIndian(d),
    shortLabel: formatDateShortIndian(d),
    absentA: dataA.dailyAbsent.get(d) || 0,
    absentB: dataB.dailyAbsent.get(d) || 0,
  }));

  return {
    dataA,
    dataB,
    dailyTrendComparison,
  };
}

/**
 * Computes plain-language insights and alerts for Part 4.
 */
export function computeInsightsAndAlerts(
  data: AttendanceApiSuccessResponse,
  filteredRecords: AttendanceRecord[],
  effectivePrograms: string[],
  activeDatesInRange: string[],
  consecutiveThreshold = 3
): InsightsAndAlertsData {
  const activeDaysCount = activeDatesInRange.length;
  let totalAbsent = 0;
  let totalLate = 0;
  let totalBunk = 0;

  const absentByWeekday = new Map<number, number>();
  const weekdayOccurrences = new Map<number, number>();

  for (const d of activeDatesInRange) {
    const wIdx = getWeekdayIndex(d);
    if (wIdx >= 1 && wIdx <= 6) {
      weekdayOccurrences.set(wIdx, (weekdayOccurrences.get(wIdx) || 0) + 1);
    }
  }

  const absentByProgramSemester = new Map<string, number>();

  for (const r of filteredRecords) {
    const c = Number(r.count) || 0;
    if (r.type === "absent") {
      totalAbsent += c;
      const wIdx = getWeekdayIndex(r.date);
      if (wIdx >= 1 && wIdx <= 6) {
        absentByWeekday.set(wIdx, (absentByWeekday.get(wIdx) || 0) + c);
      }
      const psKey = `${r.program}:::${r.semester}`;
      absentByProgramSemester.set(psKey, (absentByProgramSemester.get(psKey) || 0) + c);
    } else if (r.type === "late") {
      totalLate += c;
    } else if (r.type === "bunk") {
      totalBunk += c;
    }
  }

  const overallAvgPerActiveDay = activeDaysCount > 0 ? totalAbsent / activeDaysCount : 0;

  // 1. Weekday effect insights
  const weekdayInsights: InsightsAndAlertsData["weekdayInsights"] = [];
  if (activeDaysCount >= 5 && overallAvgPerActiveDay > 0) {
    for (let d = 1; d <= 6; d++) {
      const occurrences = weekdayOccurrences.get(d) || 0;
      if (occurrences >= 3) {
        const absentCount = absentByWeekday.get(d) || 0;
        const weekdayAvg = absentCount / occurrences;
        if (weekdayAvg >= 1.15 * overallAvgPerActiveDay) {
          const percentHigher = ((weekdayAvg - overallAvgPerActiveDay) / overallAvgPerActiveDay) * 100;
          const dtSample = new Date(2026, 7, 2 + d);
          const dayName = dtSample.toLocaleDateString("en-US", { weekday: "long" }) + "s";
          weekdayInsights.push({
            dayName,
            percentHigher: Math.round(percentHigher),
            count: absentCount,
          });
        }
      }
    }
  }

  // 2. Spike detection
  const topSpikes: InsightSpikeItem[] = [];
  for (const prog of effectivePrograms) {
    const progRecords = filteredRecords.filter((r) => r.program === prog && r.type === "absent");
    const progActiveDays = (data.activeDays[prog] || []).filter((d) => activeDatesInRange.includes(d)).sort();

    if (progActiveDays.length >= 5) {
      const dailyAbsentMap = new Map<string, number>();
      for (const r of progRecords) {
        dailyAbsentMap.set(r.date, (dailyAbsentMap.get(r.date) || 0) + (Number(r.count) || 0));
      }

      const values = progActiveDays.map((d) => dailyAbsentMap.get(d) || 0);
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      if (mean > 0 && stdDev > 0) {
        for (const d of progActiveDays) {
          const val = dailyAbsentMap.get(d) || 0;
          if (val > 1.5 * mean && val >= mean + 2 * stdDev) {
            topSpikes.push({
              program: prog,
              date: d,
              absent: val,
              programAvg: Number(mean.toFixed(1)),
              multiple: Number((val / mean).toFixed(1)),
              stdDev: Number(stdDev.toFixed(1)),
            });
          }
        }
      }
    }
  }

  topSpikes.sort((a, b) => b.multiple - a.multiple);
  const top5Spikes = topSpikes.slice(0, 5);

  // 3. Overall 7-day trend
  const hasEnoughDays = activeDaysCount >= 14;
  const last7Days = activeDatesInRange.slice(-7);
  const prev7Days = activeDatesInRange.slice(-14, -7);

  let absentLast7 = 0;
  let absentPrev7 = 0;
  let lateLast7 = 0;
  let latePrev7 = 0;
  let bunkLast7 = 0;
  let bunkPrev7 = 0;

  for (const r of filteredRecords) {
    const c = Number(r.count) || 0;
    if (r.type === "absent") {
      if (last7Days.includes(r.date)) absentLast7 += c;
      else if (prev7Days.includes(r.date)) absentPrev7 += c;
    } else if (r.type === "late") {
      if (last7Days.includes(r.date)) lateLast7 += c;
      else if (prev7Days.includes(r.date)) latePrev7 += c;
    } else if (r.type === "bunk") {
      if (last7Days.includes(r.date)) bunkLast7 += c;
      else if (prev7Days.includes(r.date)) bunkPrev7 += c;
    }
  }

  const trend7dOverall = {
    absentDiff: absentLast7 - absentPrev7,
    absentLast7,
    absentPrev7,
    lateDiff: lateLast7 - latePrev7,
    lateLast7,
    latePrev7,
    bunkDiff: bunkLast7 - bunkPrev7,
    bunkLast7,
    bunkPrev7,
    hasEnoughDays,
  };

  // 4. Most affected program and semester
  let mostAffected: InsightsAndAlertsData["mostAffected"] = null;
  let maxAbsentCount = 0;
  for (const [key, count] of absentByProgramSemester.entries()) {
    if (count > maxAbsentCount) {
      maxAbsentCount = count;
      const [prog, sem] = key.split(":::");
      const share = totalAbsent > 0 ? (count / totalAbsent) * 100 : 0;
      mostAffected = {
        program: prog,
        semester: sem,
        absent: count,
        sharePercent: Math.round(share),
      };
    }
  }

  // ALERTS:
  // Alert 1: Missing data:
  // A date counts as a normal college day if at least half of the programs have it in activeDays;
  // list every program that has no entry for such a day.
  const allProgs = data.programs || [];
  const minRequiredPrograms = Math.ceil(allProgs.length / 2);

  const programsByActiveDate = new Map<string, Set<string>>();
  for (const p of allProgs) {
    const days = data.activeDays[p] || [];
    for (const d of days) {
      if (!programsByActiveDate.has(d)) {
        programsByActiveDate.set(d, new Set<string>());
      }
      programsByActiveDate.get(d)!.add(p);
    }
  }

  const recordsByProgramDate = new Map<string, Set<string>>();
  for (const r of data.records) {
    if (!recordsByProgramDate.has(r.date)) {
      recordsByProgramDate.set(r.date, new Set<string>());
    }
    recordsByProgramDate.get(r.date)!.add(r.program);
  }

  const missingDataAlerts: MissingDataAlertItem[] = [];
  const sortedDatesToCheck = Array.from(programsByActiveDate.keys()).sort();

  for (const d of sortedDatesToCheck) {
    const progsWithActiveDay = programsByActiveDate.get(d)!;
    if (progsWithActiveDay.size >= minRequiredPrograms) {
      // Normal college day
      const progsWithRecords = recordsByProgramDate.get(d) || new Set<string>();
      for (const p of progsWithActiveDay) {
        if (!progsWithRecords.has(p)) {
          missingDataAlerts.push({
            program: p,
            date: d,
          });
        }
      }
    }
  }

  // Alert 2: Consecutive absences:
  // Verified students with streak >= N consecutive active days
  const verifiedRecords = filteredRecords.filter((r) => r.rollsOk === true && Array.isArray(r.rolls));
  const studentAbsentDates = new Map<string, { program: string; semester: string; roll: number; dates: Set<string> }>();

  for (const r of verifiedRecords) {
    if (r.type === "absent") {
      for (const rawRoll of r.rolls) {
        const roll = Number(rawRoll);
        if (Number.isNaN(roll) || roll <= 0) continue;
        const key = `${r.program}:::${r.semester}:::${roll}`;
        let entry = studentAbsentDates.get(key);
        if (!entry) {
          entry = {
            program: r.program,
            semester: r.semester,
            roll,
            dates: new Set<string>(),
          };
          studentAbsentDates.set(key, entry);
        }
        entry.dates.add(r.date);
      }
    }
  }

  const consecutiveAbsenceAlerts: ConsecutiveAbsenceAlertItem[] = [];

  for (const student of studentAbsentDates.values()) {
    const progDays = (data.activeDays[student.program] || []).filter((d) => activeDatesInRange.includes(d)).sort();
    let currentStreak = 0;
    let maxStreak = 0;
    let streakStart = "";
    let streakEnd = "";
    let tempStart = "";

    for (const d of progDays) {
      if (student.dates.has(d)) {
        if (currentStreak === 0) {
          currentStreak = 1;
          tempStart = d;
        } else {
          currentStreak += 1;
        }
        if (currentStreak > maxStreak) {
          maxStreak = currentStreak;
          streakStart = tempStart;
          streakEnd = d;
        }
      } else {
        currentStreak = 0;
        tempStart = "";
      }
    }

    if (maxStreak >= consecutiveThreshold) {
      consecutiveAbsenceAlerts.push({
        program: student.program,
        semester: student.semester,
        roll: student.roll,
        streak: maxStreak,
        startDate: streakStart,
        endDate: streakEnd,
      });
    }
  }

  consecutiveAbsenceAlerts.sort((a, b) => b.streak - a.streak);

  // Alert 3: Data warnings parsed into table
  const parsedWarnings: ParsedWarning[] = (data.warnings || []).map((warnStr) => {
    if (!warnStr) {
      return { original: "", tab: "Other", cell: "—", problem: "" };
    }
    const exclamationIdx = warnStr.indexOf("!");
    if (exclamationIdx !== -1) {
      const tab = warnStr.slice(0, exclamationIdx).trim();
      const rest = warnStr.slice(exclamationIdx + 1).trim();
      const match = rest.match(/^([A-Za-z0-9]+)[:\s]+(.*)$/);
      if (match) {
        return {
          original: warnStr,
          tab: tab || "Sheet",
          cell: match[1],
          problem: match[2].trim(),
        };
      }
      return {
        original: warnStr,
        tab: tab || "Sheet",
        cell: "—",
        problem: rest,
      };
    }
    return {
      original: warnStr,
      tab: "Other",
      cell: "—",
      problem: warnStr,
    };
  });

  const totalRecs = filteredRecords.length;
  const verifiedRecs = filteredRecords.filter((r) => r.rollsOk === true).length;
  const verifiedPercentage = totalRecs > 0 ? (verifiedRecs / totalRecs) * 100 : 100;

  return {
    weekdayInsights,
    topSpikes: top5Spikes,
    trend7dOverall,
    mostAffected,
    missingDataAlerts,
    consecutiveAbsenceAlerts,
    parsedWarnings,
    verifiedPercentage,
    totalRecords: totalRecs,
    verifiedRecords: verifiedRecs,
  };
}

/**
 * Computes 7-day active days trend for KPI cards.
 */
export function computeLast7ActiveDaysTrend(
  filteredRecords: AttendanceRecord[],
  activeDatesInRange: string[]
) {
  if (activeDatesInRange.length < 14) {
    return null;
  }

  const last7Days = activeDatesInRange.slice(-7);
  const prev7Days = activeDatesInRange.slice(-14, -7);

  let absentLast7 = 0;
  let absentPrev7 = 0;
  let lateLast7 = 0;
  let latePrev7 = 0;
  let bunkLast7 = 0;
  let bunkPrev7 = 0;

  for (const r of filteredRecords) {
    const c = Number(r.count) || 0;
    if (r.type === "absent") {
      if (last7Days.includes(r.date)) absentLast7 += c;
      else if (prev7Days.includes(r.date)) absentPrev7 += c;
    } else if (r.type === "late") {
      if (last7Days.includes(r.date)) lateLast7 += c;
      else if (prev7Days.includes(r.date)) latePrev7 += c;
    } else if (r.type === "bunk") {
      if (last7Days.includes(r.date)) bunkLast7 += c;
      else if (prev7Days.includes(r.date)) bunkPrev7 += c;
    }
  }

  const calcDelta = (cur: number, prev: number) => {
    const diff = cur - prev;
    let pct: number | null = null;
    if (prev > 0) pct = (diff / prev) * 100;
    else if (prev === 0 && cur === 0) pct = 0;
    return { cur, prev, diff, pct };
  };

  return {
    last7Range: { from: last7Days[0], to: last7Days[last7Days.length - 1] },
    prev7Range: { from: prev7Days[0], to: prev7Days[prev7Days.length - 1] },
    absent: calcDelta(absentLast7, absentPrev7),
    late: calcDelta(lateLast7, latePrev7),
    bunk: calcDelta(bunkLast7, bunkPrev7),
  };
}
