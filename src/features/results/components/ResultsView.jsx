"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { quizzes } from "@/lib/api";
import { Badge, Button, PageHeader, Skeleton, TabPanel, Tabs, toast } from "@/components/ui";
import { pluralize } from "@/lib/utils/format";
import { useAsync } from "../hooks/useAsync";
import { buildQuery, parseFilters } from "../logic/filters";
import AnalyticsTab from "./AnalyticsTab";
import ErrorPanel from "./ErrorPanel";
import SubmissionsTab from "./SubmissionsTab";
import styles from "./results.module.css";

const PREFIX = "results";

function HeaderSkeleton() {
  return (
    <div aria-busy="true" className={styles.headerSkeleton}>
      <span className="sr-only" role="status">
        Loading quiz
      </span>
      <Skeleton width={280} height={32} />
      <Skeleton width={360} height={16} />
      <Skeleton height={76} />
    </div>
  );
}

/** Results screen for one quiz: header, Submissions and Analytics tabs. Filters live in the URL. */
export default function ResultsView({ quizId }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const filters = useMemo(() => parseFilters(search), [search]);
  const quizState = useAsync(() => quizzes.getQuiz(quizId), quizId);
  const quiz = quizState.data?.quiz || quizState.data?.data;

  const update = useCallback(
    (patch) => {
      // read the live URL so a delayed call (debounced search) never overwrites newer filters
      const current = parseFilters(new URLSearchParams(window.location.search));
      const qs = buildQuery({ ...current, ...patch });
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const copyLink = useCallback(async () => {
    const link = `${window.location.origin}/attempt/${quizId}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Student link copied.");
    } catch {
      toast.error("Could not copy. Select the link from the Quizzes page instead.");
    }
  }, [quizId]);

  if (quizState.error) return <ErrorPanel error={quizState.error} onRetry={quizState.reload} backHref="/dashboard/quizzes" what="this quiz" />;
  if (!quiz) return <HeaderSkeleton />;

  return (
    <div className={styles.page}>
      <Button href="/dashboard/quizzes" variant="ghost" size="sm" iconLeft="arrow-left" className={styles.back}>
        Quizzes
      </Button>
      <PageHeader
        title={quiz.title}
        description="Review student scores, proctoring flags and how each question performed."
        actions={
          <>
            <Button variant="secondary" iconLeft="link" onClick={copyLink} disabled={!quiz.isPublic} title={quiz.isPublic ? undefined : "Publish the quiz to share it"}>
              Copy student link
            </Button>
            <Button href={`/dashboard/quizzes/${quizId}/edit`} variant="secondary" iconLeft="pencil">
              Edit quiz
            </Button>
          </>
        }
      />
      <p className={styles.meta}>
        <Badge status={quiz.isPublic ? "published" : "draft"} />
        <span>Pass mark {quiz.passingScore}%</span>
        <span>{quiz.timeLimit ? `${quiz.timeLimit} min limit` : "No time limit"}</span>
        <span>{pluralize(quiz.questions?.length ?? 0, "question")}</span>
      </p>

      <Tabs
        label="Results sections"
        idPrefix={PREFIX}
        value={filters.tab}
        onChange={(tab) => update({ tab, page: 1 })}
        tabs={[
          { id: "submissions", label: "Submissions" },
          { id: "analytics", label: "Analytics" },
        ]}
      />
      <TabPanel idPrefix={PREFIX} tabId="submissions" active={filters.tab === "submissions"} className={styles.panel}>
        <SubmissionsTab quiz={quiz} filters={filters} onFilters={update} onCopyLink={copyLink} />
      </TabPanel>
      <TabPanel idPrefix={PREFIX} tabId="analytics" active={filters.tab === "analytics"} className={styles.panel}>
        <AnalyticsTab quiz={quiz} onCopyLink={copyLink} />
      </TabPanel>
    </div>
  );
}
