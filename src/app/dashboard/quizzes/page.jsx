import { Suspense } from "react";
import QuizzesView from "@/features/quizzes-list/QuizzesView";
import { PageHeader, Skeleton } from "@/components/ui";

export const metadata = { title: "Quizzes" };

export default function QuizzesPage() {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="Quizzes" />
          <Skeleton height={240} />
        </>
      }
    >
      <QuizzesView />
    </Suspense>
  );
}
