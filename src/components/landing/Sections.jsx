import Link from "next/link";
import { Button, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Logo } from "@/components/ui";
import Reveal from "./Reveal";
import Workflow from "./Workflow";
import { EditorMock, PlayerMock, ResultsMock } from "./Mocks";
import styles from "./landing.module.css";

const REPO_FRONT = "https://github.com/Gaurav-Soni24/major-frontend";
const REPO_BACK = "https://github.com/Gaurav-Soni24/major-backend";

export function HowItWorks() {
  return (
    <section id="how" className={styles.section} aria-labelledby="how-title">
      <Reveal className={styles.sectionHead}>
        <h2 id="how-title" className={styles.h2}>
          From syllabus to marked paper in three steps
        </h2>
      </Reveal>
      <Workflow />
    </section>
  );
}

const TEACHER_FEATURES = [
  ["Five question types", "Single answer, multiple answers, number, written text and code (JavaScript or Python), each with its own marks."],
  ["Generate from a syllabus", "Choose how many questions of each type and the difficulty. Review, edit or regenerate any single question."],
  ["Control the attempt", "Shuffle questions and options, set a time limit and a passing score, add a quiz password and up to five extra fields."],
  ["Share by link", "Publish to get a link. Unpublish when you are done. The server keeps the time, so a student cannot extend it."],
  ["Per-question review", "Open any submission to see each answer beside the correct one, the marks given and the AI's feedback. Adjust marks by hand."],
];

