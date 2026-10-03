/**
 * Google Apps Script Web App JSON endpoint for college attendance analytics.
 * Keep this constant at the top so it is easy to update if redeployed.
 */
export const API_URL =
  "https://script.google.com/macros/s/AKfycbwXXAKcvwwp9YM7RcokfHSjt6hthqeZ3L2RR1SBoRa3BWtccrky_P4lMV_Oq9_c4WkdHw/exec";

export type SemesterName = "First" | "Third" | "Fifth";
export type AttendanceType = "absent" | "late" | "bunk";

export interface AttendanceRecord {
  date: string; // YYYY-MM-DD
  program: string; // e.g., "AO", "CO-A", "CO-B", "EJ", "ME", "CE", "EE"
  semester: SemesterName | string;
  type: AttendanceType | string;
  count: number;
  rolls: number[];
  rollsOk: boolean;
  note: string;
}

export interface AttendanceApiSuccessResponse {
  status: "success";
  updatedAt: string;
  programs: string[];
  dates: string[];
  activeDays: Record<string, string[]>;
  records: AttendanceRecord[];
  warnings: string[];
}

export interface AttendanceApiErrorResponse {
  status: "error";
  code?: string;
  message?: string;
}

export type AttendanceApiResponse =
  | AttendanceApiSuccessResponse
  | AttendanceApiErrorResponse;

export interface AuthCredentials {
  username: string;
  password: string;
}



export type SemesterFilter = "all" | "First" | "Third" | "Fifth";
export type TypeFilter = "all" | "absent" | "late" | "bunk";
export type DatePreset = "last7" | "last30" | "thisMonth" | "allTime" | "custom";

export interface FilterState {
  programs: string[]; // empty array means "All programs"
  semester: SemesterFilter;
  type: TypeFilter;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
  datePreset: DatePreset;
}

export interface MetricDelta {
  current: number;
  previous: number;
  diff: number;
  percentChange: number | null;
  hasPreviousData: boolean;
}

export interface KpiMetrics {
  totalAbsent: number;
  totalLate: number;
  totalBunk: number;
  mostAbsentProgram: { program: string; count: number } | null;
  mostAbsentDay: { date: string; count: number } | null;
  activeDaysCount: number;
  avgAbsentPerActiveDay: number;
  isPeriodComparisonActive: boolean;
  comparisonDaysLength: number;
  prevPeriodRange: { from: string; to: string } | null;
  absentDelta: MetricDelta | null;
  lateDelta: MetricDelta | null;
  bunkDelta: MetricDelta | null;
  avgAbsentDelta: MetricDelta | null;
}

export interface DailyTrendPoint {
  date: string; // YYYY-MM-DD
  label: string; // DD/MM/YYYY
  shortLabel: string; // DD/MM
  absent: number;
  late: number;
  bunk: number;
  notes: Array<{ program: string; semester: string; type: string; note: string }>;
}

export interface ProgramComparisonItem {
  program: string;
  absent: number;
  late: number;
  bunk: number;
  total: number;
}

export interface SemesterBreakdownItem {
  semester: string;
  absent: number;
  late: number;
  bunk: number;
  total: number;
}

export interface WeekdayPatternItem {
  dayIndex: number; // 1 = Mon ... 6 = Sat
  dayName: string;
  shortName: string;
  absent: number;
  late: number;
  bunk: number;
  total: number;
}

export interface HeatmapCellData {
  program: string;
  date: string;
  absent: number;
  late: number;
  bunk: number;
  isActiveDay: boolean;
  notes: string[];
}

export interface HeatmapMatrix {
  programs: string[];
  dates: string[];
  cells: Record<string, Record<string, HeatmapCellData>>;
  maxAbsent: number;
}

export interface LeaderboardRow {
  program: string;
  absent: number;
  late: number;
  bunk: number;
  activeDays: number;
  avgAbsentPerDay: number;
}

export interface StudentTimelineEntry {
  date: string;
  semester: string;
  type: AttendanceType | string;
  note: string;
}

export interface StudentLookupSummary {
  program: string;
  roll: number;
  absent: number;
  late: number;
  bunk: number;
  timeline: StudentTimelineEntry[];
  verifiedProgramRecordsCount: number;
  totalProgramRecordsCount: number;
}

export interface FrequentRollEntry {
  roll: number;
  program: string;
  semesters: string[];
  absent: number;
  late: number;
  bunk: number;
  totalOccurrences: number;
}

// Option B Advanced Chart Structures
export interface CumulativeTrendPoint {
  date: string;
  label: string;
  shortLabel: string;
  cumulativeAbsent: number;
  cumulativeLate: number;
  cumulativeBunk: number;
  cumulativeTotal: number;
}

export interface ProgramSemesterMatrixItem {
  program: string;
  first: number;
  third: number;
  fifth: number;
  total: number;
}

