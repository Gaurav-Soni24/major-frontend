import TeacherShell from "@/components/layout/TeacherShell";

export const metadata = { title: { default: "Dashboard", template: "%s | Quizify" }, robots: { index: false, follow: false } };

export default function DashboardLayout({ children }) {
  return <TeacherShell>{children}</TeacherShell>;
}
