import AttemptApp from "@/features/attempt/AttemptApp";

export default async function AttemptPage({ params }) {
  const { id } = await params;
  return <AttemptApp quizId={id} />;
}
