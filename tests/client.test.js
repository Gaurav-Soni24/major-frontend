import { test } from "node:test";
import assert from "node:assert/strict";
import { createApiClient, studentConfig, PUBLIC } from "../src/lib/api/client.js";
import { ApiError } from "../src/lib/api/errors.js";
import { createSessionStore } from "../src/lib/auth/storage.js";

function memStore(initial = {}) {
  const m = new Map(Object.entries(initial));
  return createSessionStore(() => ({
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
  }));
}

/** Adapter that records the request and answers with the given status and body. */
function adapterFor(status, data, seen) {
  return async (config) => {
    seen.push(config);
    const res = { data, status, statusText: "", headers: {}, config, request: {} };
    if (status >= 200 && status < 300) return res;
    const err = new Error(`status ${status}`);
    err.response = res;
    err.config = config;
    throw err;
  };
}

test("attaches the teacher token and uses the normalised base URL", async () => {
  const seen = [];
  const client = createApiClient({ baseURL: "http://h/api", session: memStore({ token: "T" }), adapter: adapterFor(200, { success: true }, seen) });
  await client.get("/quizzes/my-quizzes");
  assert.equal(seen[0].headers.get("Authorization"), "Bearer T");
  assert.equal(seen[0].baseURL, "http://h/api");
});
test("public calls carry no teacher token", async () => {
  const seen = [];
  const client = createApiClient({ baseURL: "http://h/api", session: memStore({ token: "T" }), adapter: adapterFor(200, {}, seen) });
  await client.post("/auth/login", {}, PUBLIC);
  assert.ok(!seen[0].headers.get("Authorization"));
});
test("student calls send Student and attempt tokens, not the teacher token", async () => {
  const seen = [];
  const client = createApiClient({ baseURL: "http://h/api", session: memStore({ token: "T" }), adapter: adapterFor(200, {}, seen) });
  await client.put("/submissions/1/answers", {}, studentConfig("S", "A"));
  assert.equal(seen[0].headers.get("Authorization"), "Student S");
  assert.equal(seen[0].headers.get("X-Attempt-Token"), "A");
});
test("a 401 on a teacher call clears the session and triggers the redirect once", async () => {
  const store = memStore({ token: "T", userId: "u" });
  let redirects = 0;
  const client = createApiClient({
    baseURL: "http://h/api",
    session: store,
    onUnauthorized: () => redirects++,
    adapter: adapterFor(401, { success: false, code: "UNAUTHENTICATED", message: "expired" }, []),
  });
  await assert.rejects(client.get("/dashboard/summary"), (e) => e instanceof ApiError && e.status === 401 && e.code === "UNAUTHENTICATED");
  assert.equal(store.getToken(), null);
  assert.equal(redirects, 1);
});
test("a 401 on login (public) is a normal error, no redirect", async () => {
  const store = memStore({ token: "T" });
  let redirects = 0;
  const client = createApiClient({ baseURL: "http://h/api", session: store, onUnauthorized: () => redirects++, adapter: adapterFor(401, { message: "Invalid email or password" }, []) });
  await assert.rejects(client.post("/auth/login", {}, PUBLIC), (e) => e.message === "Invalid email or password");
  assert.equal(redirects, 0);
  assert.equal(store.getToken(), "T");
});
test("network errors become friendly ApiErrors", async () => {
  const client = createApiClient({
    baseURL: "http://h/api",
    session: memStore(),
    adapter: async (config) => {
      const e = new Error("Network Error");
      e.code = "ERR_NETWORK";
      e.request = {};
      e.config = config;
      throw e;
    },
  });
  await assert.rejects(client.get("/x"), (e) => e.code === "NETWORK_ERROR");
});
