import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeBaseUrl } from "../src/lib/api/config.js";

test("adds /api when missing", () => {
  assert.equal(normalizeBaseUrl("http://localhost:5000"), "http://localhost:5000/api");
});
test("keeps /api when present and strips trailing slashes", () => {
  assert.equal(normalizeBaseUrl("http://localhost:5000/api"), "http://localhost:5000/api");
  assert.equal(normalizeBaseUrl("https://x.onrender.com/api///"), "https://x.onrender.com/api");
  assert.equal(normalizeBaseUrl("https://x.onrender.com/"), "https://x.onrender.com/api");
});
test("falls back to localhost when empty", () => {
  assert.equal(normalizeBaseUrl(""), "http://localhost:5000/api");
  assert.equal(normalizeBaseUrl(undefined), "http://localhost:5000/api");
  assert.equal(normalizeBaseUrl("   "), "http://localhost:5000/api");
});
