import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";

export const metadata = {
  title: "Sign in",
  description: "Sign in to Quizify to manage your quizzes and review submissions.",
  alternates: { canonical: "/login" },
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
