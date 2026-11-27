"use client";

import Link from "next/link";
import { Badge, Icon, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui";
import { formatDate, formatDateTime, formatMarks, formatPercent, formatRelative, pluralize } from "@/lib/utils/format";
import RowMenu from "./RowMenu";
import styles from "./quizzes.module.css";

/** @param {{ timeLimit: number|null }} q */
const timeText = (q) => (q.timeLimit ? `${q.timeLimit} min` : "No limit");
/** Stats that need submissions show a dash until there are some. */
const scored = (q) => (q.stats.submitted > 0 ? { avg: formatPercent(q.stats.avgPercentage), pass: formatPercent(q.stats.passRate) } : { avg: "—", pass: "—" });

/** @param {{ q: any }} props */
function TitleBlock({ q }) {
  return (
    <>
      <Link href={`/dashboard/submissions/${q._id}`} className={styles.title}>
        {q.title}
      </Link>
      <span className={styles.meta}>
        <Badge status={q.isPublic ? "published" : "draft"} />
        {q.hasPassword ? (
          <span className={styles.lock}>
            <Icon name="shield" size={13} /> Password
          </span>
        ) : null}
        <span className={styles.created}>Created {formatDate(q.createdAt)}</span>
      </span>
    </>
  );
}

/**
 * Desktop ledger.
 * @param {{ rows: any[], busy: boolean, menuItems: (q: any) => any[] }} props
 */
export function QuizTable({ rows, busy, menuItems }) {
  return (
    <div className={busy ? styles.dim : undefined}>
      <Table caption="Your quizzes">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Quiz</TableHeaderCell>
            <TableHeaderCell numeric>Questions</TableHeaderCell>
            <TableHeaderCell numeric>Total marks</TableHeaderCell>
            <TableHeaderCell>Time</TableHeaderCell>
            <TableHeaderCell numeric>Attempts</TableHeaderCell>
            <TableHeaderCell numeric>Flagged</TableHeaderCell>
            <TableHeaderCell numeric>Average</TableHeaderCell>
            <TableHeaderCell numeric>Pass rate</TableHeaderCell>
            <TableHeaderCell>Updated</TableHeaderCell>
            <TableHeaderCell>
              <span className="sr-only">Actions</span>
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((q) => {
            const s = scored(q);
            return (
              <TableRow key={q._id}>
                <TableCell className={styles.titleCell}>
                  <TitleBlock q={q} />
                </TableCell>
                <TableCell numeric mono>
                  {q.questionCount}
                </TableCell>
                <TableCell numeric mono>
                  {formatMarks(q.totalMarks)}
                </TableCell>
                <TableCell className={styles.nowrap}>{timeText(q)}</TableCell>
                <TableCell numeric mono>
                  {q.stats.attempts}
                  {q.stats.attempts > 0 ? (
                    <span className={styles.subnum}>
                      {q.stats.submitted} done, {q.stats.inProgress} open
                    </span>
                  ) : null}
                </TableCell>
                <TableCell numeric mono>
                  {q.stats.flagged > 0 ? <Badge status="flagged">{q.stats.flagged}</Badge> : "0"}
                </TableCell>
                <TableCell numeric mono>
                  {s.avg}
                </TableCell>
                <TableCell numeric mono>
                  {s.pass}
                </TableCell>
                <TableCell className={styles.nowrap}>
                  <time dateTime={q.updatedAt} title={formatDateTime(q.updatedAt)}>
                    {formatRelative(q.updatedAt)}
                  </time>
                </TableCell>
                <TableCell className={styles.actionCell}>
                  <RowMenu label={`Actions for ${q.title}`} items={menuItems(q)} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Mobile: stacked rows (ruled list, not nested cards).
 * @param {{ rows: any[], busy: boolean, menuItems: (q: any) => any[] }} props
 */
export function QuizStack({ rows, busy, menuItems }) {
  return (
    <ul className={`${styles.stack} ${busy ? styles.dim : ""}`} role="list" aria-label="Your quizzes">
      {rows.map((q) => {
        const s = scored(q);
        return (
          <li key={q._id} className={styles.stackRow}>
            <div className={styles.stackHead}>
              <div className={styles.stackTitle}>
                <TitleBlock q={q} />
              </div>
              <RowMenu label={`Actions for ${q.title}`} items={menuItems(q)} />
            </div>
            <dl className={styles.facts}>
              <div>
                <dt>Questions</dt>
                <dd>{q.questionCount}</dd>
              </div>
              <div>
                <dt>Marks</dt>
                <dd>{formatMarks(q.totalMarks)}</dd>
              </div>
              <div>
                <dt>Time</dt>
                <dd>{timeText(q)}</dd>
              </div>
              <div>
                <dt>Attempts</dt>
                <dd>{q.stats.attempts}</dd>
              </div>
              <div>
                <dt>Average</dt>
                <dd>{s.avg}</dd>
              </div>
              <div>
                <dt>Pass rate</dt>
                <dd>{s.pass}</dd>
              </div>
            </dl>
            <p className={styles.stackFoot}>
              {q.stats.attempts > 0 ? `${q.stats.submitted} submitted, ${q.stats.inProgress} in progress` : "No attempts yet"}
              {q.stats.flagged > 0 ? <Badge status="flagged">{pluralize(q.stats.flagged, "flag")}</Badge> : null}
              <span className={styles.created}>Updated {formatRelative(q.updatedAt)}</span>
            </p>
          </li>
        );
      })}
    </ul>
  );
}
