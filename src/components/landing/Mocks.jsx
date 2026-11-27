"use client";

import {
  AnswerOption,
  Badge,
  Button,
  CopyField,
  Icon,
  Mark,
  Panel,
  ProgressBar,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Textarea,
} from "@/components/ui";
import styles from "./landing.module.css";

/**
 * Non-interactive illustrations of the real screens, composed from the same ui components the app uses.
 * `inert` removes them from the tab order and the accessibility tree; the copy beside each one carries the meaning.
 * Data shown is sample data and labelled as such.
 */
export function Mock({ label = "Sample screen", children, className = "" }) {
  return (
    <figure className={`${styles.mock} ${className}`}>
      <figcaption className={styles.mockLabel}>{label}</figcaption>
      <div inert aria-hidden="true" className={styles.mockBody}>
        {children}
      </div>
    </figure>
  );
}

const QUESTION_ROWS = [
  { type: "Single", icon: "list", text: "Which scheduling algorithm can cause starvation?", marks: 1 },
  { type: "Multiple", icon: "check", text: "Select the necessary conditions for a deadlock.", marks: 2 },
  { type: "Number", icon: "hash", text: "How many page faults does FIFO give for this string?", marks: 2 },
  { type: "Text", icon: "pencil", text: "Explain the difference between a process and a thread.", marks: 5 },
  { type: "Code", icon: "code", text: "Write a function that detects a cycle in a linked list.", marks: 10 },
];

/** Step 1: write or generate. */
export function CreateMock() {
  return (
    <Mock label="Sample screen: create a quiz">
      <Panel title="Generate from a syllabus" padded>
        <Textarea mono rows={3} readOnly defaultValue={"Operating systems: processes and threads, CPU scheduling, deadlocks, memory management, paging."} aria-label="Syllabus" tabIndex={-1} />
        <div className={styles.countsRow}>
          {["Single 5", "Multiple 2", "Number 2", "Text 1", "Code 1"].map((c) => (
            <span key={c} className={styles.chip}>
              {c}
            </span>
          ))}
        </div>
        <Button iconLeft="sparkle" tabIndex={-1}>
          Generate questions
        </Button>
      </Panel>
      <ol className={styles.qlist} role="list">
        {QUESTION_ROWS.slice(0, 3).map((r, i) => (
          <li key={r.type}>
            <span className={styles.qlNo}>{String(i + 1).padStart(2, "0")}</span>
            <Icon name={r.icon} size={16} />
            <span className={styles.qlText}>{r.text}</span>
            <Mark value={r.marks} />
          </li>
        ))}
      </ol>
    </Mock>
  );
}

/** Step 2: publish and share. */
export function ShareMock() {
  return (
    <Mock label="Sample screen: publish and share">
      <Panel title="Operating Systems, Unit 2" actions={<Badge status="published" />} padded>
        <dl className={styles.facts}>
          <div>
            <dt>Time limit</dt>
            <dd>45 min</dd>
          </div>
          <div>
            <dt>Passing score</dt>
            <dd>40%</dd>
          </div>
          <div>
            <dt>Password</dt>
            <dd>Set</dd>
          </div>
          <div>
            <dt>Questions</dt>
            <dd>10</dd>
          </div>
        </dl>
        <CopyField label="Quiz link" value="https://your-quizify-site/attempt/64f1c9a2" />
        <p className={styles.mockHint}>Anyone with the link can start. Students verify with Google first.</p>
      </Panel>
    </Mock>
  );
}

