import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  AttendanceRecord,
  MonthlyReportData,
  StudentProfileData,
  StudentTimelineEntry,
} from "../types";
import { formatDateIndian } from "./dateUtils";

/**
 * Prefix text cells starting with =, +, -, @ with an apostrophe to prevent spreadsheet formula injection.
 */
export function sanitizeSpreadsheetCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/^[=+\-@]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

export function escapeCsvField(val: unknown): string {
  const sanitized = sanitizeSpreadsheetCell(val);
  if (/[",\n\r]/.test(sanitized)) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

/**
 * Downloads a string as a file in the browser.
 */
export function triggerFileDownload(content: BlobPart, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports records to CSV with UTF-8 BOM and formula injection protection.
 */
export function exportAttendanceRecordsCsv(records: AttendanceRecord[], dateStamp: string) {
  const headers = [
    "date",
    "program",
    "semester",
    "type",
    "count",
    "verified",
    "roll_numbers",
    "note",
  ];

  const lines = [headers.join(",")];

  for (const r of records) {
    const isVerified = r.rollsOk === true;
    const rollsStr = isVerified && Array.isArray(r.rolls) ? r.rolls.join(" ") : "";
    const row = [
      escapeCsvField(r.date),
      escapeCsvField(r.program),
      escapeCsvField(r.semester),
      escapeCsvField(r.type),
      escapeCsvField(r.count),
      escapeCsvField(isVerified ? "yes" : "no"),
      escapeCsvField(rollsStr),
      escapeCsvField(r.note || ""),
    ];
    lines.push(row.join(","));
  }

  // Prepend UTF-8 BOM so spreadsheet viewers render UTF-8 characters correctly
  const csvContent = "\uFEFF" + lines.join("\r\n");
  triggerFileDownload(csvContent, `attendance_records_${dateStamp}.csv`, "text/csv;charset=utf-8;");
}

/**
 * Exports monthly report breakdown to CSV.
 */
export function exportMonthlyReportCsv(
  monthLabel: string,
  records: AttendanceRecord[],
  dateStamp: string
) {
  const headers = [
    "month",
    "date",
    "program",
    "semester",
    "type",
    "count",
    "verified",
    "note",
  ];

  const lines = [headers.join(",")];

  for (const r of records) {
    const isVerified = r.rollsOk === true;
    const row = [
      escapeCsvField(monthLabel),
      escapeCsvField(r.date),
      escapeCsvField(r.program),
      escapeCsvField(r.semester),
      escapeCsvField(r.type),
      escapeCsvField(r.count),
      escapeCsvField(isVerified ? "yes" : "no"),
      escapeCsvField(r.note || ""),
    ];
    lines.push(row.join(","));
  }

  const csvContent = "\uFEFF" + lines.join("\r\n");
  triggerFileDownload(
    csvContent,
    `monthly_attendance_${monthLabel.replace(/\s+/g, "_")}_${dateStamp}.csv`,
    "text/csv;charset=utf-8;"
  );
}

/**
 * Exports student profile timeline to CSV.
 */
export function exportStudentTimelineCsv(
  program: string,
  semester: string,
  roll: number,
  timeline: StudentTimelineEntry[],
  dateStamp: string
) {
  const headers = ["date", "formatted_date", "program", "semester", "roll", "type", "note"];
  const lines = [headers.join(",")];

  for (const item of timeline) {
    const row = [
      escapeCsvField(item.date),
      escapeCsvField(formatDateIndian(item.date)),
      escapeCsvField(program),
      escapeCsvField(semester),
      escapeCsvField(roll),
      escapeCsvField(item.type),
      escapeCsvField(item.note || ""),
    ];
    lines.push(row.join(","));
  }

  const csvContent = "\uFEFF" + lines.join("\r\n");
  triggerFileDownload(
    csvContent,
    `student_${program}_sem${semester}_roll${roll}_${dateStamp}.csv`,
    "text/csv;charset=utf-8;"
  );
}

/**
 * Generates and downloads a clean, multi-page PDF document of the filtered attendance dataset.
 */
export function exportAttendanceRecordsPdf(
  records: AttendanceRecord[],
  filterSummary: string[],
  dateStamp: string
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top header banner
  doc.setFillColor(59, 111, 224); // #3b6fe0
  doc.rect(0, 0, pageWidth, 50, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("AttendView Analytics · Attendance Report", 30, 32);

  // Subtitle & Filter Scope
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 30, 70);

  const scopeText = `Filters: ${filterSummary.join("  |  ")}`;
  const splitScope = doc.splitTextToSize(scopeText, pageWidth - 60);
  doc.text(splitScope, 30, 84);

  // Summary Metrics Box
  let totalAbsent = 0;
  let totalLate = 0;
  let totalBunk = 0;
  let verifiedCount = 0;

  for (const r of records) {
    const c = Number(r.count) || 0;
    if (r.type === "absent") totalAbsent += c;
    else if (r.type === "late") totalLate += c;
    else if (r.type === "bunk") totalBunk += c;
    if (r.rollsOk) verifiedCount++;
  }

  const startY = 88 + splitScope.length * 12;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(30, startY, pageWidth - 60, 48, 4, 4, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  const colW = (pageWidth - 60) / 4;
  doc.text("Total Records", 45, startY + 18);
  doc.text("Total Absent", 45 + colW, startY + 18);
  doc.text("Total Late", 45 + colW * 2, startY + 18);
  doc.text("Total Bunk", 45 + colW * 3, startY + 18);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(59, 111, 224);
  doc.text(records.length.toLocaleString("en-IN"), 45, startY + 36);
  doc.setTextColor(59, 111, 224);
  doc.text(totalAbsent.toLocaleString("en-IN"), 45 + colW, startY + 36);
  doc.setTextColor(229, 72, 77);
  doc.text(totalLate.toLocaleString("en-IN"), 45 + colW * 2, startY + 36);
  doc.setTextColor(245, 165, 36);
  doc.text(totalBunk.toLocaleString("en-IN"), 45 + colW * 3, startY + 36);

  // Table of Records
  const tableData = records.slice(0, 500).map((r) => [
    formatDateIndian(r.date),
    r.program,
    r.semester,
    r.type.toUpperCase(),
    r.count.toString(),
    r.rollsOk ? "Yes" : "No",
    r.rollsOk && Array.isArray(r.rolls) ? r.rolls.slice(0, 15).join(", ") : "-",
    r.note || "",
  ]);

  autoTable(doc, {
    startY: startY + 60,
    head: [["Date", "Program", "Semester", "Type", "Count", "Verified", "Roll Numbers", "Note"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [59, 111, 224],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 50 },
      2: { cellWidth: 50 },
      3: { cellWidth: 45 },
      4: { cellWidth: 35, halign: "right" },
      5: { cellWidth: 40, halign: "center" },
      6: { cellWidth: 140 },
      7: { cellWidth: "auto" },
    },
    didDrawPage: (data) => {
      // Page number footer
      const pageStr = `Page ${data.pageNumber}`;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(pageStr, pageWidth - 60, doc.internal.pageSize.getHeight() - 20);
      doc.text(
        "Confidential College Attendance Analytics · For Authorized Staff Only",
        30,
        doc.internal.pageSize.getHeight() - 20
      );
    },
  });

  doc.save(`attendance_records_${dateStamp}.pdf`);
}

/**
 * Generates and downloads a clean, multi-page PDF document of the Monthly Attendance Report.
 */
export function exportMonthlyReportPdf(
  report: MonthlyReportData,
  filterSummary: string[],
  dateStamp: string
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top header banner
  doc.setFillColor(59, 111, 224);
  doc.rect(0, 0, pageWidth, 50, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(`Monthly Attendance Report · ${report.monthLabel}`, 30, 32);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 30, 70);

  if (report.isMonthInProgress) {
    doc.setTextColor(180, 83, 9);
    doc.setFont("helvetica", "bold");
    doc.text("Status: Month in Progress (Partial dataset)", 30, 84);
  }

  // Summary Metrics Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(30, 96, pageWidth - 60, 52, 4, 4, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);

  const colW = (pageWidth - 60) / 4;
  doc.text("Total Absent", 45, 112);
  doc.text("Total Late", 45 + colW, 112);
  doc.text("Total Bunk", 45 + colW * 2, 112);
  doc.text("Daily Absence Avg", 45 + colW * 3, 112);

  doc.setFontSize(13);
  doc.setTextColor(59, 111, 224);
  doc.text(report.totalAbsent.toLocaleString("en-IN"), 45, 132);
  doc.setTextColor(229, 72, 77);
  doc.text(report.totalLate.toLocaleString("en-IN"), 45 + colW, 132);
  doc.setTextColor(245, 165, 36);
  doc.text(report.totalBunk.toLocaleString("en-IN"), 45 + colW * 2, 132);
  doc.setTextColor(30, 41, 59);
  doc.text(report.avgAbsentPerDay.toFixed(1), 45 + colW * 3, 132);

  // Week-by-Week Breakdown Table
  const weekData = report.weeklyBreakdown.map((w) => [
    w.label,
    `${formatDateIndian(w.startDate)} - ${formatDateIndian(w.endDate)}`,
    w.activeDays.toString(),
    w.absent.toLocaleString("en-IN"),
    w.late.toLocaleString("en-IN"),
    w.bunk.toLocaleString("en-IN"),
    w.activeDays > 0 ? (w.absent / w.activeDays).toFixed(1) : "0.0",
  ]);

  autoTable(doc, {
    startY: 160,
    head: [["Week", "Date Range", "Active Days", "Absent", "Late", "Bunk", "Avg / Day"]],
    body: weekData,
    theme: "striped",
    headStyles: {
      fillColor: [59, 111, 224],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 4,
    },
  });

  // Top 10 Verified Absent Roll Numbers
  const lastY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 300;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("Top Verified Absent Roll Numbers for this Month", 30, lastY + 25);

  const topRollsData = report.topRolls.slice(0, 10).map((r, i) => [
    `#${i + 1}`,
    `Roll ${r.roll}`,
    r.program,
    r.semesters.join(", "),
    r.absent.toString(),
    r.late.toString(),
    r.bunk.toString(),
  ]);

  autoTable(doc, {
    startY: lastY + 32,
    head: [["Rank", "Roll Number", "Program", "Semesters", "Absent", "Late", "Bunk"]],
    body: topRollsData.length > 0 ? topRollsData : [["-", "No verified data", "-", "-", "-", "-", "-"]],
    theme: "striped",
    headStyles: {
      fillColor: [71, 85, 105],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 4,
    },
    didDrawPage: (data) => {
      const pageStr = `Page ${data.pageNumber}`;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(pageStr, pageWidth - 60, doc.internal.pageSize.getHeight() - 20);
      doc.text(
        "Monthly Attendance Analytics · Official College Record",
        30,
        doc.internal.pageSize.getHeight() - 20
      );
    },
  });

  doc.save(`monthly_attendance_${report.selectedMonth}_${dateStamp}.pdf`);
}

/**
 * Generates and downloads a clean, multi-page PDF document of an individual Student Attendance Profile.
 */
export function exportStudentProfilePdf(
  program: string,
  semester: string,
  roll: number,
  profile: StudentProfileData,
  dateStamp: string
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top header banner
  doc.setFillColor(59, 111, 224);
  doc.rect(0, 0, pageWidth, 50, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(`Student Attendance Profile · Roll ${roll}`, 30, 32);

  // Profile Details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`Program: ${program}   |   Semester: ${semester}   |   Roll Number: ${roll}`, 30, 72);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 30, 86);
  doc.text(
    `Based on ${profile.verifiedEntriesCount} verified entries. Roll lists may be incomplete for unverified days.`,
    30,
    98
  );

  // Summary Metrics Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(30, 108, pageWidth - 60, 52, 4, 4, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);

  const colW = (pageWidth - 60) / 4;
  doc.text("Total Absent", 45, 124);
  doc.text("Total Late", 45 + colW, 124);
  doc.text("Total Bunk", 45 + colW * 2, 124);
  doc.text("Consecutive Streak", 45 + colW * 3, 124);

  doc.setFontSize(13);
  doc.setTextColor(59, 111, 224);
  doc.text(profile.absent.toString(), 45, 144);
  doc.setTextColor(229, 72, 77);
  doc.text(profile.late.toString(), 45 + colW, 144);
  doc.setTextColor(245, 165, 36);
  doc.text(profile.bunk.toString(), 45 + colW * 2, 144);
  doc.setTextColor(30, 41, 59);
  doc.text(`${profile.longestStreak?.count || 0} days`, 45 + colW * 3, 144);

  // Incident Timeline Table
  const timelineData = profile.timeline.map((entry) => [
    formatDateIndian(entry.date),
    entry.type.toUpperCase(),
    entry.note || "-",
  ]);

  autoTable(doc, {
    startY: 172,
    head: [["Date", "Incident Type", "Note / Details"]],
    body: timelineData.length > 0 ? timelineData : [["-", "No recorded verified incidents", "-"]],
    theme: "striped",
    headStyles: {
      fillColor: [59, 111, 224],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 5,
    },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 100 },
      2: { cellWidth: "auto" },
    },
    didDrawPage: (data) => {
      const pageStr = `Page ${data.pageNumber}`;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(pageStr, pageWidth - 60, doc.internal.pageSize.getHeight() - 20);
      doc.text("Student Attendance Record · Confidential", 30, doc.internal.pageSize.getHeight() - 20);
    },
  });

  doc.save(`student_${program}_sem${semester}_roll${roll}_${dateStamp}.pdf`);
}

/**
 * Downloads a Chart.js canvas as a PNG image with a crisp white background.
 */
export function downloadCanvasAsPng(canvas: HTMLCanvasElement | null, filename: string) {
  if (!canvas) return;
  try {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const ctx = tempCanvas.getContext("2d");
    if (!ctx) return;

    // Fill white background for light printing/saving
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    ctx.drawImage(canvas, 0, 0);

    const dataUrl = tempCanvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename.endsWith(".png") ? filename : `${filename}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    console.error("Failed to export chart image", err);
  }
}

