import { durationSeconds, passedOf } from "./status.js";

/** Cell text that a spreadsheet could run as a formula is prefixed with an apostrophe. */
export function safeText(value) {
  const s = value === null || value === undefined ? "" : String(value);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

/** Custom data columns: the quiz's declared fields first, then any extra keys found in the data. */
export function customColumns(quiz, subs) {
  const cols = (quiz?.customFields || []).map((f) => f.name).filter(Boolean);
  for (const s of subs) {
    for (const k of Object.keys(s?.userDetails?.customData || {})) if (!cols.includes(k)) cols.push(k);
  }
  return cols;
}

/**
 * Build a header row and data rows for CSV / XLSX. Numbers stay numbers, text is formula-safe, no flagged images.
 * @param {any[]} subs @param {{ passingScore?: number, customFields?: Array<{name:string}> }} quiz
 * @returns {{ header: string[], rows: Array<Array<string|number>> }}
 */
export function buildExportRows(subs, quiz) {
  const custom = customColumns(quiz, subs);
  const header = [
    "Name", "Email", ...custom, "Status", "Needs review", "Marks obtained", "Total marks", "Percentage", "Result",
    "Tab switches", "Webcam strikes", "Copy/paste attempts", "Flagged", "Late", "Auto-submitted", "Started", "Submitted", "Duration (seconds)",
  ];
  const rows = subs.map((s) => {
    const passed = passedOf(s, quiz?.passingScore);
    const a = s.antiCheat || {};
    const done = s.status === "submitted" || s.status === "graded";
    const dur = durationSeconds(s);
    return [
      safeText(s.userDetails?.name),
      safeText(s.userDetails?.email),
      ...custom.map((k) => safeText(s.userDetails?.customData?.[k])),
      s.status || "",
      s.needsReview ? "Yes" : "No",
      done ? Number(s.score?.obtainedMarks ?? 0) : "",
      done ? Number(s.score?.totalMarks ?? 0) : "",
      done ? Number(s.score?.percentage ?? 0) : "",
      passed === null ? "" : passed ? "Pass" : "Fail",
      a.tabSwitches || 0,
      a.webcamStrikes || 0,
      a.copyPasteAttempts || 0,
      a.isFlagged ? "Yes" : "No",
      s.late ? "Yes" : "No",
      a.wasAutoSubmitted ? "Yes" : "No",
      s.startedAt ? new Date(s.startedAt).toISOString() : "",
      s.submittedAt ? new Date(s.submittedAt).toISOString() : "",
      dur === null ? "" : dur,
    ];
  });
  return { header, rows };
}

/** RFC 4180 CSV with a UTF-8 BOM so Excel reads non-Latin names correctly. */
export function toCsv(header, rows) {
  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n") + "\r\n";
}

/** Safe file name stem from a quiz title. */
export function fileStem(title) {
  const base = String(title || "quiz").normalize("NFKD").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").slice(0, 60);
  return `${base || "quiz"}-results`;
}
