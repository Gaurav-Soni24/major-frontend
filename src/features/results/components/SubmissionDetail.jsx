"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, quizzes, submissions } from "@/lib/api";
import { Button, ConfirmDialog, PageHeader, Skeleton, toast } from "@/components/ui";
import { useAsync } from "../hooks/useAsync";
import { applyGrade, optimisticGrade } from "../logic/grading";
import ErrorPanel from "./ErrorPanel";
import MarksSlip, { Notices } from "./MarksSlip";
import ProctoringPanel from "./ProctoringPanel";
import QuestionReview from "./QuestionReview";
import { isDone } from "../logic/status";
import styles from "./detail.module.css";

// Printing: hide the app chrome (sidebar, top bar, skip link) and every control; keep the slip, counters and review.
const PRINT_CSS = `@media print {
  aside[aria-label="Primary"], .skip-link, header:has(+ main#main), [data-no-print] { display: none !important; }
  div:has(> main#main) { margin-left: 0 !important; }
  body { background: #fff !important; }
}`;

function DetailSkeleton() {
  return (
    <div aria-busy="true" className={styles.skeleton}>
      <span className="sr-only" role="status">
        Loading submission
      </span>
      <Skeleton width={260} height={32} />
      <Skeleton height={140} />
      <Skeleton height={200} />
      <Skeleton height={320} />
    </div>
  );
}

/** One submission: slip, proctoring, per-question review, manual grading, PDF/print and delete. */
export default function SubmissionDetail({ submissionId }) {
  const router = useRouter();
  const reportRef = useRef(null);
  const detail = useAsync(() => submissions.getSubmissionDetails(submissionId), submissionId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  const submission = detail.data?.submission;
  const quiz = detail.data?.quiz;
  const { setData } = detail;

  // Code highlighting needs each code question's language, which only the full quiz carries. Optional: failures are ignored.
  const hasCode = !!submission?.questions?.some((q) => q.questionType === "code");
  const quizFull = useAsync(() => (hasCode && quiz ? quizzes.getQuiz(quiz._id).catch(() => null) : Promise.resolve(null)), `${hasCode}:${quiz?._id}`);
  const languages = useMemo(() => {
    const map = {};
    (quizFull.data?.quiz?.questions || []).forEach((q, i) => {
      if (q.codeLanguage) map[i] = q.codeLanguage;
    });
    return map;
  }, [quizFull.data]);

  const onGrade = useCallback(
    async (index, grade) => {
      const before = detail.data;
      setData({ ...before, submission: optimisticGrade(before.submission, index, grade) });
      try {
        const res = await submissions.gradeQuestion(submissionId, { questionIndex: index, marksObtained: grade.marksObtained, feedback: grade.feedback });
        setData({ ...before, submission: applyGrade(before.submission, index, grade, res) });
        toast.success(res.status === "graded" ? "Grade saved. Every answer is now graded." : "Grade saved.");
        return { ok: true };
      } catch (e) {
        setData(before); // roll back
        const fields = e instanceof ApiError ? e.fieldErrors : {};
        const errors = { ...fields };
        if (!Object.keys(fields).length) errors.form = e?.message || "Could not save the grade.";
        return { ok: false, errors };
      }
    },
    [detail.data, setData, submissionId],
  );

  async function remove() {
    setDeleting(true);
    try {
      await submissions.deleteSubmission(submissionId);
      toast.success("Submission deleted. The student can attempt the quiz again.");
      router.replace(`/dashboard/submissions/${quiz._id}`);
    } catch (e) {
      setDeleting(false);
      setConfirmDelete(false);
      toast.error(e?.message || "Could not delete the submission.");
    }
  }

  async function downloadPdf() {
    const el = reportRef.current;
    if (!el) return;
    setPdfBusy(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const data = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new jsPDF("p", "mm", "a4");
      const w = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const h = (canvas.height * w) / canvas.width;
      let left = h;
      let pos = 0;
      pdf.addImage(data, "JPEG", 0, pos, w, h);
      left -= pageH;
      while (left > 0) {
        pos = left - h;
        pdf.addPage();
        pdf.addImage(data, "JPEG", 0, pos, w, h);
        left -= pageH;
      }
      const safe = String(submission.userDetails?.name || "student").replace(/[^\w-]+/g, "_");
      pdf.save(`${safe}_response.pdf`);
    } catch {
      toast.error("Could not create the PDF. Try Print instead.");
    } finally {
      setPdfBusy(false);
    }
  }

  if (detail.error) {
    return <ErrorPanel error={detail.error} onRetry={detail.reload} backHref="/dashboard/quizzes" what="this submission" />;
  }
  if (!submission || !quiz) return <DetailSkeleton />;

  const name = submission.userDetails?.name || "Unnamed student";
  const backHref = `/dashboard/submissions/${quiz._id}`;

  return (
    <div className={styles.page}>
      <style>{PRINT_CSS}</style>
      <Button href={backHref} variant="ghost" size="sm" iconLeft="arrow-left" className={styles.back} data-no-print>
        {quiz.title}
      </Button>
      <div ref={reportRef} className={styles.report}>
        <PageHeader
          title={name}
          description={`${submission.userDetails?.email || ""} · ${quiz.title}`}
          actions={
            <div className={styles.actions} data-html2canvas-ignore="true" data-no-print>
              <Button variant="secondary" onClick={() => window.print()}>
                Print
              </Button>
              <Button variant="secondary" onClick={downloadPdf} loading={pdfBusy}>
                Download PDF
              </Button>
              <Button variant="danger" iconLeft="trash" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            </div>
          }
        />
        <div className={styles.stack}>
          <Notices submission={submission} />
          <MarksSlip submission={submission} quiz={quiz} />
          <ProctoringPanel antiCheat={submission.antiCheat} settings={quiz.antiCheatSettings} />
          {submission.questions?.length ? (
            <QuestionReview questions={submission.questions} canGrade={isDone(submission)} languages={languages} onGrade={onGrade} />
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        loading={deleting}
        tone="danger"
        title="Delete this submission?"
        description={`${name}'s answers, marks and flagged snapshots will be removed for good. The student will then be able to attempt this quiz again.`}
        confirmLabel="Delete submission"
      />
    </div>
  );
}
