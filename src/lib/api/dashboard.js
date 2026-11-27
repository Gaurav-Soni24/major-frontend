import { api, unwrap } from "./client.js";

/**
 * Teacher dashboard summary: one request, real numbers computed by the server.
 * @returns {Promise<{ success: boolean, totals: { quizzes: number, published: number, drafts: number, attempts: number, submitted: number, inProgress: number, flagged: number, avgPercentage: number, passRate: number }, activity: Array<{ date: string, attempts: number, submitted: number }>, recentSubmissions: Array<{ _id: string, quizId: string, quizTitle: string, name: string, email: string, status: string, percentage: number|null, submittedAt: string|null, isFlagged: boolean }>, recentQuizzes: Array<{ _id: string, title: string, isPublic: boolean, createdAt: string, attempts: number }> }>}
 */
export function getDashboardSummary() {
  return unwrap(api.get("/dashboard/summary"));
}