export function ForTeachers() {
  return (
    <section id="teachers" className={styles.section} aria-labelledby="teachers-title">
      <div className={styles.split}>
        <Reveal className={styles.splitText}>
          <h2 id="teachers-title" className={styles.h2}>
            The teacher&rsquo;s side: set it up once, then read the results
          </h2>
          <dl className={styles.dl}>
            {TEACHER_FEATURES.map(([t, d]) => (
              <div key={t} className={styles.dlRow}>
                <dt>{t}</dt>
                <dd>{d}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
        <Reveal className={styles.splitMocks} delay={80}>
          <EditorMock />
          <ResultsMock />
        </Reveal>
      </div>
    </section>
  );
}

export function ForStudents() {
  return (
    <section id="students" className={styles.section} aria-labelledby="students-title">
      <div className={`${styles.split} ${styles.splitFlip}`}>
        <Reveal className={styles.splitText}>
          <h2 id="students-title" className={styles.h2}>
            The student&rsquo;s side: one quiet page, nothing to lose
          </h2>
          <dl className={styles.dl}>
            <div className={styles.dlRow}>
              <dt>No account</dt>
              <dd>Open the link, verify with Google, add the details the teacher asked for, and begin.</dd>
            </div>
            <div className={styles.dlRow}>
              <dt>Answers are saved as you go</dt>
              <dd>Each answer is saved to the server automatically. If the page reloads or the connection drops, you resume where you were until the time runs out.</dd>
            </div>
            <div className={styles.dlRow}>
              <dt>Always know where you are</dt>
              <dd>The time left, how many questions are answered, when the last save happened, and a palette to jump to any question.</dd>
            </div>
            <div className={styles.dlRow}>
              <dt>Check before submitting</dt>
              <dd>Submitting lists any unanswered questions first, so nothing is left blank by accident.</dd>
            </div>
          </dl>
        </Reveal>
        <Reveal className={styles.splitMocks} delay={80}>
          <PlayerMock />
        </Reveal>
      </div>
    </section>
  );
}

const GRADING = [
  ["Single answer", "The chosen option must match the correct one exactly."],
  ["Multiple answers", "The set of options chosen must equal the set of correct options."],
  ["Number", "Compared as numbers, so 24 and 24.0 both count."],
  ["Written text", "Graded by AI against your rubric. Marks are capped at the question’s marks."],
  ["Code", "Graded by AI against your rubric, for JavaScript or Python. Marks are capped the same way."],
];

const PROCTORING = [
  ["Webcam", "Face monitoring through the student’s webcam while they attempt."],
  ["Tab switches", "Leaving the quiz tab is counted."],
  ["Copy and paste", "Attempts to copy or paste are counted."],
  ["Strikes", "You set the tolerance, from 1 to 10. When a student reaches it, the attempt is submitted automatically."],
  ["Flagged snapshots", "Moments the system flags come with a snapshot you can open in the submission."],
];

export function Integrity() {
  return (
    <section id="integrity" className={styles.section} aria-labelledby="integrity-title">
      <Reveal className={styles.sectionHead}>
        <h2 id="integrity-title" className={styles.h2}>
          Proctoring and grading you can read
        </h2>
      </Reveal>
      <div className={styles.integrity}>
        <Reveal>
          <h3 className={styles.h3}>What proctoring watches</h3>
          <dl className={styles.dl}>
            {PROCTORING.map(([t, d]) => (
              <div key={t} className={styles.dlRow}>
                <dt>{t}</dt>
                <dd>{d}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.note}>Proctoring flags behaviour for you to review. Apart from the strike limit you set, it never decides anything on its own.</p>
        </Reveal>
        <Reveal delay={80}>
          <h3 className={styles.h3}>How each answer is marked</h3>
          <Table caption="How each question type is marked">
            <TableHead>
              <TableRow>
                <TableHeaderCell width="34%">Type</TableHeaderCell>
                <TableHeaderCell>Marked by</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {GRADING.map(([t, d]) => (
                <TableRow key={t}>
                  <TableCell>
                    <strong>{t}</strong>
                  </TableCell>
                  <TableCell>{d}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className={styles.note}>If AI grading is unavailable, that question scores 0 and the submission is marked Needs review, so you can grade it by hand.</p>
        </Reveal>
      </div>
    </section>
  );
}

export function Closing() {
  return (
    <>
      <section className={styles.section} aria-labelledby="built-title">
        <Reveal className={styles.built}>
          <h2 id="built-title" className={styles.h2}>
            Built as a final-year project
          </h2>
          <p className={styles.builtText}>
            Quizify is a B.Tech final-year project at Government Engineering College Bilaspur. It is not a company and there are no customers to quote. The code is public, so you can read how the marking and the proctoring work.
          </p>
          <p className={styles.repoLinks}>
            <a href={REPO_FRONT} target="_blank" rel="noopener noreferrer">
              Frontend repository<span className="sr-only"> (opens in a new tab)</span>
            </a>
            <a href={REPO_BACK} target="_blank" rel="noopener noreferrer">
              Backend repository<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </p>
        </Reveal>
      </section>

      <section className={styles.final} aria-labelledby="final-title">
        <Reveal className={styles.finalInner}>
          <h2 id="final-title" className={styles.finalTitle}>
            Set your first paper.
          </h2>
          <div className={styles.ctas}>
            <Button href="/register" size="lg" iconRight="arrow-right">
              Create a quiz
            </Button>
            <Button href="/login" variant="secondary" size="lg">
              Sign in
            </Button>
          </div>
          <p className={styles.finalNote}>
            Students: use the link your teacher sent. <Link href="/student">Look up your results</Link>.
          </p>
        </Reveal>
      </section>
    </>
  );
}

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <Logo />
        <nav aria-label="Footer" className={styles.footerLinks}>
          <Link href="/login">Sign in</Link>
          <Link href="/register">Create an account</Link>
          <Link href="/student">Student results</Link>
          <a href={REPO_FRONT} target="_blank" rel="noopener noreferrer">
            Frontend code
          </a>
          <a href={REPO_BACK} target="_blank" rel="noopener noreferrer">
            Backend code
          </a>
        </nav>
        <p className={styles.footerNote}>A final-year project, Government Engineering College Bilaspur.</p>
      </div>
    </footer>
  );
}
