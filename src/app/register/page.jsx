import RegisterForm from "@/components/auth/RegisterForm";

export const metadata = {
  title: "Create your account",
  description: "Create a Quizify teacher account to write or generate quizzes, share a link and review marked submissions.",
  alternates: { canonical: "/register" },
};

export default function RegisterPage() {
  return <RegisterForm />;
}
