import { test } from "node:test";
import assert from "node:assert/strict";
import { createSessionStore, STORAGE_KEYS } from "../src/lib/auth/storage.js";
import { safeNext, loginUrl } from "../src/lib/auth/redirect.js";

function fakeStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    _m: m,
  };
}

test("save, read and clear use the backward compatible keys", () => {
  const s = fakeStorage();
  const store = createSessionStore(() => s);
  assert.equal(store.getToken(), null);
  assert.equal(store.save({ token: "t1", userId: "u1", user: { name: "A", email: "a@b.co", role: "teacher" } }), true);
  assert.equal(s._m.get("token"), "t1");
  assert.equal(s._m.get("userId"), "u1");
  assert.equal(JSON.parse(s._m.get(STORAGE_KEYS.user)).name, "A");
  assert.equal(store.getSnapshot().user.email, "a@b.co");
  store.clear();
  assert.equal(store.getToken(), null);
  assert.equal(s._m.size, 0);
});
test("snapshot is referentially stable until values change", () => {
  const s = fakeStorage({ token: "t" });
  const store = createSessionStore(() => s);
  assert.equal(store.getSnapshot(), store.getSnapshot());
  const first = store.getSnapshot();
  s.setItem("token", "t2");
  assert.notEqual(store.getSnapshot(), first);
});
test("old sessions without a user still read as signed in", () => {
  const store = createSessionStore(() => fakeStorage({ token: "t", userId: "u" }));
  const snap = store.getSnapshot();
  assert.equal(snap.token, "t");
  assert.equal(snap.user, null);
});
test("corrupt user JSON is ignored", () => {
  const store = createSessionStore(() => fakeStorage({ token: "t", user: "{nope" }));
  assert.equal(store.getSnapshot().user, null);
  const arr = createSessionStore(() => fakeStorage({ token: "t", user: "[1]" }));
  assert.equal(arr.getSnapshot().user, null);
});
test("never throws when storage is missing or blocked", () => {
  const none = createSessionStore(() => null);
  assert.equal(none.getToken(), null);
  assert.equal(none.save({ token: "x" }), false);
  none.clear();
  const blocked = createSessionStore(() => {
    throw new Error("SecurityError");
  });
  assert.equal(blocked.getToken(), null);
  assert.equal(blocked.save({ token: "x" }), false);
  const boom = () => {
    throw new Error("x");
  };
  const t = createSessionStore(() => ({ getItem: boom, setItem: boom, removeItem: boom }));
  assert.equal(t.getToken(), null);
  assert.equal(t.save({ token: "x" }), false);
  t.clear();
});
test("subscribers are notified on save and clear", () => {
  const store = createSessionStore(() => fakeStorage());
  let n = 0;
  const off = store.subscribe(() => n++);
  store.save({ token: "t" });
  store.clear();
  off();
  store.save({ token: "t" });
  assert.equal(n, 2);
});
test("safeNext only allows same-site paths", () => {
  assert.equal(safeNext("/dashboard/quizzes?x=1"), "/dashboard/quizzes?x=1");
  assert.equal(safeNext("https://evil.example"), "/dashboard");
  assert.equal(safeNext("//evil.example"), "/dashboard");
  assert.equal(safeNext("/\\evil"), "/dashboard");
  assert.equal(safeNext(null), "/dashboard");
  assert.equal(safeNext("/login"), "/dashboard");
  assert.equal(safeNext("javascript:alert(1)", "/x"), "/x");
});
test("loginUrl encodes the next path", () => {
  assert.equal(loginUrl("/dashboard/quizzes?a=b"), "/login?next=%2Fdashboard%2Fquizzes%3Fa%3Db");
  assert.equal(loginUrl("/login"), "/login");
  assert.equal(loginUrl(undefined), "/login");
});
