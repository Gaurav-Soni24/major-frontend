"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui";
import { formatDateTime, formatDuration, formatPercent } from "@/lib/utils/format";
import { durationSeconds, isDone, passedOf, strikeCounts } from "../logic/status";
import { customColumns } from "../logic/exportRows";
import { PassMark, StatusBadges } from "./StatusBadges";
import styles from "./results.module.css";

const detailHref = (s) => `/dashboard/submissions/details/${s._id}`;
const scoreText = (s) => (isDone(s) ? `${s.score?.obtainedMarks ?? 0} / ${s.score?.totalMarks ?? 0}` : "—");

/** Strikes as three small figures with a full-sentence accessible name. */
function Strikes({ submission }) {
  const { tab, webcam, copy } = strikeCounts(submission);
  const label = `${tab} tab switches, ${webcam} webcam strikes, ${copy} copy or paste attempts`;
  const total = tab + webcam + copy;
  return (
    <span className={total > 0 ? styles.strikes : `${styles.strikes} ${styles.muted}`} role="img" aria-label={label} title="Tab / webcam / copy">
      <span aria-hidden="true">
        {tab} / {webcam} / {copy}
      </span>
    </span>
  );
}

function CustomData({ submission, columns }) {
  return columns.map((c) => <TableCell key={c}>{submission.userDetails?.customData?.[c] ?? "—"}</TableCell>);
}

/**
 * Ledger of submissions (table from 760px, stacked rows below). `stale` dims it while a new page loads.
 * @param {{ items: any[], quiz: any, stale?: boolean }} props
 */
export default function SubmissionsTable({ items, quiz, stale = false }) {
  const router = useRouter();
  const custom = customColumns(quiz, items);
  const passing = quiz.passingScore;

  return (
    <div className={stale ? styles.stale : undefined} aria-busy={stale}>
      <div className={styles.wide}>
        <Table caption="Submissions for this quiz">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Student</TableHeaderCell>
              {custom.map((c) => (
                <TableHeaderCell key={c}>{c}</TableHeaderCell>
              ))}
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell numeric>Score</TableHeaderCell>
              <TableHeaderCell numeric>%</TableHeaderCell>
              <TableHeaderCell>Result</TableHeaderCell>
              <TableHeaderCell numeric>
                <abbr title="Tab switches / webcam strikes / copy-paste attempts">Strikes</abbr>
              </TableHeaderCell>
              <TableHeaderCell>Submitted</TableHeaderCell>
              <TableHeaderCell numeric>Time</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((s) => {
              const dur = durationSeconds(s);
              return (
                <TableRow key={s._id} onClick={() => router.push(detailHref(s))}>
                  <TableCell>
                    <Link href={detailHref(s)} className={styles.studentLink} onClick={(e) => e.stopPropagation()}>
                      {s.userDetails?.name || "Unnamed"}
                    </Link>
                    <span className={styles.email}>{s.userDetails?.email}</span>
                  </TableCell>
                  <CustomData submission={s} columns={custom} />
                  <TableCell>
                    <StatusBadges submission={s} />
                  </TableCell>
                  <TableCell numeric mono className={styles.nowrap}>
                    {scoreText(s)}
                  </TableCell>
                  <TableCell numeric mono>
                    {isDone(s) ? formatPercent(s.score?.percentage) : "—"}
                  </TableCell>
                  <TableCell>
                    <PassMark passed={passedOf(s, passing)} />
                  </TableCell>
                  <TableCell numeric mono>
                    <Strikes submission={s} />
                  </TableCell>
                  <TableCell className={styles.nowrap}>{s.submittedAt ? formatDateTime(s.submittedAt) : "—"}</TableCell>
                  <TableCell numeric mono className={styles.nowrap}>
                    {dur === null ? "—" : formatDuration(dur)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ul className={styles.stack} aria-label="Submissions">
        {items.map((s) => {
          const dur = durationSeconds(s);
          return (
            <li key={s._id} className={styles.stackRow}>
              <Link href={detailHref(s)} className={styles.stackLink}>
                <span className={styles.stackTop}>
                  <span className={styles.studentLink}>{s.userDetails?.name || "Unnamed"}</span>
                  <span className={styles.stackScore}>{isDone(s) ? formatPercent(s.score?.percentage) : "—"}</span>
                </span>
                <span className={styles.email}>{s.userDetails?.email}</span>
                <span className={styles.stackMeta}>
                  <StatusBadges submission={s} />
                  <PassMark passed={passedOf(s, passing)} />
                </span>
                <span className={styles.stackFine}>
                  {scoreText(s)} marks
                  {dur !== null ? ` · ${formatDuration(dur)}` : ""}
                  {s.submittedAt ? ` · ${formatDateTime(s.submittedAt)}` : ""}
                </span>
                {custom.length ? (
                  <span className={styles.stackFine}>
                    {custom.map((c) => `${c}: ${s.userDetails?.customData?.[c] ?? "—"}`).join(" · ")}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
