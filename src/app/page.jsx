import LandingNav from "@/components/landing/LandingNav";
import Hero from "@/components/landing/Hero";
import { HowItWorks, ForTeachers, ForStudents, Integrity, Closing, Footer } from "@/components/landing/Sections";

export const metadata = {
  title: { absolute: "Quizify | Online quizzes with proctoring and AI grading" },
  description:
    "Write a quiz or generate one from a syllabus, share a link, and review marked submissions. Webcam and tab-switch proctoring, AI grading for written and code answers, five question types.",
  alternates: { canonical: "/" },
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://major-frontend-sable.vercel.app";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Quizify",
  url: SITE_URL,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  description:
    "Online assessment platform: create or AI-generate quizzes, share a link, proctored attempts, AI grading for written and code answers, and per-question results review.",
  featureList: [
    "Five question types: single answer, multiple answers, number, text and code",
    "Quiz generation from a syllabus",
    "Shuffle, time limit, password and custom fields",
    "Webcam, tab-switch and copy-paste proctoring with strikes",
    "AI grading for written and code answers",
    "Autosaved attempts and per-question results",
  ],
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <LandingNav />
      <main id="main" tabIndex={-1} style={{ outline: "none" }}>
        <Hero />
        <HowItWorks />
        <ForTeachers />
        <ForStudents />
        <Integrity />
        <Closing />
      </main>
      <Footer />
    </>
  );
}
