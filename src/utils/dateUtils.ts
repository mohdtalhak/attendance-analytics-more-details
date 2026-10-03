import { DatePreset } from "../types";

export function parseDateLocal(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00");
}

export function toISODateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateIndian(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr || "—";
  }
  const dt = parseDateLocal(dateStr);
  if (Number.isNaN(dt.getTime())) {
    return dateStr;
  }
  const day = String(dt.getDate()).padStart(2, "0");
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const year = dt.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateShortIndian(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr || "";
  }
  const dt = parseDateLocal(dateStr);
  if (Number.isNaN(dt.getTime())) {
    return dateStr;
  }
  const day = String(dt.getDate()).padStart(2, "0");
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

export function formatTimeHHMMSS(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export function addCalendarDays(dateStr: string, deltaDays: number): string {
  const dt = parseDateLocal(dateStr);
  dt.setDate(dt.getDate() + deltaDays);
  return toISODateLocal(dt);
}

export function computePresetDateRange(
  preset: DatePreset,
  allSortedDates: string[]
): { from: string; to: string } {
  if (!allSortedDates || allSortedDates.length === 0) {
    return { from: "", to: "" };
  }

  const minDate = allSortedDates[0];
  const maxDate = allSortedDates[allSortedDates.length - 1];

  switch (preset) {
    case "last7": {
      const fromCandidate = addCalendarDays(maxDate, -6);
      const from = fromCandidate < minDate ? minDate : fromCandidate;
      return { from, to: maxDate };
    }
    case "last30": {
      const fromCandidate = addCalendarDays(maxDate, -29);
      const from = fromCandidate < minDate ? minDate : fromCandidate;
      return { from, to: maxDate };
    }
    case "thisMonth": {
      const maxDt = parseDateLocal(maxDate);
      const monthStart = toISODateLocal(new Date(maxDt.getFullYear(), maxDt.getMonth(), 1));
      const from = monthStart < minDate ? minDate : monthStart;
      return { from, to: maxDate };
    }
    case "allTime":
    case "custom":
    default:
      return { from: minDate, to: maxDate };
  }
}

export function computePreviousPeriodRange(
  from: string,
  to: string
): { prevFrom: string; prevTo: string; daysCount: number } | null {
  if (!from || !to || from > to) {
    return null;
  }
  const fromDt = parseDateLocal(from);
  const toDt = parseDateLocal(to);
  if (Number.isNaN(fromDt.getTime()) || Number.isNaN(toDt.getTime())) {
    return null;
  }
  const diffMs = toDt.getTime() - fromDt.getTime();
  const daysCount = Math.round(diffMs / 86_400_000) + 1;
  if (daysCount <= 0) {
    return null;
  }
  const prevTo = addCalendarDays(from, -1);
  const prevFrom = addCalendarDays(from, -daysCount);
  return { prevFrom, prevTo, daysCount };
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function getWeekdayName(dateStr: string): string {
  const dt = parseDateLocal(dateStr);
  return WEEKDAY_NAMES[dt.getDay()] || "";
}

export function getWeekdayIndex(dateStr: string): number {
  const dt = parseDateLocal(dateStr);
  const day = dt.getDay();
  // 1 = Mon ... 6 = Sat, 7 = Sun (or 0)
  return day === 0 ? 7 : day;
}

export function getMonthKey(dateStr: string): string {
  if (!dateStr || dateStr.length < 7) return "";
  return dateStr.slice(0, 7); // YYYY-MM
}

export function getMonthDisplay(monthKey: string): string {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return monthKey;
  const [yearStr, monthStr] = monthKey.split("-");
  const monthIdx = Number.parseInt(monthStr, 10) - 1;
  const monthName = MONTH_NAMES[monthIdx] || monthStr;
  return `${monthName} ${yearStr}`;
}

export function getPreviousMonthKey(monthKey: string): string {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return "";
  const [yearStr, monthStr] = monthKey.split("-");
  let year = Number.parseInt(yearStr, 10);
  let month = Number.parseInt(monthStr, 10) - 1;
  if (month < 1) {
    month = 12;
    year -= 1;
  }
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function getDaysInMonth(year: number, month1Indexed: number): number {
  return new Date(year, month1Indexed, 0).getDate();
}

/**
 * Returns Monday to Sunday weeks for a given month (YYYY-MM).
 */
export function getWeeksForMonth(monthKey: string): Array<{
  weekIndex: number;
  startDate: string;
  endDate: string;
  label: string;
}> {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return [];
  const [yStr, mStr] = monthKey.split("-");
  const year = Number.parseInt(yStr, 10);
  const month = Number.parseInt(mStr, 10);
  const totalDays = getDaysInMonth(year, month);

  const weeks: Array<{
    weekIndex: number;
    startDate: string;
    endDate: string;
    label: string;
  }> = [];

  let currentDay = 1;
  let weekIdx = 1;

  while (currentDay <= totalDays) {
    const weekStartDay = currentDay;
    const dt = new Date(year, month - 1, weekStartDay);
    const dayOfWeek = dt.getDay(); // 0 is Sun, 1 is Mon...
    // Days until Sunday
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const weekEndDay = Math.min(totalDays, weekStartDay + daysUntilSunday);

    const startIso = `${monthKey}-${String(weekStartDay).padStart(2, "0")}`;
    const endIso = `${monthKey}-${String(weekEndDay).padStart(2, "0")}`;
    const label = `${formatDateIndian(startIso)} – ${formatDateIndian(endIso)}`;

    weeks.push({
      weekIndex: weekIdx++,
      startDate: startIso,
      endDate: endIso,
      label,
    });

    currentDay = weekEndDay + 1;
  }

  return weeks;
}
