"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Icon, Mark, Skeleton, Tick } from "@/components/ui";
import { submissions } from "@/lib/api";
import { formatDateTime, formatPercent } from "@/lib/utils/format";
import { Notice } from "./Shell";
import styles from "./result.module.css";

const REASON_NOTE = {
  time: "Your time ran out, so your saved answers were submitted automatically.",
  expired: "Your time ran out, so your saved answers were submitted automatically.",
  strikes: "Your quiz was submitted automatically because the limit of tab switches set by your teacher was reached.",
};

function answerText(value) {
  if (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) return null;
  return Array.isArray(value) ? value.join(", ") : String(value);
}

function Verdict({ item }) {
  const full = item.marksObtained >= item.marks && item.marks > 0;
  const none = !item.marksObtained;
  if (item.needsReview) return <span className={`${styles.verdictInline} ${styles.vPart}`}>Needs review</span>;
  if (full) {
    return (
      <span className={`${styles.verdictInline} ${styles.vOk}`}>
        <Tick size={14} color="currentColor" /> Correct
      </span>
    );
  }
  if (none) {
    return (
      <span className={`${styles.verdictInline} ${styles.vBad}`}>
        <Icon name="x" size={14} /> Incorrect
      </span>
    );
  }
  return <span className={`${styles.verdictInline} ${styles.vPart}`}>Partly correct</span>;
}

function ReviewItem({ item, n }) {
  const mine = answerText(item.userAnswer);
  const correct = answerText(item.correctAnswer);
  const code = item.type === "code";
  const show = (t) => (code ? <pre>{t}</pre> : t);
  return (
    <li className={styles.item}>
      <span className={styles.num}>{String(n).padStart(2, "0")}</span>
      <p className={styles.qtext}>{item.text}</p>
      <div className={styles.markCol}>
        <Mark value={item.marks} obtained={item.marksObtained} />
        <Verdict item={item} />
      </div>
      <dl className={styles.detail}>
        <div className={styles.row}>
          <dt>Your answer</dt>
          <dd>{mine ? show(mine) : <em>No answer</em>}</dd>
        </div>
        {correct ? (
          <div className={styles.row}>
            <dt>{item.type === "text" || code ? "Reference" : "Correct answer"}</dt>
            <dd>{show(correct)}</dd>
          </div>
        ) : null}
        {item.aiFeedback ? (
          <div className={styles.row}>
            <dt>Feedback</dt>
            <dd className={styles.feedback}>{item.aiFeedback}</dd>
          </div>
        ) : null}
      </dl>
    </li>
  );
}

/** The marks slip and, when the teacher allows it, the marked paper. */
export function ResultView({ result, title, reason, headingLevel = 1, showPortalLink = true }) {
  const H = `h${headingLevel}`;
  const s = result.score || { totalMarks: 0, obtainedMarks: 0, percentage: 0 };
  const items = result.result && Array.isArray(result.result.questions) ? result.result.questions : null;
  const hasPass = Number(result.passingScore) > 0;
  const note = (reason && REASON_NOTE[reason]) || (result.late ? "This was submitted after the time limit. Only answers saved before the deadline were marked." : null);

  return (
    <div className={styles.wrap}>
      <section className={styles.slip} aria-labelledby="slip-h">
        <div>
          {title ? <p className={styles.kicker}>{title}</p> : null}
          <H id="slip-h">{reason === "already" ? "Your result" : "Quiz submitted"}</H>
        </div>
        {note ? <Notice tone="info">{note}</Notice> : null}
        <div className={styles.scoreRow}>
          <span className={styles.score} data-testid="score">
            {s.obtainedMarks} / {s.totalMarks}
          </span>
          <span className={styles.pct} data-testid="percentage">
            {formatPercent(s.percentage)}
          </span>
        </div>
        {hasPass ? (
          <p className={`${styles.verdict} ${result.passed ? styles.verdictPass : styles.verdictFail}`} data-testid="verdict">
            {result.passed ? <Tick size={20} color="currentColor" /> : <Icon name="x" size={20} />}
            {result.passed ? "Passed" : "Not passed"}
            <small>Pass mark {result.passingScore}%</small>
          </p>
        ) : null}
        {result.needsReview ? (
          <Notice tone="warn">Some answers are waiting for your teacher to review, so this score may change.</Notice>
        ) : null}
        {result.submittedAt ? <p className={styles.meta}>Submitted {formatDateTime(result.submittedAt)} UTC</p> : null}
        {showPortalLink ? (
          <div className={styles.actions}>
            <Button href="/student" variant="secondary">
              View all my results
            </Button>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="paper-h">
        <h2 id="paper-h" className={styles.reviewTitle}>
          Your marked paper
        </h2>
        {items ? (
          items.length ? (
            <ol className={styles.items}>
              {items.map((it, i) => (
                <ReviewItem key={i} item={it} n={i + 1} />
              ))}
            </ol>
          ) : (
            <p className={styles.quiet}>There are no questions to show.</p>
          )
        ) : (
          <p className={styles.quiet}>Your teacher chose not to show answers for this quiz.</p>
        )}
      </section>
    </div>
  );
}

/** Loads a result by submission id (page refresh, or the student portal) and shows it. */
export function ResultLoader({ submissionId, tokens, title, reason, headingLevel, showPortalLink }) {
  const [state, setState] = useState({ status: "loading", result: null, error: null });
  const [attempt, setAttempt] = useState(0);
  const tokenKey = `${tokens.attemptToken || ""}|${tokens.studentToken || ""}`;

  useEffect(() => {
    let alive = true;
    submissions.getResult(submissionId, tokens).then(
      (result) => alive && setState({ status: "ok", result, error: null }),
      (error) => alive && setState({ status: "error", result: null, error }),
    );
    return () => {
      alive = false;
    };
    // tokens is read through tokenKey so a new object each render does not refetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId, tokenKey, attempt]);

  const retry = useCallback(() => {
    setState({ status: "loading", result: null, error: null });
    setAttempt((n) => n + 1);
  }, []);

  if (state.status === "loading") {
    return (
      <div role="status" aria-label="Loading your result">
        <Skeleton height={220} />
      </div>
    );
  }
  if (state.status === "error") {
    const gone = state.error && (state.error.status === 401 || state.error.status === 403 || state.error.status === 404);
    return (
      <Notice tone="error">
        {gone ? "We could not open this result. Sign in again from your results page." : state.error.message}{" "}
        {gone ? (
          <Button size="sm" variant="secondary" href="/student">
            Go to my results
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={retry}>
            Try again
          </Button>
        )}
      </Notice>
    );
  }
  return <ResultView result={state.result} title={title} reason={reason} headingLevel={headingLevel} showPortalLink={showPortalLink} />;
}
