import { Hanken_Grotesk, Literata, Spline_Sans_Mono } from "next/font/google";
import AppToaster from "@/components/ui/AppToaster";
import "./globals.css";

const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken", display: "swap" });
const literata = Literata({ subsets: ["latin"], variable: "--font-literata", display: "swap", style: ["normal", "italic"] });
const splineMono = Spline_Sans_Mono({ subsets: ["latin"], variable: "--font-spline-mono", display: "swap" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://major-frontend-sable.vercel.app";
const DESCRIPTION =
  "Quizify is an online assessment platform. Write a quiz or generate one from a syllabus, share a link, and review marked, proctored submissions with AI grading for written and code answers.";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Quizify | Online quizzes with proctoring and AI grading", template: "%s | Quizify" },
  description: DESCRIPTION,
  applicationName: "Quizify",
  openGraph: {
    type: "website",
    siteName: "Quizify",
    title: "Quizify | Online quizzes with proctoring and AI grading",
    description: DESCRIPTION,
    url: "/",
  },
  twitter: { card: "summary", title: "Quizify", description: DESCRIPTION },
};

export const viewport = {
  themeColor: "#F4F5F7",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${hanken.variable} ${literata.variable} ${splineMono.variable}`}>
      <body>
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
