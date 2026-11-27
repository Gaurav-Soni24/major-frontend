import { api, PUBLIC, unwrap } from "./client.js";

/**
 * Auth routes. All functions resolve with the response body (`{ success, ... }`) and reject with `ApiError`.
 * @typedef {{ name: string, email: string, role: string }} User
 */

/**
 * Register a teacher account. Never sends a role (the server ignores it).
 * @param {{ name: string, email: string, password: string }} input
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export function register({ name, email, password }) {
  return unwrap(api.post("/auth/register", { name: name.trim(), email: email.trim(), password }, PUBLIC));
}

/**
 * @param {{ email: string, password: string }} input
 * @returns {Promise<{ success: boolean, token: string, userId: string, isPasswordSet?: boolean, user?: User }>}
 */
export function login({ email, password }) {
  return unwrap(api.post("/auth/login", { email: email.trim(), password }, PUBLIC));
}

/**
 * @param {string} credential Google ID token from `@react-oauth/google`
 * @returns {Promise<{ success: boolean, token: string, userId: string, isPasswordSet?: boolean, user?: User }>}
 */
export function googleLogin(credential) {
  return unwrap(api.post("/auth/google", { credential }, PUBLIC));
}

/**
 * @returns {Promise<{ success: boolean, data: { name: string, email: string, role?: string, bio?: string, department?: string, institution?: string, isPasswordSet?: boolean } }>}
 */
export function getProfile() {
  return unwrap(api.get("/auth/profile"));
}

/**
 * `currentPassword` is required by the server when the account already has a password and `newPassword` is set.
 * @param {{ name?: string, bio?: string, department?: string, institution?: string, currentPassword?: string, newPassword?: string }} input
 * @returns {Promise<{ success: boolean, data: { isPasswordSet?: boolean } }>}
 */
export function updateProfile(input) {
  return unwrap(api.put("/auth/profile", input));
}
