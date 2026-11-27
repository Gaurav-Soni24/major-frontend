import SubmissionDetail from "@/features/results/components/SubmissionDetail";

export const metadata = { title: "Submission" };

export default async function SubmissionDetailPage({ params }) {
  const { submissionId } = await params;
  return <SubmissionDetail submissionId={submissionId} />;
}