/** Step 3 and teacher section: results grid. */
export function ResultsMock() {
  const rows = [
    { n: "Student 01", s: "graded", score: "34 / 40", pct: "85%", flags: 0 },
    { n: "Student 02", s: "needs-review", score: "27 / 40", pct: "68%", flags: 0 },
    { n: "Student 03", s: "submitted", score: "18 / 40", pct: "45%", flags: 3 },
    { n: "Student 04", s: "in-progress", score: "—", pct: "—", flags: 0 },
  ];
  return (
    <Mock label="Sample data: submissions">
      <Table caption="Submissions for Operating Systems, Unit 2">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Student</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell numeric>Score</TableHeaderCell>
            <TableHeaderCell numeric>Flags</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.n}>
              <TableCell>{r.n}</TableCell>
              <TableCell>
                <Badge status={r.s} />
              </TableCell>
              <TableCell numeric mono>
                {r.score}
              </TableCell>
              <TableCell numeric mono>
                {r.flags ? <span className={styles.flagged}>{r.flags}</span> : "0"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Mock>
  );
}

/** Teacher section: the editor with its settings. */
export function EditorMock() {
  return (
    <Mock label="Sample screen: quiz editor">
      <div className={styles.editor}>
        <ol className={styles.qlist} role="list">
          {QUESTION_ROWS.map((r, i) => (
            <li key={r.type} className={i === 3 ? styles.qlActive : undefined}>
              <span className={styles.qlNo}>{String(i + 1).padStart(2, "0")}</span>
              <Icon name={r.icon} size={16} />
              <span className={styles.qlText}>{r.text}</span>
              <Mark value={r.marks} />
            </li>
          ))}
        </ol>
        <div className={styles.settings}>
          <Switch label="Shuffle questions" checked onChange={() => {}} />
          <Switch label="Shuffle options" checked onChange={() => {}} />
          <Switch label="Show answers after submit" checked={false} onChange={() => {}} />
          <Switch label="Webcam monitoring" checked onChange={() => {}} />
        </div>
      </div>
    </Mock>
  );
}

/** Student section: the quiet player. */
export function PlayerMock() {
  const cells = Array.from({ length: 20 }, (_, i) => i + 1);
  const answered = new Set([1, 2, 3, 4, 5, 6, 8, 9]);
  return (
    <Mock label="Sample screen: the quiz player" className={styles.playerMock}>
      <div className={styles.player}>
        <div className={styles.pTop}>
          <strong>Operating Systems, Unit 2</strong>
          <span className={styles.pTimer}>38:12</span>
          <span className={styles.pMeta}>Answered 8 of 20</span>
          <span className={styles.pMeta}>Saved 14:02:11</span>
        </div>
        <ProgressBar value={8} max={20} label="Answered questions" />
        <div className={styles.pBody}>
          <div className={styles.pSheet}>
            <div className={styles.pHead}>
              <span className={styles.qno}>07</span>
              <Mark value={2} />
            </div>
            <p className={styles.pQ}>Select all the conditions that are necessary for a deadlock to occur.</p>
            <div className={styles.pOpts}>
              <AnswerOption multiple checked readOnly onChange={() => {}}>
                Mutual exclusion
              </AnswerOption>
              <AnswerOption multiple checked readOnly onChange={() => {}}>
                Hold and wait
              </AnswerOption>
              <AnswerOption multiple checked={false} readOnly onChange={() => {}}>
                Resource preemption
              </AnswerOption>
              <AnswerOption multiple checked={false} readOnly onChange={() => {}}>
                Circular wait
              </AnswerOption>
            </div>
            <div className={styles.pNav}>
              <Button variant="secondary" tabIndex={-1}>
                Previous
              </Button>
              <Button tabIndex={-1}>Next</Button>
            </div>
          </div>
          <div className={styles.pPalette}>
            <p className={styles.palLabel}>Questions</p>
            <div className={styles.palGrid}>
              {cells.map((n) => (
                <span key={n} className={`${styles.cell} ${answered.has(n) ? styles.cellDone : ""} ${n === 7 ? styles.cellNow : ""} ${n === 10 ? styles.cellFlag : ""}`}>
                  {n}
                </span>
              ))}
            </div>
            <p className={styles.palKey}>Filled: answered. Outlined: current. Dotted: marked for review.</p>
          </div>
        </div>
      </div>
    </Mock>
  );
}
