"use client";

import Link from "next/link";
import { Badge, Button, Icon, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Panel, EmptyState } from "@/components/ui";
import { formatPercent, formatRelative, pluralize } from "@/lib/utils/format";
import { ledgerRows } from "./logic";
import styles from "./dashboard.module.css";

/** Ruled ledger strip: one row of numbered columns, real totals only. @param {{ totals: any }} props */
export function Ledger({ totals }) {
  const rows = ledgerRows(totals, { percent: formatPercent });
  return (
    <dl className={styles.ledger} aria-label="Totals across all your quizzes">
      {rows.map((r, i) => (
        <div key={r.key} className={styles.ledgerCell}>
          <dt className={styles.ledgerLabel}>
            <span className={styles.ledgerIndex} aria-hidden="true">
              [{String(i + 1).padStart(2, "0")}]
            </span>
            {r.label}
          </dt>
          <dd className={styles.ledgerValue}>{r.value}</dd>
          <dd className={styles.ledgerHint}>{r.hint}</dd>
        </div>
      ))}
    </dl>
  );
}

const TONE_ICON = { wrong: "flag", partial: "alert", info: "info" };

/** @param {{ items: Array<{ id: string, tone: string, text: string, href: string, action: string }> }} props */
export function AttentionList({ items }) {
  if (!items.length) {
    return (
      <p className={styles.allClear}>
        <Icon name="check" size={16} /> Nothing needs your attention right now.
      </p>
    );
  }
  return (
    <ul className={styles.attention} role="list">
      {items.map((it) => (
        <li key={it.id} className={`${styles.attentionItem} ${styles[`tone_${it.tone}`]}`}>
          <span className={styles.attentionIcon}>
            <Icon name={TONE_ICON[it.tone] || "info"} size={16} />
          </span>
          <p className={styles.attentionText}>{it.text}</p>
          <Link href={it.href} className={styles.attentionLink}>
            {it.action}
            <span className="sr-only"> : {it.text}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

const STATUS_BADGE = { "in-progress": "in-progress", submitted: "submitted", graded: "graded" };

/** @param {{ rows: any[] }} props */
export function RecentSubmissions({ rows }) {
  if (!rows.length) {
    return (
      <EmptyState compact title="No attempts yet">
        When students open one of your published quizzes, their attempts appear here.
      </EmptyState>
    );
  }
  return (
    <>
    <div className={styles.wideOnly}>
    <Table caption="Most recent attempts across your quizzes">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Student</TableHeaderCell>
          <TableHeaderCell>Quiz</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell numeric>Score</TableHeaderCell>
          <TableHeaderCell>Submitted</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((s) => (
          <TableRow key={s._id}>
            <TableCell>
              <Link href={`/dashboard/submissions/details/${s._id}`} className={styles.rowLink}>
                {s.name || s.email}
              </Link>
              {s.name ? <span className={styles.sub}>{s.email}</span> : null}
            </TableCell>
            <TableCell>
              <Link href={`/dashboard/submissions/${s.quizId}`} className={styles.quizLink}>
                {s.quizTitle || "Untitled quiz"}
              </Link>
            </TableCell>
            <TableCell>
              <span className={styles.badges}>
                <Badge status={STATUS_BADGE[s.status] || "submitted"} />
                {s.isFlagged ? <Badge status="flagged" /> : null}
              </span>
            </TableCell>
            <TableCell numeric mono>
              {s.status === "in-progress" ? "—" : formatPercent(s.percentage)}
            </TableCell>
            <TableCell>{s.submittedAt ? formatRelative(s.submittedAt) : <span className={styles.muted}>Not yet</span>}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </div>
    <ul className={styles.narrowOnly} role="list" aria-label="Most recent attempts across your quizzes">
      {rows.map((s) => (
        <li key={s._id} className={styles.subRow}>
          <div className={styles.subMain}>
            <Link href={`/dashboard/submissions/details/${s._id}`} className={styles.rowLink}>
              {s.name || s.email}
            </Link>
            <span className={styles.sub}>{s.quizTitle || "Untitled quiz"}</span>
            <span className={styles.badges}>
              <Badge status={STATUS_BADGE[s.status] || "submitted"} />
              {s.isFlagged ? <Badge status="flagged" /> : null}
            </span>
          </div>
          <div className={styles.subScore}>
            <span>{s.status === "in-progress" ? "—" : formatPercent(s.percentage)}</span>
            <span className={styles.sub}>{s.submittedAt ? formatRelative(s.submittedAt) : "Not yet"}</span>
          </div>
        </li>
      ))}
    </ul>
    </>
  );
}

/** @param {{ rows: any[] }} props */
export function RecentQuizzes({ rows }) {
  return (
    <Panel
      title="Recent quizzes"
      padded={false}
      actions={
        <Button href="/dashboard/quizzes" variant="ghost" size="sm" iconRight="arrow-right">
          All quizzes
        </Button>
      }
    >
      <ol className={styles.quizList} role="list">
        {rows.map((q) => (
          <li key={q._id} className={styles.quizRow}>
            <div className={styles.quizMain}>
              <Link href={`/dashboard/submissions/${q._id}`} className={styles.rowLink}>
                {q.title}
              </Link>
              <span className={styles.sub}>{q.isPublic ? pluralize(q.attempts, "attempt") : "Draft, not open to students"}</span>
            </div>
            <Badge status={q.isPublic ? "published" : "draft"} />
          </li>
        ))}
      </ol>
    </Panel>
  );
}
