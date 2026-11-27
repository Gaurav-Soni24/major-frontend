"use client";

import { Badge, Button, Icon, Menu } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { formatClock, pluralize } from "@/lib/utils/format";
import EditorIcon from "./EditorIcon.jsx";
import ToolButton from "./ToolButton.jsx";
import styles from "./topbar.module.css";

function SaveStatus({ dirty, busy, autosavedAt, quizId }) {
  let text;
  if (busy === "save" || busy === "publish") text = "Saving…";
  else if (dirty) text = autosavedAt ? `Unsaved changes · kept on this device ${formatClock(autosavedAt)}` : "Unsaved changes";
  else text = quizId ? "All changes saved" : "New quiz";
  return (
    <span className={cn(styles.status, dirty && styles.dirty)} role="status" aria-live="polite">
      {text}
    </span>
  );
}

/** Sticky bar: back, title, status, validity, undo/redo, Preview, Save draft, Publish. */
export default function TopBar({ ed, onPreview, onIssues, onSave, onPublish }) {
  const { draft, dirty, busy, meta, summary, canUndo, canRedo, dispatch, autosavedAt, quizId, unpublish } = ed;
  const count = summary.issues.length;
  const published = meta.isPublic;

  const issuesChip =
    count > 0 ? (
      <button type="button" className={cn(styles.chip, styles.bad)} onClick={onIssues}>
        <Icon name="alert" size={15} />
        {pluralize(count, "issue")}
      </button>
    ) : (
      <span className={cn(styles.chip, styles.good)}>
        <Icon name="check" size={15} />
        {published ? "No issues" : "Ready to publish"}
      </span>
    );

  return (
    <div className={styles.bar} role="toolbar" aria-label="Quiz editor">
      <div className={styles.left}>
        <Button href="/dashboard/quizzes" variant="ghost" size="sm" iconLeft="arrow-left" className={styles.back} aria-label="Back to quizzes">
          Quizzes
        </Button>
        <div className={styles.titleBlock}>
          <div className={styles.titleLine}>
            <span className={styles.title}>{draft.title.trim() || "Untitled quiz"}</span>
            <Badge status={published ? "published" : "draft"} />
          </div>
          <SaveStatus dirty={dirty} busy={busy} autosavedAt={autosavedAt} quizId={quizId} />
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.wide}>{issuesChip}</div>
        <div className={cn(styles.wide, styles.history)} role="group" aria-label="History">
          <ToolButton icon="undo" label="Undo (Ctrl+Z)" size="sm" disabled={!canUndo} onClick={() => dispatch({ type: "undo" })} />
          <ToolButton icon="redo" label="Redo (Ctrl+Shift+Z)" size="sm" disabled={!canRedo} onClick={() => dispatch({ type: "redo" })} />
        </div>
        <Button variant="ghost" size="sm" iconLeft="play" onClick={onPreview} className={styles.wide}>
          Preview
        </Button>
        <Button variant="secondary" size="sm" iconLeft="save" className={styles.save} aria-label={published ? "Save changes" : "Save draft"} onClick={onSave} loading={busy === "save"} disabled={!!busy && busy !== "save"}>
          {published ? "Save changes" : "Save draft"}
        </Button>
        {published ? (
          <Button variant="secondary" size="sm" onClick={unpublish} loading={busy === "publish"} disabled={!!busy && busy !== "publish"}>
            Unpublish
          </Button>
        ) : (
          <Button size="sm" onClick={onPublish} loading={busy === "publish"} disabled={!!busy && busy !== "publish"}>
            Publish
          </Button>
        )}
        <div className={styles.narrowOnly}>
          <Menu
            label="More actions"
            trigger={<EditorIcon name="more" size={18} />}
            items={[
              { label: canUndo ? "Undo" : "Undo (nothing to undo)", onSelect: () => dispatch({ type: "undo" }), disabled: !canUndo },
              { label: "Redo", onSelect: () => dispatch({ type: "redo" }), disabled: !canRedo },
              { separator: true },
              { label: "Preview as student", onSelect: onPreview },
              { label: count ? `Show ${pluralize(count, "issue")}` : "No issues", onSelect: onIssues, disabled: !count },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
