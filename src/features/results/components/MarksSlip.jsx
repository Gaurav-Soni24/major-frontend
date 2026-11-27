import { Badge } from "@/components/ui";
import { formatDateTime, formatDuration, formatPercent } from "@/lib/utils/format";
import { durationSeconds, isDone, passedOf } from "../logic/status";
import { PassMark, StatusBadges } from "./StatusBadges";
import styles from "./detail.module.css";

/**
 * The marks slip: score, percentage, pass/fail, and the session facts (timestamps, duration against the limit, custom data).
 * @param {{ submission: any, quiz: any }} props
 */
export default function MarksSlip({ submission, quiz }) {
  const s = submission;
  const done = isDone(s);
  const passed = passedOf(s, quiz.passingScore);
  const dur = durationSeconds(s);
  const custom = Object.entries(s.userDetails?.customData || {});
  const limitSec = quiz.timeLimit ? quiz.timeLimit * 60 : null;

  return (
    <section className={styles.slip} aria-label="Marks slip">
      <div className={styles.slipScore}>
        {done ? (
          <>
            <p className={styles.slipLabel}>Marks</p>
            <p className={styles.slipFigure}>
              {s.score?.obtainedMarks ?? 0}
              <span className={styles.slipOf}> / {s.score?.totalMarks ?? 0}</span>
            </p>
            <p className={styles.slipPct}>
              {formatPercent(s.score?.percentage)}
              <PassMark passed={passed} />
            </p>
            <p className={styles.slipMark}>Pass mark {quiz.passingScore}%</p>
          </>
        ) : (
          <>
            <p className={styles.slipLabel}>Marks</p>
            <p className={styles.slipFigure}>—</p>
            <p className={styles.slipMark}>{s.status === "in-progress" ? "Attempt in progress, not graded yet." : "No score recorded."}</p>
          </>
        )}
      </div>
      <dl className={styles.facts}>
        <div>
          <dt>Status</dt>
          <dd>
            <StatusBadges submission={s} />
          </dd>
        </div>
        <div>
          <dt>Started</dt>
          <dd>{formatDateTime(s.startedAt)}</dd>
        </div>
        <div>
          <dt>Submitted</dt>
          <dd>{s.submittedAt ? formatDateTime(s.submittedAt) : "Not submitted"}</dd>
        </div>
        <div>
          <dt>Time taken</dt>
          <dd>
            {dur === null ? "—" : formatDuration(dur)}
            {limitSec ? <span className={styles.factHint}> of {formatDuration(limitSec)} allowed</span> : <span className={styles.factHint}> (no time limit)</span>}
          </dd>
        </div>
        {s.gradedAt ? (
          <div>
            <dt>Graded</dt>
            <dd>{formatDateTime(s.gradedAt)}</dd>
          </div>
        ) : null}
        {custom.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{String(v)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Plain-language notices above the slip. */
export function Notices({ submission }) {
  const s = submission;
  const items = [];
  if (s.status === "in-progress") items.push({ key: "p", tone: "info", text: "This attempt is still in progress. Marks appear once the student submits or the time runs out." });
  if (s.status === "abandoned") items.push({ key: "ab", tone: "neutral", text: "This attempt was abandoned." });
  if (s.needsReview) items.push({ key: "nr", tone: "partial", text: "Some answers could not be graded automatically. They score 0 until you award marks." });
  if (s.late) items.push({ key: "l", tone: "partial", text: "Submitted after the deadline. Only answers saved before the deadline were graded." });
  if (s.antiCheat?.wasAutoSubmitted) items.push({ key: "a", tone: "neutral", text: "Submitted automatically (time ran out or the strike limit was reached). Marks come from the answers saved at that point." });
  if (!items.length) return null;
  return (
    <ul className={styles.notices} aria-label="Notices">
      {items.map((n) => (
        <li key={n.key}>
          <Badge tone={n.tone}>{n.tone === "info" ? "Info" : "Note"}</Badge>
          <span>{n.text}</span>
        </li>
      ))}
    </ul>
  );
}
