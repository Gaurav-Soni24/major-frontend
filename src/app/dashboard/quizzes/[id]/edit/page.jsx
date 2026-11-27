import { QuizEditor } from "@/features/quiz-editor";

export const metadata = { title: "Edit quiz" };

export default async function EditQuizPage({ params }) {
  const { id } = await params;
  return <QuizEditor quizId={id} />;
}
