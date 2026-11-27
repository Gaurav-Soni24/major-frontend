/**
 * Validation rules identical to docs/API_CONTRACT.md (auth section).
 * Each validator returns an error message string, or "" when the value is valid.
 */

export const NAME_MIN = 2;
export const NAME_MAX = 80;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** @param {string} value */
export function validateName(value) {
  const v = String(value ?? "").trim();
  if (!v) return "Enter your name.";
  if (v.length < NAME_MIN) return `Name must be at least ${NAME_MIN} characters.`;
  if (v.length > NAME_MAX) return `Name must be at most ${NAME_MAX} characters.`;
  return "";
}

/** @param {string} value */
export function validateEmail(value) {
  const v = String(value ?? "").trim();
  if (!v) return "Enter your email address.";
  if (!EMAIL_RE.test(v)) return "Enter a valid email address.";
  return "";
}

/** @param {string} value */
export function validatePassword(value) {
  const v = String(value ?? "");
  if (!v) return "Enter a password.";
  if (v.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters.`;
  if (v.length > PASSWORD_MAX) return `Password must be at most ${PASSWORD_MAX} characters.`;
  return "";
}

/** For the login form we only require that something was typed. */
export function validateLoginPassword(value) {
  return String(value ?? "") ? "" : "Enter your password.";
}

/**
 * Run a rule map over values and return only the failing fields.
 * @param {Record<string,string>} values
 * @param {Record<string,(v:string)=>string>} rules
 * @returns {Record<string,string>}
 */
export function validateFields(values, rules) {
  /** @type {Record<string,string>} */
  const errors = {};
  for (const [field, rule] of Object.entries(rules)) {
    const message = rule(values[field]);
    if (message) errors[field] = message;
  }
  return errors;
}

export const registerRules = { name: validateName, email: validateEmail, password: validatePassword };
export const loginRules = { email: validateEmail, password: validateLoginPassword };
