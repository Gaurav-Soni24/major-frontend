import { test } from "node:test";
import assert from "node:assert/strict";
import { firstName, greetingForHour, niceMax, chartModel, describeActivity, buildAttention, isFirstRun, ledgerRows, dayLabel } from "../src/features/dashboard/logic.js";
import { parseListQuery, buildListQuery, toApiParams, hasFilters, withPublished, studentLink, deleteImpact, publishFailureMessage } from "../src/features/quizzes-list/logic.js";
import { toFormValues, isDirty, validateDetails, detailsPayload, validatePasswordChange, passwordHint, signInMethod } from "../src/features/profile/logic.js";

const params = (s) => new URLSearchParams(s);

test("dashboard: names and greetings", () => {
  assert.equal(firstName("  Gaurav  Soni "), "Gaurav");
  assert.equal(firstName(""), "");
  assert.equal(firstName(null), "");
  assert.equal(greetingForHour(8), "Good morning");
  assert.equal(greetingForHour(14), "Good afternoon");
  assert.equal(greetingForHour(20), "Good evening");
  assert.equal(greetingForHour(2), "Working late");
});

test("dashboard: niceMax gives round axis maxima", () => {
  assert.equal(niceMax(0), 4);
  assert.equal(niceMax(3), 4);
  assert.equal(niceMax(5), 8);
  assert.equal(niceMax(11), 12);
  assert.equal(niceMax(13), 20);
  assert.equal(niceMax(37), 40);
  assert.equal(niceMax(101), 200);
});

const activity = (vals) => vals.map(([a, s], i) => ({ date: `2026-11-${String(10 + i).padStart(2, "0")}`, attempts: a, submitted: s }));

test("dashboard: chartModel geometry and empty detection", () => {
  const empty = chartModel(activity(Array(14).fill([0, 0])), { width: 600 });
  assert.equal(empty.empty, true);
  assert.equal(empty.bars.length, 14);
  const m = chartModel(activity([[4, 2], ...Array(13).fill([0, 0])]), { width: 600, height: 220 });
  assert.equal(m.empty, false);
  assert.equal(m.axisMax, 4);
  const first = m.bars[0];
  assert.ok(Math.abs(first.a.h - m.innerH) < 1e-9, "tallest bar fills the plot");
  assert.ok(Math.abs(first.s.h - m.innerH / 2) < 1e-9);
  assert.deepEqual(m.totals, { attempts: 4, submitted: 2 });
  assert.equal(m.ticks.length, 5);
  assert.ok(m.bars.every((b) => b.a.x >= m.margin.left && b.s.x + b.s.w <= m.width));
});

test("dashboard: describeActivity and dayLabel", () => {
  assert.equal(describeActivity(activity(Array(14).fill([0, 0]))), "No attempts in the last 14 days.");
  assert.equal(describeActivity([]), "No attempts in the last 14 days.");
  assert.match(describeActivity(activity([[1, 1], [5, 3], ...Array(12).fill([0, 0])])), /6 attempts started and 4 submitted.*Busiest day: 11 Nov with 5 attempts/);
  assert.equal(dayLabel("2026-11-27"), "27 Nov");
});

test("dashboard: attention list uses only real fields", () => {
  assert.deepEqual(buildAttention(null), []);
  const none = buildAttention({ totals: { quizzes: 2, drafts: 0, flagged: 0, inProgress: 0 }, recentSubmissions: [], recentQuizzes: [] });
  assert.deepEqual(none, []);
  const items = buildAttention({
    totals: { quizzes: 4, drafts: 2, flagged: 5, inProgress: 1 },
    recentSubmissions: [{ _id: "s1", name: "Asha", quizTitle: "Algebra", isFlagged: true }, { _id: "s2", name: "Ben", isFlagged: false }],
    recentQuizzes: [{ _id: "q1", title: "Physics", isPublic: true, attempts: 0 }, { _id: "q2", title: "Chem", isPublic: false, attempts: 0 }],
  });
  const ids = items.map((i) => i.id);
  assert.deepEqual(ids, ["flag-s1", "flagged-more", "quiet-q1", "drafts", "in-progress"]);
  assert.equal(items[0].href, "/dashboard/submissions/details/s1");
  assert.match(items[1].text, /^4 more flagged attempts/);
  assert.match(items[3].text, /^2 quizzes are still a draft/);
});

test("dashboard: first run and ledger rows", () => {
  assert.equal(isFirstRun({ totals: { quizzes: 0 } }), true);
  assert.equal(isFirstRun({ totals: { quizzes: 1 } }), false);
  assert.equal(isFirstRun(null), false);
  const fmt = { percent: (n) => `${n}%` };
  const rows = ledgerRows({ quizzes: 3, published: 2, drafts: 1, attempts: 10, submitted: 8, inProgress: 2, flagged: 1, avgPercentage: 71.5, passRate: 62.5 }, fmt);
  assert.deepEqual(rows.map((r) => r.value), ["3", "10", "1", "71.5%", "62.5%"]);
  const zero = ledgerRows({ quizzes: 1, submitted: 0 }, fmt);
  assert.equal(zero[3].value, "—");
  assert.equal(zero[4].value, "—");
});

