"use client";

import { useState } from "react";
import { Badge, Button, Icon, Mark, Panel, Tick } from "@/components/ui";
import { formatQuestionNumber } from "@/lib/utils/format";
import { typeLabel } from "../logic/analytics";
import { answerLines } from "../logic/grading";
import CodeView from "./CodeView";
import GradeEditor from "./GradeEditor";
import styles from "./detail.module.css";

/** One answer block (student answer or correct/reference answer), rendered per question type. */
function Answer({ type, value, language, label, empty }) {
  const lines = answerLines(value);
  if (lines.length === 0) return <p className={styles.noAnswer}>{empty}</p>;
  if (type === "code") return <CodeView value={lines.join("\n")} language={language} label={label} />;
  if (Array.isArray(value) && value.length > 1) {
    return (
      <ul className={styles.answerList}>
        {lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
    );
  }
  return <p className={type === "integer" ? styles.answerNum : styles.answerText}>{lines.join(", ")}</p>;
}

function Outcome({ q }) {
  if (q.needsReview) return <Badge status="needs-review" />;
  if (q.marks > 0 && q.marksObtained >= q.marks) {
    return (
      <span className={styles.ok}>
        <Tick size={16} />
        Correct
      </span>
    );
  }
  if (q.marksObtained > 0) return <Badge tone="partial">Partial</Badge>;
  return (
    <span className={styles.no}>
      <Icon name="x" size={16} />
      Incorrect
    </span>
  );
}

/**
 * Per-question review with inline manual grading.
 * @param {{ questions: any[], canGrade: boolean, languages: Record<number,string>, onGrade: (index: number, g: { marksObtained: number, feedback: string }) => Promise<{ ok: boolean, errors?: any }> }} props
 */
export default function QuestionReview({ questions, canGrade, languages, onGrade }) {
  const [editing, setEditing] = useState(null);
  const pending = questions.filter((q) => q.needsReview).length;

  return (
    <Panel
      title="Question review"
      description={pending > 0 ? `${pending} ${pending === 1 ? "answer needs" : "answers need"} your marks.` : undefined}
      padded={false}
    >
      <table className={styles.review}>
        <caption className="sr-only">Each question with the answer given, marks and result</caption>
        <thead>
          <tr>
            <th scope="col">No.</th>
            <th scope="col">Question and answer</th>
            <th scope="col" className={styles.thNum}>
              Marks
            </th>
            <th scope="col">Result</th>
          </tr>
        </thead>
        <tbody>
          {questions.map((q, i) => {
            const isEditing = editing === i;
            const objective = q.questionType === "single" || q.questionType === "multiple" || q.questionType === "integer";
            const lang = languages[q.questionId] || "javascript";
            return (
              <tr key={i} className={q.needsReview ? styles.rowReview : undefined}>
                <td className={styles.cNo} data-label="No.">
                  <span className={styles.qNo}>{formatQuestionNumber(i + 1)}</span>
                  <span className={styles.qType}>{typeLabel(q.questionType)}</span>
                </td>
                <td className={styles.cBody}>
                  <p className={styles.qText}>{q.questionText}</p>
                  <div className={styles.ans}>
                    <h4 className={styles.ansLabel}>Student answer</h4>
                    <Answer type={q.questionType} value={q.userAnswer} language={lang} label={`Student code for question ${i + 1}`} empty="No answer given." />
                  </div>
                  {!objective || !q.isCorrect ? (
                    <div className={styles.ans}>
                      <h4 className={styles.ansLabel}>{objective ? "Correct answer" : "Reference answer"}</h4>
                      <Answer type={q.questionType === "code" ? "text" : q.questionType} value={q.correctAnswer} language={lang} label="Reference" empty="No reference answer was set." />
                    </div>
                  ) : null}
                  {q.aiFeedback ? (
                    <p className={styles.feedback}>
                      <strong>AI feedback:</strong> {q.aiFeedback}
                    </p>
                  ) : null}
                  {q.teacherFeedback ? (
                    <p className={styles.feedback}>
                      <strong>Your feedback:</strong> {q.teacherFeedback}
                    </p>
                  ) : null}
                  {q.needsReview ? <p className={styles.reviewNote}>The AI could not grade this answer, so it currently scores 0. Award marks below.</p> : null}
                  {canGrade ? (
                    isEditing ? (
                      <GradeEditor
                        question={q}
                        number={i + 1}
                        onCancel={() => setEditing(null)}
                        onSave={async (g) => {
                          const res = await onGrade(i, g);
                          if (res.ok) setEditing(null);
                          return res;
                        }}
                      />
                    ) : (
                      <div className={styles.gradeBtn} data-html2canvas-ignore="true">
                        <Button size="sm" variant={q.needsReview ? "primary" : "secondary"} iconLeft="pencil" onClick={() => setEditing(i)}>
                          {q.needsReview ? "Grade answer" : q.manuallyGraded ? "Change grade" : "Adjust marks"}
                        </Button>
                        {q.manuallyGraded ? <span className={styles.qType}>Graded by you</span> : null}
                      </div>
                    )
                  ) : null}
                </td>
                <td className={styles.cMarks} data-label="Marks">
                  <Mark value={q.marks} obtained={q.marksObtained} />
                </td>
                <td className={styles.cRes} data-label="Result">
                  <Outcome q={q} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}
