/**
 * Server-reported issues (from `ApiError.details`) stay visible only while the value they refer to is unchanged,
 * so an error disappears as soon as the teacher edits the field it was about.
 */

/** The part of the draft an issue points at, as a list compared with Object.is item by item. */
export function issueRef(draft, issue) {
  if (issue.scope === "question") return [draft.questions.find((q) => q.id === issue.qid)];
  if (issue.scope === "list") return [draft.questions];
  if (issue.scope === "details") {
    if (issue.field === "title") return [draft.title];
    if (issue.field === "description") return [draft.description];
    return [draft.instructions];
  }
  switch (issue.field) {
    case "timeLimit":
      return [draft.timeLimitOn, draft.timeLimit];
    case "passingScore":
      return [draft.passingScore];
    case "toleranceStrikes":
    case "antiCheat":
      return [draft.antiCheat];
    case "password":
      return [draft.passwordMode, draft.passwordValue];
    case "settings":
      return [draft.settings];
    default:
      return [draft.customFields];
  }
}

const same = (a, b) => a.length === b.length && a.every((x, i) => Object.is(x, b[i]));

/** Wraps issues with the refs of the draft they were reported for. */
export function stampIssues(issues, draft) {
  return issues.map((issue) => ({ issue, ref: issueRef(draft, issue) }));
}

/** Issues that still apply to `draft`. */
export function liveIssues(stamped, draft) {
  return stamped.filter((s) => same(s.ref, issueRef(draft, s.issue))).map((s) => s.issue);
}