test("quizzes list: query parse and build round trip", () => {
  assert.deepEqual(parseListQuery(params("")), { q: "", status: "all", sort: "newest", page: 1 });
  assert.deepEqual(parseListQuery(params("q=algebra&status=draft&sort=title&page=3")), { q: "algebra", status: "draft", sort: "title", page: 3 });
  assert.deepEqual(parseListQuery(params("status=evil&sort=x&page=-4")), { q: "", status: "all", sort: "newest", page: 1 });
  assert.equal(buildListQuery({ q: "", status: "all", sort: "newest", page: 1 }), "");
  assert.equal(buildListQuery({ q: " a b ", status: "published", sort: "oldest", page: 2 }), "?q=a+b&status=published&sort=oldest&page=2");
  const s = { q: "x", status: "draft", sort: "title", page: 2 };
  assert.deepEqual(parseListQuery(params(buildListQuery(s))), s);
  assert.deepEqual(toApiParams(s), { page: 2, limit: 10, search: "x", status: "draft", sort: "title" });
  assert.equal(hasFilters({ q: "", status: "all" }), false);
  assert.equal(hasFilters({ q: " ", status: "draft" }), true);
});

test("quizzes list: optimistic publish, link, delete impact, failure text", () => {
  const list = [{ _id: "a", isPublic: false }, { _id: "b", isPublic: true }];
  const next = withPublished(list, "a", true);
  assert.equal(next[0].isPublic, true);
  assert.equal(list[0].isPublic, false, "does not mutate");
  assert.equal(next[1], list[1]);
  assert.equal(studentLink("https://q.example/", "abc"), "https://q.example/attempt/abc");
  assert.match(deleteImpact({ attempts: 0 }), /only the quiz itself/);
  assert.match(deleteImpact({ attempts: 1, submitted: 1, inProgress: 0 }), /deletes 1 attempt \(1 submitted\)/);
  assert.match(deleteImpact({ attempts: 12, submitted: 9, inProgress: 3 }), /12 attempts \(9 submitted, 3 in progress\)/);
  assert.match(publishFailureMessage({ status: 400, message: "Quiz is invalid", details: [{ message: "Question 2 needs a correct answer" }] }), /Question 2 needs a correct answer/);
  assert.match(publishFailureMessage({ status: 409, message: "Cannot publish", details: [] }), /editor/);
  assert.equal(publishFailureMessage({ status: 0, message: "Offline" }), "Offline");
});

test("profile: form values, dirty and payload", () => {
  const init = toFormValues({ name: "A B", profile: { bio: "hi", department: "", institution: "GEC" } });
  assert.deepEqual(init, { name: "A B", bio: "hi", department: "", institution: "GEC" });
  assert.deepEqual(toFormValues(null), { name: "", bio: "", department: "", institution: "" });
  assert.equal(isDirty(init, { ...init, bio: "hi  " }), false);
  assert.equal(isDirty(init, { ...init, department: "CSE" }), true);
  assert.deepEqual(detailsPayload(init, { ...init, department: " CSE ", name: "A B" }), { department: "CSE" });
});

test("profile: validation limits", () => {
  assert.deepEqual(validateDetails({ name: "Ann", bio: "", department: "", institution: "" }), {});
  assert.ok(validateDetails({ name: "A" }).name);
  assert.ok(validateDetails({ name: "" }).name);
  assert.ok(validateDetails({ name: "x".repeat(81) }).name);
  assert.ok(validateDetails({ name: "Ann", bio: "x".repeat(501) }).bio);
  assert.ok(validateDetails({ name: "Ann", department: "x".repeat(101) }).department);
  assert.ok(validateDetails({ name: "Ann", institution: "x".repeat(151) }).institution);
});

test("profile: password rules for password and Google-only accounts", () => {
  assert.deepEqual(validatePasswordChange({ hasPassword: true, current: "oldpass12", next: "newpass123", confirm: "newpass123" }), {});
  assert.ok(validatePasswordChange({ hasPassword: true, current: "", next: "newpass123", confirm: "newpass123" }).currentPassword);
  assert.ok(validatePasswordChange({ hasPassword: true, current: "oldpass12", next: "short", confirm: "short" }).newPassword);
  assert.ok(validatePasswordChange({ hasPassword: true, current: "oldpass12", next: "x".repeat(73), confirm: "x".repeat(73) }).newPassword);
  assert.ok(validatePasswordChange({ hasPassword: true, current: "samepass12", next: "samepass12", confirm: "samepass12" }).newPassword);
  assert.ok(validatePasswordChange({ hasPassword: false, current: "", next: "newpass123", confirm: "different1" }).confirmPassword);
  assert.deepEqual(validatePasswordChange({ hasPassword: false, current: "", next: "newpass123", confirm: "newpass123" }), {});
});

test("profile: password hint and sign-in method", () => {
  assert.equal(passwordHint("").level, 0);
  assert.equal(passwordHint("abc").level, 1);
  assert.match(passwordHint("abc").text, /5 more characters/);
  assert.equal(passwordHint("abcdefgh").level, 2);
  assert.equal(passwordHint("abcdefghijkl").level, 3);
  assert.equal(signInMethod("google", false), "Google");
  assert.equal(signInMethod("google", true), "Google and password");
  assert.equal(signInMethod("local", true), "Email and password");
});
