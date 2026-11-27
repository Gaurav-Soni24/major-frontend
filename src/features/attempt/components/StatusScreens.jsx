"use client";

import { Button, EmptyState, Skeleton, SkeletonText } from "@/components/ui";
import Shell from "./Shell";
import styles from "./screens.module.css";

export function LoadingScreen() {
  return (
    <Shell>
      <div role="status" aria-label="Loading quiz">
        <Skeleton width="55%" height={40} />
        <div style={{ marginTop: 16 }}>
          <SkeletonText lines={2} />
        </div>
        <div style={{ marginTop: 28 }}>
          <Skeleton height={64} />
        </div>
        <div style={{ marginTop: 28 }}>
          <SkeletonText lines={4} />
        </div>
      </div>
    </Shell>
  );
}

const COPY = {
  "not-found": { title: "This quiz was not found", body: "The link may be mistyped or the quiz was removed. Ask your teacher for the link again." },
  "not-published": { title: "This quiz is not open right now", body: "Your teacher has not published it, or has closed it. Try again later or ask your teacher." },
  network: { title: "Could not reach Quizify", body: "Check your internet connection and try again. Nothing you did has been lost." },
  other: { title: "Something went wrong", body: "We could not open this quiz. Try again in a moment." },
};

export function UnavailableScreen({ error, onRetry }) {
  const kind = (error && error.kind) || "other";
  const c = COPY[kind] || COPY.other;
  return (
    <Shell narrow>
      <div className={styles.card} role="alert">
        <h1>{c.title}</h1>
        <EmptyState title={c.body} compact action={kind === "network" || kind === "other" ? <Button onClick={onRetry}>Try again</Button> : null} />
      </div>
    </Shell>
  );
}

export function AlreadySubmittedScreen({ quiz, student, onSignOut }) {
  return (
    <Shell student={student} onSignOut={onSignOut} narrow>
      <section className={styles.card} aria-labelledby="done-h">
        <div>
          <h1 id="done-h">You have already submitted this quiz</h1>
          <p className={styles.sub}>{quiz ? quiz.title : null}</p>
        </div>
        <p className={styles.plain}>Each student can attempt a quiz once. You can see your score in your results.</p>
        <div className={styles.actions}>
          <Button href="/student" size="lg">
            View my results
          </Button>
        </div>
      </section>
    </Shell>
  );
}
