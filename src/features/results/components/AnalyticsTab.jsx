"use client";

import { useState } from "react";
import { quizzes } from "@/lib/api";
import { Button, EmptyState, Mark, Panel, SegmentedControl, Skeleton, Stat, StatStrip } from "@/components/ui";
import { Histogram, HorizontalBars } from "@/components/charts";
import { formatDuration, formatPercent } from "@/lib/utils/format";
import { useAsync } from "../hooks/useAsync";
import { histogramBars, orderQuestions, rateText, typeLabel } from "../logic/analytics";
import ErrorPanel from "./ErrorPanel";
import styles from "./results.module.css";

const toneFor = (rate) => (rate >= 70 ? "correct" : rate >= 40 ? "partial" : "wrong");

function AnalyticsSkeleton() {
  return (
    <div aria-busy="true" className={styles.tabBody}>
      <span className="sr-only" role="status">
        Loading analytics
      </span>
      <Skeleton height={76} />
      <Skeleton height={300} />
      <Skeleton height={240} />
    </div>
  );
}

/** @param {{ quiz: any, onCopyLink: () => void }} props */
export default function AnalyticsTab({ quiz, onCopyLink }) {
  const { data, error, reload } = useAsync(() => quizzes.getQuizAnalytics(quiz._id), quiz._id);
  const [mode, setMode] = useState("hardest");

  if (error) return <ErrorPanel error={error} onRetry={reload} what="analytics" />;
  if (!data) return <AnalyticsSkeleton />;

  const { summary, scoreDistribution, questions } = data;
  if (summary.attempts === 0) {
    return (
      <EmptyState
        title="No attempts to analyse yet"
        action={
          quiz.isPublic ? (
            <Button variant="secondary" onClick={onCopyLink}>
              Copy student link
            </Button>
          ) : null
        }
      >
        Charts appear once students have attempted this quiz.
      </EmptyState>
    );
  }

  const finished = summary.submitted;
  const { bars, marker } = histogramBars(scoreDistribution, quiz.passingScore);
  const rows = orderQuestions(questions, mode);
  const items = rows.map((q) => ({
    key: q._id || String(q.index),
    value: q.correctRate,
    valueLabel: rateText(q.correctRate),
    tone: finished ? toneFor(q.correctRate) : "muted",
    description: `Question ${q.number}, ${typeLabel(q.type)}, ${q.marks} marks. ${rateText(q.correctRate)} correct. Average ${q.avgMarks} of ${q.marks} marks. Answered by ${q.answered} of ${finished}. ${q.text}`,
    label: (
      <div className={styles.qLabel}>
        <span className={styles.qNum}>{String(q.number).padStart(2, "0")}</span>
        <span className={styles.qText}>
          <span className={styles.qClamp}>{q.text}</span>
          <span className={styles.qMeta}>
            {typeLabel(q.type)} · <Mark value={q.marks} /> · avg {q.avgMarks} · answered {q.answered}/{finished}
          </span>
        </span>
      </div>
    ),
  }));

  return (
    <div className={styles.tabBody}>
      <StatStrip label="Quiz analytics summary" className={styles.strip8}>
        <Stat label="Attempts" value={summary.attempts} hint={`${summary.attempts - finished} not finished`} />
        <Stat label="Finished" value={finished} />
        <Stat label="Average" value={finished ? formatPercent(summary.avgPercentage) : "—"} />
        <Stat label="Median" value={finished ? formatPercent(summary.medianPercentage) : "—"} />
        <Stat label="Highest" value={finished ? formatPercent(summary.highest) : "—"} />
        <Stat label="Lowest" value={finished ? formatPercent(summary.lowest) : "—"} />
        <Stat label="Pass rate" value={finished ? formatPercent(summary.passRate) : "—"} hint={`Pass mark ${quiz.passingScore}%`} />
        <Stat label="Avg time" value={summary.avgDurationSeconds ? formatDuration(summary.avgDurationSeconds) : "—"} />
      </StatStrip>

      {finished === 0 ? (
        <EmptyState compact title="No finished attempts yet">
          Score charts use finished attempts only. {summary.attempts} in progress.
        </EmptyState>
      ) : (
        <>
          <Panel title="Score distribution" description={`${finished} finished ${finished === 1 ? "attempt" : "attempts"}, grouped in 10-point ranges.`}>
            <Histogram bars={bars} marker={marker} passingScore={quiz.passingScore} total={finished} />
          </Panel>

          <Panel
            title="Questions"
            description="Share of finished attempts that got the question right."
            actions={
              <SegmentedControl
                label="Order questions"
                size="sm"
                value={mode}
                onChange={setMode}
                options={[
                  { value: "hardest", label: "Hardest first" },
                  { value: "order", label: "Quiz order" },
                ]}
              />
            }
          >
            <HorizontalBars items={items} title="Correct rate per question" />
          </Panel>
        </>
      )}
    </div>
  );
}
