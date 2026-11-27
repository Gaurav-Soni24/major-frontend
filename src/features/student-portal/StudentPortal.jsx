"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Dialog, EmptyState, Skeleton } from "@/components/ui";
import GoogleButton from "@/components/auth/GoogleButton";
import { submissions } from "@/lib/api";
import { formatDate, formatPercent, pluralize } from "@/lib/utils/format";
import { createAttemptStorage } from "@/features/attempt/lib/storage.js";
import Shell, { Notice } from "@/features/attempt/components/Shell";
import { ResultLoader } from "@/features/attempt/components/ResultView";
import screens from "@/features/attempt/components/screens.module.css";
import styles from "./portal.module.css";

const storage = createAttemptStorage();
const PORTAL = "portal";

function ResultBadge({ s }) {
  if (s.status === "in-progress") return <Badge status="in-progress" />;
  if (s.score && s.score.percentage !== undefined && typeof s.passed === "boolean") return <Badge status={s.passed ? "passed" : "failed"} />;
  return <Badge status={s.status === "graded" ? "graded" : "submitted"} />;
}

function Row({ s, onOpen }) {
  const score = s.score || {};
  return (
    <li className={styles.row}>
      <div>
        <p className={styles.qTitle}>{s.quizTitle || "Untitled quiz"}</p>
      </div>
      <span className={styles.date}>{s.submittedAt ? formatDate(s.submittedAt) : "Not submitted"}</span>
      <span className={styles.score}>
        {score.totalMarks !== undefined ? `${score.obtainedMarks} / ${score.totalMarks}` : "-"}
        {score.percentage !== undefined ? <span className={styles.pct}>{formatPercent(score.percentage)}</span> : null}
      </span>
      <ResultBadge s={s} />
      <span>
        {s.status === "in-progress" ? (
          <Button size="sm" variant="secondary" href={`/attempt/${s.quizId}`}>
            Continue quiz
          </Button>
        ) : (
          <Button size="sm" variant="secondary" aria-label={`View result for ${s.quizTitle || "quiz"}`} onClick={() => onOpen(s)}>
            View result
          </Button>
        )}
      </span>
    </li>
  );
}

function SignedOut({ onCredential, onError, notice, error }) {
  return (
    <Shell narrow>
      <section className={screens.card} aria-labelledby="portal-h">
        <div>
          <h1 id="portal-h">My results</h1>
          <p className={screens.sub}>Sign in with the Google account you used for your quizzes to see your scores.</p>
        </div>
        {notice ? <Notice tone="warn">{notice}</Notice> : null}
        {error ? <Notice tone="error">{error}</Notice> : null}
        <GoogleButton onCredential={onCredential} onError={onError} text="signin_with" />
        <p className={screens.fineprint}>Only you can see your results. Quizify checks your Google sign-in before showing them.</p>
      </section>
    </Shell>
  );
}

export default function StudentPortal() {
  const [student, setStudent] = useState(null);
  const [ready, setReady] = useState(false);
  const [list, setList] = useState({ status: "idle", items: [], error: null });
  const [signInError, setSignInError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [open, setOpen] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  // restore the session for this tab
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStudent(storage.getStudent(PORTAL));
    setReady(true);
  }, []);

  const email = student && student.email;
  const token = student && student.studentToken;
  useEffect(() => {
    if (!email) return undefined;
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setList((l) => ({ ...l, status: "loading", error: null }));
    submissions.getStudentSubmissions(email, token).then(
      (res) => {
        if (!alive) return;
        const items = (res.submissions || []).slice().sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
        setList({ status: "ok", items, error: null });
      },
      (error) => {
        if (!alive) return;
        if (error && (error.status === 401 || error.status === 403)) {
          storage.clearStudent(PORTAL);
          setStudent(null);
          setNotice("Your sign-in expired. Please sign in again.");
        } else {
          setList({ status: "error", items: [], error });
        }
      },
    );
    return () => {
      alive = false;
    };
  }, [email, token, reloadKey]);

  const onCredential = useCallback(async (credential) => {
    setSignInError(null);
    setNotice(null);
    try {
      const res = await submissions.verifyGoogle({ quizId: "portal-auth", credential });
      const who = { studentToken: res.studentToken, email: res.email, name: res.name };
      storage.setStudent(PORTAL, who);
      setStudent(who);
    } catch (err) {
      setSignInError((err && err.message) || "Sign-in failed. Try again.");
    }
  }, []);

  const signOut = () => {
    storage.clearStudent(PORTAL);
    setStudent(null);
    setList({ status: "idle", items: [], error: null });
    setOpen(null);
  };

  if (!ready) {
    return (
      <Shell>
        <Skeleton height={40} width="40%" />
      </Shell>
    );
  }
  if (!student) return <SignedOut onCredential={onCredential} onError={setSignInError} notice={notice} error={signInError} />;

  return (
    <Shell student={student} onSignOut={signOut}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>My results</h1>
          <p className={styles.lede}>Quizzes you have attempted with {student.email}.</p>
        </div>
        {list.status === "ok" && list.items.length ? <p className={styles.sub}>{pluralize(list.items.length, "quiz", "quizzes")}</p> : null}
      </div>

      {list.status === "loading" || list.status === "idle" ? (
        <div role="status" aria-label="Loading your results" style={{ display: "grid", gap: 8 }}>
          <Skeleton height={56} />
          <Skeleton height={56} />
          <Skeleton height={56} />
        </div>
      ) : null}

      {list.status === "error" ? (
        <Notice tone="error">
          {list.error && list.error.message}{" "}
          <Button size="sm" variant="secondary" onClick={() => setReloadKey((n) => n + 1)}>
            Try again
          </Button>
        </Notice>
      ) : null}

      {list.status === "ok" && list.items.length === 0 ? (
        <EmptyState title="No quizzes yet" action={<Button variant="secondary" onClick={() => setReloadKey((n) => n + 1)}>Check again</Button>}>
          When you submit a quiz with this Google account, your score will appear here.
        </EmptyState>
      ) : null}

      {list.status === "ok" && list.items.length ? (
        <div className={styles.box}>
          <div className={styles.colHead} aria-hidden="true">
            <span>Quiz</span>
            <span>Submitted</span>
            <span>Score</span>
            <span>Result</span>
            <span />
          </div>
          <ul className={styles.ledger} aria-label="Your quizzes">
            {list.items.map((s) => (
              <Row key={s._id} s={s} onOpen={setOpen} />
            ))}
          </ul>
        </div>
      ) : null}

      <Dialog open={!!open} onClose={() => setOpen(null)} title={open ? open.quizTitle || "Result" : ""} size="lg">
        {open ? <ResultLoader submissionId={open._id} tokens={{ studentToken: token }} reason="already" headingLevel={3} showPortalLink={false} /> : null}
      </Dialog>
    </Shell>
  );
}
