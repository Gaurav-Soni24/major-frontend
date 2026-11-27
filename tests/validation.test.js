import { test } from "node:test";
import assert from "node:assert/strict";
import { validateName, validateEmail, validatePassword, validateFields, registerRules, loginRules } from "../src/lib/validation/rules.js";

test("name 2-80 characters", () => {
  assert.notEqual(validateName(""), "");
  assert.notEqual(validateName("A"), "");
  assert.equal(validateName("Al"), "");
  assert.equal(validateName("x".repeat(80)), "");
  assert.notEqual(validateName("x".repeat(81)), "");
  assert.notEqual(validateName("   "), "");
});
test("email format", () => {
  assert.equal(validateEmail("a@b.co"), "");
  assert.notEqual(validateEmail("a@b"), "");
  assert.notEqual(validateEmail("a b@c.com"), "");
  assert.notEqual(validateEmail(""), "");
});
test("password 8-72", () => {
  assert.notEqual(validatePassword("1234567"), "");
  assert.equal(validatePassword("12345678"), "");
  assert.equal(validatePassword("x".repeat(72)), "");
  assert.notEqual(validatePassword("x".repeat(73)), "");
});
test("validateFields returns only failing fields", () => {
  assert.deepEqual(validateFields({ name: "Ann", email: "ann@x.io", password: "longenough" }, registerRules), {});
  const errs = validateFields({ name: "", email: "bad", password: "x" }, registerRules);
  assert.deepEqual(Object.keys(errs).sort(), ["email", "name", "password"]);
  assert.deepEqual(Object.keys(validateFields({ email: "a@b.co", password: "" }, loginRules)), ["password"]);
});
