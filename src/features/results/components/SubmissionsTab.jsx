"use client";

import { useEffect, useRef, useState } from "react";
import { submissions } from "@/lib/api";
import { Button, Checkbox, EmptyState, Menu, Pagination, SearchInput, Select, Skeleton, Stat, StatStrip } from "@/components/ui";
import { formatPercent } from "@/lib/utils/format";
import { useAsync } from "../hooks/useAsync";
import { useExport } from "../hooks/useExport";
import { PAGE_SIZE, hasActiveFilters, toApiParams } from "../logic/filters";
import ErrorPanel from "./ErrorPanel";
import SubmissionsTable from "./SubmissionsTable";
import styles from "./results.module.css";

const STATUS = [
  { value: "all", label: "All statuses" },
  { value: "submitted", label: "Submitted" },
  { value: "in-progress", label: "In progress" },
  { value: "graded", label: "Graded" },
];
const SORT = [
  { value: "newest", label: "Newest first" },
  { value: "score", label: "Highest score" },
];

function ListSkeleton() {
  return (
    <div aria-busy="true" className={styles.skeletonRows}>
      <span className="sr-only" role="status">
        Loading submissions
      </span>
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} height={44} />
      ))}
    </div>
  );
}

/**
 * @param {{ quiz: any, filters: ReturnType<typeof import("../logic/filters").parseFilters>, onFilters: (patch: object) => void, onCopyLink: () => void }} props
 */
export default function SubmissionsTab({ quiz, filters, onFilters, onCopyLink }) {
  const key = JSON.stringify([quiz._id, filters.page, filters.status, filters.flagged, filters.search, filters.sort]);
  const list = useAsync(() => submissions.listQuizSubmissions(quiz._id, toApiParams(filters, PAGE_SIZE)), key);
  const exporter = useExport({ quiz, filters });

  const [text, setText] = useState(filters.search);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  function onSearch(value) {
    setText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onFilters({ search: value.trim(), page: 1 }), 350);
  }

  const { data, error, loading } = list;
  const summary = data?.summary;
  const items = data?.submissions || [];
  const pages = data?.pagination?.pages || 1;
  const active = hasActiveFilters(filters);
  const exportBusy = exporter.progress !== null;

  function clear() {
    clearTimeout(timer.current);
    setText("");
    onFilters({ status: "all", flagged: false, search: "", page: 1 });
  }

  return (
    <div className={styles.tabBody}>
      {summary ? (
        <StatStrip label="Summary of all attempts">
          <Stat label="Attempts" value={summary.count} />
          <Stat label="Submitted" value={summary.submitted} />
          <Stat label="In progress" value={summary.inProgress} />
          <Stat label="Flagged" value={summary.flagged} />
          <Stat label="Average" value={summary.submitted ? formatPercent(summary.avgPercentage) : "—"} />
          <Stat label="Pass rate" value={summary.submitted ? formatPercent(summary.passRate) : "—"} hint={`Pass mark ${quiz.passingScore}%`} />
        </StatStrip>
      ) : loading ? (
        <Skeleton height={76} />
      ) : null}

      <div className={styles.filters} role="group" aria-label="Filter submissions">
        <SearchInput value={text} onChange={onSearch} placeholder="Search name or email" label="Search submissions by name or email" className={styles.search} maxLength={60} />
        <Select aria-label="Status" value={filters.status} onChange={(e) => onFilters({ status: e.target.value, page: 1 })} options={STATUS} className={styles.select} />
        <Select aria-label="Sort" value={filters.sort} onChange={(e) => onFilters({ sort: e.target.value, page: 1 })} options={SORT} className={styles.select} />
        <Checkbox label="Flagged only" checked={filters.flagged} onChange={(e) => onFilters({ flagged: e.target.checked, page: 1 })} />
        <div className={styles.exportWrap}>
          {exportBusy ? (
            <p className={styles.exportStatus} role="status">
              Exporting {exporter.progress.done} of {exporter.progress.total || "…"}
            </p>
          ) : null}
          <Menu
            label="Export submissions"
            align="end"
            trigger={exportBusy ? "Exporting…" : "Export"}
            items={[
              { label: "CSV (.csv)", onSelect: () => exporter.run("csv"), disabled: exportBusy || !summary?.count },
              { label: "Excel (.xlsx)", onSelect: () => exporter.run("xlsx"), disabled: exportBusy || !summary?.count },
            ]}
          />
        </div>
      </div>
      {exportBusy ? (
        <div className={styles.exportBar} aria-hidden="true">
          <span style={{ width: `${exporter.progress.total ? Math.round((exporter.progress.done / exporter.progress.total) * 100) : 5}%` }} />
        </div>
      ) : null}

      {error ? (
        <ErrorPanel error={error} onRetry={list.reload} what="submissions" />
      ) : !data ? (
        <ListSkeleton />
      ) : items.length === 0 ? (
        active ? (
          <EmptyState
            title="No submissions match these filters"
            action={
              <Button variant="secondary" onClick={clear}>
                Clear filters
              </Button>
            }
          >
            Try a different name, status or sort.
          </EmptyState>
        ) : (
          <EmptyState
            title="No one has attempted this quiz yet"
            action={
              quiz.isPublic ? (
                <Button variant="secondary" onClick={onCopyLink}>
                  Copy student link
                </Button>
              ) : (
                <Button variant="secondary" href="/dashboard/quizzes">
                  Go to quizzes to publish
                </Button>
              )
            }
          >
            {quiz.isPublic ? "Share the student link and attempts will appear here." : "This quiz is a draft. Publish it, then share the student link."}
          </EmptyState>
        )
      ) : (
        <>
          <SubmissionsTable items={items} quiz={quiz} stale={loading} />
          <Pagination page={filters.page} pages={pages} total={data.pagination?.total} onChange={(p) => onFilters({ page: p })} />
        </>
      )}
    </div>
  );
}
