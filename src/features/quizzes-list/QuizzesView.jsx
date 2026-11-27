"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ConfirmDialog, Button, EmptyState, Icon, PageHeader, Pagination, SearchInput, SegmentedControl, Select, Skeleton, toast } from "@/components/ui";
import { quizzes as quizApi } from "@/lib/api";
import { useDebouncedValue } from "@/lib/utils/hooks";
import { pluralize } from "@/lib/utils/format";
import { copyText, useMediaQuery, useQuizList } from "./hooks";
import { QuizStack, QuizTable } from "./QuizRows";
import { buildListQuery, deleteImpact, hasFilters, parseListQuery, publishFailureMessage, studentLink, withPublished } from "./logic";
import styles from "./quizzes.module.css";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Drafts" },
];
const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "title", label: "Title A to Z" },
];

function ListSkeleton() {
  return (
    <div aria-busy="true" className={styles.skeleton}>
      <span className="sr-only" role="status">
        Loading your quizzes
      </span>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className={styles.skelRow}>
          <div className={styles.skelMain}>
            <Skeleton width="45%" height={16} />
            <Skeleton width="30%" height={12} />
          </div>
          <Skeleton width={60} height={14} />
          <Skeleton width={60} height={14} />
        </div>
      ))}
    </div>
  );
}

