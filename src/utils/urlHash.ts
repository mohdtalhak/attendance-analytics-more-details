import {
  DashboardNavSection,
  DatePreset,
  FilterState,
  SemesterFilter,
  TypeFilter,
} from "../types";

export interface HashState {
  section?: DashboardNavSection;
  programs?: string[];
  semester?: SemesterFilter;
  type?: TypeFilter;
  dateFrom?: string;
  dateTo?: string;
  datePreset?: DatePreset;
}

const VALID_SECTIONS: DashboardNavSection[] = [
  "overview",
  "scorecards",
  "charts",
  "leaderboard",
  "monthly-report",
  "students",
  "insights-alerts",
  "data-quality",
  "export",
];

export function readHashState(): HashState {
  if (typeof window === "undefined") return {};
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return {};

  const params = new URLSearchParams(hash);
  const state: HashState = {};

  const sec = params.get("sec") || params.get("tab") || params.get("section");
  if (sec && VALID_SECTIONS.includes(sec as DashboardNavSection)) {
    state.section = sec as DashboardNavSection;
  }

  const progs = params.get("prog") || params.get("programs");
  if (progs !== null) {
    state.programs = progs ? progs.split(",").filter(Boolean) : [];
  }

  const sem = params.get("sem") || params.get("semester");
  if (sem && (sem === "all" || sem === "First" || sem === "Third" || sem === "Fifth")) {
    state.semester = sem as SemesterFilter;
  }

  const type = params.get("type");
  if (type && (type === "all" || type === "absent" || type === "late" || type === "bunk")) {
    state.type = type as TypeFilter;
  }

  const from = params.get("from") || params.get("dateFrom");
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    state.dateFrom = from;
  }

  const to = params.get("to") || params.get("dateTo");
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    state.dateTo = to;
  }

  const preset = params.get("preset");
  if (
    preset &&
    (preset === "last7" ||
      preset === "last30" ||
      preset === "thisMonth" ||
      preset === "allTime" ||
      preset === "custom")
  ) {
    state.datePreset = preset as DatePreset;
  }

  return state;
}

export function writeHashState(
  filters: FilterState,
  section?: DashboardNavSection
) {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams();

  if (section && section !== "overview") {
    params.set("sec", section);
  }
  if (filters.programs.length > 0) {
    params.set("prog", filters.programs.join(","));
  }
  if (filters.semester !== "all") {
    params.set("sem", filters.semester);
  }
  if (filters.type !== "all") {
    params.set("type", filters.type);
  }
  if (filters.datePreset && filters.datePreset !== "allTime") {
    params.set("preset", filters.datePreset);
  }
  if (filters.dateFrom) {
    params.set("from", filters.dateFrom);
  }
  if (filters.dateTo) {
    params.set("to", filters.dateTo);
  }

  const newHash = params.toString();
  if (newHash) {
    window.history.replaceState(null, "", `#${newHash}`);
  } else {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }
}
