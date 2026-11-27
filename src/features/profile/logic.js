/** Pure helpers for the profile form (unit tested in tests/profile-logic.test.js). Limits mirror the API contract. */

export const LIMITS = { name: { min: 2, max: 80 }, bio: 500, department: 100, institution: 150, password: { min: 8, max: 72 } };
export const FIELDS = ["name", "bio", "department", "institution"];

/** Build form values from `auth.getProfile().data`. */
export function toFormValues(data) {
  const p = (data && data.profile) || {};
  return { name: (data && data.name) || "", bio: p.bio || "", department: p.department || "", institution: p.institution || "" };
}

/** @param {Record<string,string>} a @param {Record<string,string>} b */
export function isDirty(a, b) {
  return FIELDS.some((f) => (a[f] || "").trim() !== (b[f] || "").trim());
}

/** Field errors for the details form. @param {Record<string,string>} v */
export function validateDetails(v) {
  /** @type {Record<string,string>} */
  const e = {};
  const name = (v.name || "").trim();
  if (!name) e.name = "Enter your name.";
  else if (name.length < LIMITS.name.min) e.name = `Name must be at least ${LIMITS.name.min} characters.`;
  else if (name.length > LIMITS.name.max) e.name = `Name must be at most ${LIMITS.name.max} characters.`;
  if ((v.bio || "").trim().length > LIMITS.bio) e.bio = `Bio must be at most ${LIMITS.bio} characters.`;
  if ((v.department || "").trim().length > LIMITS.department) e.department = `Department must be at most ${LIMITS.department} characters.`;
  if ((v.institution || "").trim().length > LIMITS.institution) e.institution = `Institution must be at most ${LIMITS.institution} characters.`;
  return e;
}

/** Only the changed fields, trimmed (the server leaves undefined fields alone). */
export function detailsPayload(initial, current) {
  /** @type {Record<string,string>} */
  const out = {};
  for (const f of FIELDS) if ((initial[f] || "").trim() !== (current[f] || "").trim()) out[f] = (current[f] || "").trim();
  return out;
}

/**
 * @param {{ hasPassword: boolean, current: string, next: string, confirm: string }} v
 * @returns {Record<string,string>}
 */
export function validatePasswordChange({ hasPassword, current, next, confirm }) {
  /** @type {Record<string,string>} */
  const e = {};
  if (hasPassword && !current) e.currentPassword = "Enter your current password.";
  if (!next) e.newPassword = "Enter a new password.";
  else if (next.length < LIMITS.password.min) e.newPassword = `Use at least ${LIMITS.password.min} characters.`;
  else if (next.length > LIMITS.password.max) e.newPassword = `Use at most ${LIMITS.password.max} characters.`;
  else if (hasPassword && current && next === current) e.newPassword = "Choose a password different from the current one.";
  if (!e.newPassword && confirm !== next) e.confirmPassword = "The two passwords do not match.";
  return e;
}

/** Calm length-based hint. Returns `{ level: 0-3, text }`; level 0 means nothing typed. */
export function passwordHint(pw) {
  const n = String(pw || "").length;
  const { min, max } = LIMITS.password;
  if (!n) return { level: 0, text: `${min} to ${max} characters.` };
  if (n < min) return { level: 1, text: `${min - n} more ${min - n === 1 ? "character" : "characters"} needed.` };
  if (n < 12) return { level: 2, text: "Long enough. A few more characters would make it stronger." };
  return { level: 3, text: "Good length." };
}

/** @param {string|undefined} provider @param {boolean} hasPassword */
export function signInMethod(provider, hasPassword) {
  if (provider === "google") return hasPassword ? "Google and password" : "Google";
  return "Email and password";
}

/** Server field name -> form control. `newPassword` and `currentPassword` map to themselves. */
export function mapServerFields(fieldErrors) {
  return { ...(fieldErrors || {}) };
}
