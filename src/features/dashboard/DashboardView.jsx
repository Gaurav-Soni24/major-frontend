"use client";

import { Button, EmptyState, PageHeader, Panel, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import ActivityChart from "./ActivityChart";
import FirstRun from "./FirstRun";
import { AttentionList, Ledger, RecentQuizzes, RecentSubmissions } from "./Sections";
import { useDashboardSummary, useLocalHour } from "./hooks";
import { buildAttention, firstName, greetingForHour, isFirstRun } from "./logic";
import styles from "./dashboard.module.css";

const CREATE = (
  <Button href="/dashboard/create-quiz" iconLeft="plus">
    Create quiz
  </Button>
);

function LoadingSkeleton() {
  return (
    <div aria-busy="true" className={styles.stack}>
      <span className="sr-only" role="status">
        Loading your overview
      </span>
      <div className={styles.ledger}>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className={styles.ledgerCell}>
            <Skeleton width={70} height={11} />
            <Skeleton width={48} height={26} />
            <Skeleton width="80%" height={12} />
          </div>
        ))}
      </div>
      <div className={styles.cols}>
        <Panel title="Last 14 days">
          <Skeleton height={232} />
        </Panel>
        <Panel title="Needs your attention">
          <div className={styles.stack}>
            <Skeleton height={14} />
            <Skeleton height={14} width="85%" />
            <Skeleton height={14} width="70%" />
          </div>
        </Panel>
      </div>
      <Panel title="Recent submissions">
        <div className={styles.stack}>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} height={18} />
          ))}
        </div>
      </Panel>
    </div>
  );
}

/** Teacher overview. Everything shown comes from `dashboard.getDashboardSummary()`. */
export default function DashboardView() {
  const { user } = useAuth();
  const hour = useLocalHour();
  const { status, data, error, reload } = useDashboardSummary();

  const name = firstName(user?.name);
  const hello = hour === null ? "Welcome" : greetingForHour(hour);
  const title = name ? `${hello}, ${name}` : hello;

  if (status === "error") {
    return (
      <>
        <PageHeader title={title} description="Your quizzes, attempts and flags at a glance." />
        <Panel>
          <EmptyState
            title="We could not load your overview"
            action={
              <Button variant="secondary" onClick={reload}>
                Try again
              </Button>
            }
          >
            {error?.message || "Something went wrong."}
          </EmptyState>
        </Panel>
      </>
    );
  }

  if (status === "loading" && !data) {
    return (
      <>
        <PageHeader title={title} description="Your quizzes, attempts and flags at a glance." actions={CREATE} />
        <LoadingSkeleton />
      </>
    );
  }

  if (isFirstRun(data)) {
    return (
      <>
        <PageHeader title={title} description="Your workspace is ready. Three steps get a quiz in front of students." />
        <FirstRun />
      </>
    );
  }

  const attention = buildAttention(data);

  return (
    <>
      <PageHeader title={title} description="Your quizzes, attempts and flags at a glance." actions={CREATE} />
      <div className={styles.stack}>
        <Ledger totals={data.totals} />

        <div className={styles.cols}>
          <Panel title="Last 14 days" description="Attempts started and submitted per day (UTC).">
            <ActivityChart activity={data.activity} />
          </Panel>
          <Panel title="Needs your attention">
            <AttentionList items={attention} />
          </Panel>
        </div>

        <section aria-labelledby="recent-subs" className={styles.section}>
          <h2 id="recent-subs" className={styles.sectionTitle}>
            Recent submissions
          </h2>
          <RecentSubmissions rows={data.recentSubmissions} />
        </section>

        <RecentQuizzes rows={data.recentQuizzes} />
      </div>
    </>
  );
}
