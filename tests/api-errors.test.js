import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiError, toApiError } from "../src/lib/api/errors.js";

const resp = (status, data) => ({ response: { status, data } });

test("maps the contract error shape", () => {
  const e = toApiError(
    resp(400, { success: false, code: "VALIDATION_ERROR", message: "Check the form.", details: [{ field: "email", message: "Invalid" }] }),
  );
  assert.ok(e instanceof ApiError);
  assert.equal(e.status, 400);
  assert.equal(e.code, "VALIDATION_ERROR");
  assert.equal(e.message, "Check the form.");
  assert.deepEqual(e.fieldErrors, { email: "Invalid" });
});
test("tolerates the old { success, message } shape", () => {
  const e = toApiError(resp(404, { success: false, message: "Quiz not found" }));
  assert.equal(e.code, "NOT_FOUND");
  assert.equal(e.message, "Quiz not found");
  assert.deepEqual(e.details, []);
});
test("uses friendly text when the body is empty or HTML", () => {
  assert.match(toApiError(resp(500, "<html>boom</html>")).message, /server had a problem/i);
  assert.equal(toApiError(resp(500, undefined)).code, "INTERNAL");
  assert.match(toApiError(resp(429, {})).message, /too many/i);
});
test("network failure and timeout", () => {
  const net = toApiError({ request: {}, message: "Network Error", code: "ERR_NETWORK" });
  assert.equal(net.code, "NETWORK_ERROR");
  assert.equal(net.status, 0);
  assert.match(net.message, /could not reach/i);
  assert.equal(toApiError({ code: "ECONNABORTED", message: "timeout of 100ms exceeded" }).code, "TIMEOUT");
  assert.equal(toApiError({ code: "ERR_CANCELED" }).code, "CANCELED");
});
test("passes an ApiError through and wraps unknown values", () => {
  const original = new ApiError({ status: 409, code: "CONFLICT", message: "x" });
  assert.equal(toApiError(original), original);
  assert.equal(toApiError(undefined).code, "UNKNOWN");
  assert.equal(toApiError(new Error("oops")).message, "oops");
});
test("normalises string details", () => {
  const e = toApiError(resp(400, { details: ["Title too short", { param: "title", msg: "bad" }] }));
  assert.equal(e.details.length, 2);
  assert.equal(e.details[1].field, "title");
});