export interface OutlierDayItem {
  date: string;
  label: string;
  absent: number;
  average: number;
  deviation: number;
  isSurge: boolean;
}

export const CHART_COLORS = {
  absent: "#3b6fe0",
  late: "#e5484d",
  bunk: "#f5a524",
  firstSemester: "#3b6fe0",
  thirdSemester: "#8b5cf6",
  fifthSemester: "#06b6d4",
} as const;

export type DashboardNavSection =
  | "overview"
  | "scorecards"
  | "charts"
  | "leaderboard"
  | "monthly-report"
  | "students"
  | "insights-alerts"
  | "data-quality"
  | "export";

export interface StudentActiveDayStatus {
  date: string; // YYYY-MM-DD
  status: "absent" | "late" | "bunk" | "multiple" | "neutral";
  types: string[];
  count: number;
}

export interface StudentProfileData {
  program: string;
  semester: string;
  roll: number;
  absent: number;
  late: number;
  bunk: number;
  firstDateSeen: string | null;
  lastDateSeen: string | null;
  verifiedEntriesCount: number;
  totalProgramSemesterVerifiedRecords: number;
  worstWeekday: { dayIndex: number; dayName: string; count: number } | null;
  longestStreak: { count: number; startDate: string; endDate: string } | null;
  currentStreak: number;
  rank: { rank: number; totalRollsWithAbsences: number } | null;
  timeline: StudentTimelineEntry[];
  activeDaysStatus: StudentActiveDayStatus[];
}

export interface MonthlyWeekItem {
  weekIndex: number;
  startDate: string;
  endDate: string;
  label: string;
  absent: number;
  late: number;
  bunk: number;
  activeDays: number;
}

export interface MonthlyReportData {
  availableMonths: Array<{ value: string; label: string }>;
  selectedMonth: string; // YYYY-MM
  monthLabel: string;
  isMonthInProgress: boolean;
  totalAbsent: number;
  totalLate: number;
  totalBunk: number;
  activeDaysCount: number;
  avgAbsentPerDay: number;
  worstDay: { date: string; absent: number } | null;
  worstProgram: { program: string; absent: number } | null;
  worstWeekday: { dayName: string; absent: number } | null;
  prevMonthComparison: {
    prevMonth: string;
    prevMonthLabel: string;
    prevAbsent: number;
    absentDiff: number;
    absentPercentChange: number | null;
    prevActiveDays: number;
    prevAvgAbsentPerDay: number;
    avgAbsentDiff: number;
    avgAbsentPercentChange: number | null;
    hasPrevData: boolean;
  } | null;
  weeklyBreakdown: MonthlyWeekItem[];
  dailyTrend: DailyTrendPoint[];
  programBreakdown: ProgramComparisonItem[];
  topRolls: FrequentRollEntry[];
}

export interface ProgramScorecardTrend {
  last7Count: number;
  prev7Count: number;
  diff: number;
  percentChange: number | null;
  hasEnoughDays: boolean;
  last7DatesCount: number;
  prev7DatesCount: number;
}

export interface ProgramScorecardItem {
  program: string;
  absent: number;
  late: number;
  bunk: number;
  activeDays: number;
  avgAbsentPerDay: number;
  rank: number;
  trend7d: ProgramScorecardTrend;
}

export interface TermWeeksSummary {
  bestWeek: { startDate: string; endDate: string; totalAbsent: number } | null;
  worstWeek: { startDate: string; endDate: string; totalAbsent: number } | null;
}

export interface InsightSpikeItem {
  program: string;
  date: string;
  absent: number;
  programAvg: number;
  multiple: number;
  stdDev: number;
}

export interface ParsedWarning {
  original: string;
  tab: string;
  cell: string;
  problem: string;
}

export interface ConsecutiveAbsenceAlertItem {
  program: string;
  semester: string;
  roll: number;
  streak: number;
  startDate: string;
  endDate: string;
}

export interface MissingDataAlertItem {
  program: string;
  date: string;
}

export interface InsightsAndAlertsData {
  weekdayInsights: Array<{ dayName: string; percentHigher: number; count: number }>;
  topSpikes: InsightSpikeItem[];
  trend7dOverall: {
    absentDiff: number;
    absentLast7: number;
    absentPrev7: number;
    lateDiff: number;
    lateLast7: number;
    latePrev7: number;
    bunkDiff: number;
    bunkLast7: number;
    bunkPrev7: number;
    hasEnoughDays: boolean;
  };
  mostAffected: {
    program: string;
    semester: string;
    absent: number;
    sharePercent: number;
  } | null;
  missingDataAlerts: MissingDataAlertItem[];
  consecutiveAbsenceAlerts: ConsecutiveAbsenceAlertItem[];
  parsedWarnings: ParsedWarning[];
  verifiedPercentage: number;
  totalRecords: number;
  verifiedRecords: number;
}
