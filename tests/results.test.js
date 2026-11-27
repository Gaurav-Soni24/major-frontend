import { test } from "node:test";
import assert from "node:assert/strict";
import { passedOf, statusBadges, durationSeconds, flagImageSrc } from "../src/features/results/logic/status.js";
import { parseFilters, buildQuery, toApiParams } from "../src/features/results/logic/filters.js";
import { buildExportRows, toCsv, safeText, fileStem } from "../src/features/results/logic/exportRows.js";
import { countAxis, niceCeil } from "../src/components/charts/chartMath.js";
import { histogramBars, orderQuestions } from "../src/features/results/logic/analytics.js";
import { parseMarks, optimisticGrade, applyGrade, reviewIndexes } from "../src/features/results/logic/grading.js";

test("pass/fail only for finished attempts", () => {
  assert.equal(passedOf({ status: "submitted", score: { percentage: 40 } }, 40), true);
  assert.equal(passedOf({ status: "graded", score: { percentage: 39.99 } }, 40), false);
  assert.equal(passedOf({ status: "in-progress", score: { percentage: 90 } }, 40), null);
});

test("status badges", () => {
  const keys = (s) => statusBadges(s).map((b) => b.key);
  assert.deepEqual(keys({ status: "submitted", needsReview: true, antiCheat: { isFlagged: true }, late: true }), ["submitted", "needs-review", "flagged", "late"]);
  assert.deepEqual(keys({ status: "graded", antiCheat: { wasAutoSubmitted: true } }), ["graded", "auto"]);
  assert.deepEqual(keys({ status: "in-progress" }), ["in-progress"]);
});

test("duration", () => {
  assert.equal(durationSeconds({ startedAt: "2026-01-01T10:00:00Z", submittedAt: "2026-01-01T10:12:30Z" }), 750);
  assert.equal(durationSeconds({ startedAt: "2026-01-01T10:00:00Z" }), null);
});

test("filters round trip and defaults are omitted", () => {
  const f = parseFilters(new URLSearchParams("tab=analytics&status=graded&flagged=1&q=ann&sort=score&page=3"));
  assert.deepEqual(f, { tab: "analytics", status: "graded", sort: "score", flagged: true, search: "ann", page: 3 });
  assert.equal(buildQuery(parseFilters(new URLSearchParams(""))), "");
  assert.equal(buildQuery(f), "tab=analytics&status=graded&sort=score&flagged=1&q=ann&page=3");
  assert.equal(parseFilters(new URLSearchParams("status=zzz&page=-4")).status, "all");
  assert.equal(parseFilters(new URLSearchParams("page=-4")).page, 1);
  assert.deepEqual(toApiParams(f, 100), { page: 3, limit: 100, status: "graded", flagged: "true", search: "ann", sort: "score" });
});

test("csv escaping, formula guard, numbers stay numbers", () => {
  assert.equal(safeText("=cmd()"), "'=cmd()");
  assert.equal(safeText("Ann"), "Ann");
  const subs = [
    { status: "submitted", userDetails: { name: 'Ann "A", Lee', email: "a@x.com", customData: { Roll: "12" } }, score: { obtainedMarks: 4.5, totalMarks: 10, percentage: 45 }, antiCheat: { tabSwitches: 2 }, startedAt: "2026-01-01T10:00:00Z", submittedAt: "2026-01-01T10:10:00Z" },
    { status: "in-progress", userDetails: { name: "Bo", email: "b@x.com" }, antiCheat: {} },
  ];
  const { header, rows } = buildExportRows(subs, { passingScore: 40, customFields: [{ name: "Roll" }] });
  assert.equal(header[2], "Roll");
  assert.equal(rows[0][header.indexOf("Marks obtained")], 4.5);
  assert.equal(rows[0][header.indexOf("Result")], "Pass");
  assert.equal(rows[1][header.indexOf("Result")], "");
  assert.equal(rows[0][header.indexOf("Duration (seconds)")], 600);
  const csv = toCsv(header, rows);
  assert.ok(csv.startsWith("﻿Name,Email,Roll"));
  assert.ok(csv.includes('"Ann ""A"", Lee"'));
  assert.equal(fileStem("Intro: JS / DOM?!"), "Intro-JS-DOM-results");
});

test("chart axes", () => {
  assert.deepEqual(countAxis(3).ticks, [0, 1, 2, 3]);
  const a = countAxis(23);
  assert.ok(a.max >= 23);
  assert.equal(a.ticks[0], 0);
  assert.equal(a.ticks.at(-1), a.max);
  assert.equal(niceCeil(7), 10);
  assert.equal(niceCeil(0.3), 0.5);
  assert.deepEqual(countAxis(0).ticks, [0, 1]);
});

test("histogram bars and question ordering", () => {
  const dist = Array.from({ length: 10 }, (_, i) => ({ range: i === 9 ? "90-100" : `${i * 10}-${i * 10 + 9}`, count: i }));
  const { bars, marker } = histogramBars(dist, 40);
  assert.equal(bars.length, 10);
  assert.equal(marker, 4);
  assert.equal(bars[3].state, "below");
  assert.equal(bars[4].state, "above");
  assert.equal(histogramBars(dist, 45).bars[4].state, "mixed");
  const qs = [
    { index: 0, answered: 5, correctRate: 90 },
    { index: 1, answered: 0, correctRate: 0 },
    { index: 2, answered: 5, correctRate: 20 },
  ];
  assert.deepEqual(orderQuestions(qs, "hardest").map((q) => q.number), [3, 1, 2]);
  assert.deepEqual(orderQuestions(qs, "order").map((q) => q.number), [1, 2, 3]);
});

test("marks validation", () => {
  assert.deepEqual(parseMarks("1,5", 2), { value: 1.5 });
  assert.deepEqual(parseMarks("0", 2), { value: 0 });
  assert.ok(parseMarks("", 2).error);
  assert.ok(parseMarks("-1", 2).error);
  assert.ok(parseMarks("abc", 2).error);
  assert.ok(parseMarks("2.5", 2).error.includes("At most 2"));
});

test("optimistic grading recomputes score and status", () => {
  const sub = { status: "submitted", needsReview: true, score: { totalMarks: 10, obtainedMarks: 4, percentage: 40 }, questions: [
    { marks: 4, marksObtained: 4 }, { marks: 6, marksObtained: 0, needsReview: true },
  ] };
  assert.deepEqual(reviewIndexes(sub.questions), [1]);
  const next = optimisticGrade(sub, 1, { marksObtained: 3, feedback: "ok" });
  assert.equal(next.status, "graded");
  assert.equal(next.score.percentage, 70);
  assert.equal(next.questions[1].teacherFeedback, "ok");
  assert.equal(sub.status, "submitted");
  const merged = applyGrade(sub, 1, { marksObtained: 3 }, { status: "graded", needsReview: false, score: { totalMarks: 10, obtainedMarks: 7, percentage: 70 } });
  assert.equal(merged.score.obtainedMarks, 7);
});

test("flag image sources", () => {
  assert.equal(flagImageSrc("NO_IMAGE"), null);
  assert.equal(flagImageSrc(""), null);
  assert.equal(flagImageSrc("javascript:alert(1)"), null);
  assert.equal(flagImageSrc("data:image/png;base64,AAAA"), "data:image/png;base64,AAAA");
  assert.equal(flagImageSrc("AAAA"), "data:image/jpeg;base64,AAAA");
});
