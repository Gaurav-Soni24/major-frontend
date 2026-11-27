import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pluralize, formatDate, formatDateTime, formatRelative, formatTimer, formatDuration,
  formatPercent, formatMarks, formatQuestionNumber, formatScore,
} from "../src/lib/utils/format.js";
import { cn } from "../src/lib/utils/cn.js";

test("cn skips falsy", () => assert.equal(cn("a", false, null, undefined, "b"), "a b"));
test("pluralize", () => {
  assert.equal(pluralize(1, "question"), "1 question");
  assert.equal(pluralize(0, "question"), "0 questions");
  assert.equal(pluralize(2, "entry", "entries"), "2 entries");
});
test("dates are stable and tolerate bad input", () => {
  assert.equal(formatDate("2026-11-27T10:00:00Z"), "27 Nov 2026");
  assert.equal(formatDateTime("2026-11-27T14:02:00Z"), "27 Nov 2026, 14:02");
  assert.equal(formatDate("nope"), "—");
  assert.equal(formatDate(null), "—");
});
test("relative time", () => {
  const now = Date.parse("2026-11-27T12:00:00Z");
  assert.equal(formatRelative(now - 10_000, now), "just now");
  assert.equal(formatRelative(now - 5 * 60_000, now), "5 min ago");
  assert.equal(formatRelative(now - 3 * 3600_000, now), "3 h ago");
  assert.equal(formatRelative(now - 2 * 86400_000, now), "2 d ago");
});
test("timer and duration", () => {
  assert.equal(formatTimer(75), "1:15");
  assert.equal(formatTimer(3725), "1:02:05");
  assert.equal(formatTimer(-4), "0:00");
  assert.equal(formatDuration(30), "30 s");
  assert.equal(formatDuration(75), "1 min 15 s");
  assert.equal(formatDuration(7200), "2 h");
});
test("percent, marks, numbers, score", () => {
  assert.equal(formatPercent(70), "70%");
  assert.equal(formatPercent(66.666), "66.7%");
  assert.equal(formatPercent(null), "—");
  assert.equal(formatMarks(2), "[2]");
  assert.equal(formatMarks(0.5), "[0.5]");
  assert.equal(formatQuestionNumber(3), "03");
  assert.equal(formatQuestionNumber(12), "12");
  assert.equal(formatScore(42, 60), "42 / 60");
});