/** `/dashboard/quizzes`: search, filter, sort, paginate and act on your quizzes. State lives in the URL. */
export default function QuizzesView() {
  const params = useSearchParams();
  const [initial] = useState(() => parseListQuery(params));
  const [search, setSearch] = useState(initial.q);
  const [status, setStatus] = useState(initial.status);
  const [sort, setSort] = useState(initial.sort);
  const [page, setPage] = useState(initial.page);
  const debounced = useDebouncedValue(search, 350);
  const query = useMemo(() => ({ q: debounced, status, sort, page }), [debounced, status, sort, page]);
  const list = useQuizList(query, setPage);
  const compact = useMediaQuery("(max-width: 899px)");
  const { reload, mutate } = list;

  const [busyIds, setBusyIds] = useState(() => new Set());
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Keep the URL in step with the filters (replace, so Back leaves the page).
  useEffect(() => {
    const qs = buildListQuery(query);
    const url = `${window.location.pathname}${qs}`;
    if (url !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, "", url);
  }, [query]);

  const setBusy = useCallback((id, on) => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  async function copyLink(q) {
    const ok = await copyText(studentLink(window.location.origin, q._id));
    if (!ok) toast.error("Could not copy. Select the link from the quiz page instead.");
    else if (q.isPublic) toast.success("Student link copied.");
    else toast.success("Link copied, but it will not open until you publish this quiz.", { duration: 6000 });
  }

  async function togglePublish(q) {
    const next = !q.isPublic;
    setBusy(q._id, true);
    mutate((items) => withPublished(items, q._id, next));
    try {
      const res = await quizApi.togglePublic(q._id);
      const actual = typeof res?.isPublic === "boolean" ? res.isPublic : next;
      if (actual !== next) mutate((items) => withPublished(items, q._id, actual));
      toast.success(actual ? "Published. Students can now open the link." : "Unpublished. The link no longer opens for students.");
      if (status !== "all") reload();
    } catch (err) {
      mutate((items) => withPublished(items, q._id, q.isPublic));
      toast.error(publishFailureMessage(err), { duration: 7000 });
    } finally {
      setBusy(q._id, false);
    }
  }

  async function duplicate(q) {
    setBusy(q._id, true);
    try {
      const res = await quizApi.duplicateQuiz(q._id);
      toast.success(
        (t) => (
          <span>
            Copy created as a draft.{" "}
            <Link href={`/dashboard/quizzes/${res.quizId}/edit`} onClick={() => toast.dismiss(t.id)} style={{ color: "#fff", fontWeight: 700, textDecoration: "underline" }}>
              Open copy
            </Link>
          </span>
        ),
        { duration: 7000 },
      );
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(q._id, false);
    }
  }

  async function confirmDelete() {
    const q = toDelete;
    setDeleting(true);
    try {
      const res = await quizApi.deleteQuiz(q._id);
      const n = res?.deletedSubmissions ?? q.stats.attempts;
      toast.success(n ? `Deleted "${q.title}" and ${pluralize(n, "attempt")}.` : `Deleted "${q.title}".`);
      setToDelete(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  }

  const menuItems = (q) => {
    const busy = busyIds.has(q._id);
    return [
      { label: "Edit", icon: "pencil", href: `/dashboard/quizzes/${q._id}/edit` },
      { label: "Results", icon: "list", href: `/dashboard/submissions/${q._id}` },
      { label: q.isPublic ? "Copy student link" : "Copy link (not live)", icon: "link", onSelect: () => copyLink(q) },
      { label: q.isPublic ? "Unpublish" : "Publish", icon: q.isPublic ? "eye-off" : "eye", disabled: busy, onSelect: () => togglePublish(q) },
      { label: "Duplicate", icon: "copy", disabled: busy, onSelect: () => duplicate(q) },
      { separator: true },
      { label: "Delete quiz", icon: "trash", danger: true, disabled: busy, onSelect: () => setToDelete(q) },
    ];
  };

  function onSearch(v) {
    setSearch(v);
    setPage(1);
  }
  function clearFilters() {
    setSearch("");
    setStatus("all");
    setPage(1);
  }

  const filtersOn = hasFilters({ q: search, status });
  const rows = list.items;
  const firstLoad = !list.loaded && list.status !== "error";
  const total = list.pagination?.total ?? rows.length;

  let body;
  if (list.status === "error" && !list.loaded) {
    body = (
      <EmptyState
        title="We could not load your quizzes"
        action={
          <Button variant="secondary" onClick={reload}>
            Try again
          </Button>
        }
      >
        {list.error?.message}
      </EmptyState>
    );
  } else if (firstLoad) {
    body = <ListSkeleton />;
  } else if (!rows.length && !filtersOn && list.status === "ready") {
    body = (
      <EmptyState
        title="No quizzes yet"
        action={
          <Button href="/dashboard/create-quiz" iconLeft="plus">
            Create quiz
          </Button>
        }
      >
        Create one or generate it with AI, publish it, then share the student link.
      </EmptyState>
    );
  } else if (!rows.length && list.status === "ready") {
    body = (
      <EmptyState
        title="No quizzes match"
        action={
          <Button variant="secondary" onClick={clearFilters}>
            Clear filters
          </Button>
        }
      >
        Try a different word or another status.
      </EmptyState>
    );
  } else {
    const busy = list.status === "loading";
    body = compact ? <QuizStack rows={rows} busy={busy} menuItems={menuItems} /> : <QuizTable rows={rows} busy={busy} menuItems={menuItems} />;
  }

  return (
    <>
      <PageHeader
        title="Quizzes"
        description="Publish a quiz to get a link students can open. Drafts are private to you."
        actions={
          <Button href="/dashboard/create-quiz" iconLeft="plus">
            Create quiz
          </Button>
        }
      />

      <div className={styles.toolbar}>
        <SearchInput value={search} onChange={onSearch} label="Search quizzes" placeholder="Search by title" className={styles.search} />
        <SegmentedControl
          label="Status"
          value={status}
          options={STATUS_OPTIONS}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        />
        <div className={styles.sort}>
          <label htmlFor="quiz-sort" className="sr-only">
            Sort quizzes
          </label>
          <Select
            id="quiz-sort"
            value={sort}
            options={SORT_OPTIONS}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {list.status === "error" && list.loaded ? (
        <p className={styles.inlineError} role="alert">
          <Icon name="alert" size={16} /> Could not refresh the list. {list.error?.message}{" "}
          <button type="button" className={styles.linkBtn} onClick={reload}>
            Try again
          </button>
        </p>
      ) : null}

      <div aria-live="polite" className="sr-only">
        {list.status === "ready" && list.loaded ? `${pluralize(total, "quiz", "quizzes")} found.` : ""}
      </div>

      {body}

      {list.loaded && rows.length ? <Pagination page={list.pagination?.page ?? page} pages={list.pagination?.pages ?? 1} total={total} onChange={setPage} className={styles.pager} /> : null}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => (deleting ? undefined : setToDelete(null))}
        onConfirm={confirmDelete}
        title={toDelete ? `Delete "${toDelete.title}"?` : "Delete quiz?"}
        description="This cannot be undone."
        confirmLabel="Delete quiz"
        tone="danger"
        loading={deleting}
      >
        {toDelete ? <p>{deleteImpact(toDelete.stats)}</p> : null}
      </ConfirmDialog>
    </>
  );
}
