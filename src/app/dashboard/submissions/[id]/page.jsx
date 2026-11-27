import { Suspense } from "react";
import ResultsView from "@/features/results/components/ResultsView";

export const metadata = { title: "Quiz results" };

export default async function QuizResultsPage({ params }) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <ResultsView quizId={id} />
    </Suspense>
  );
}
