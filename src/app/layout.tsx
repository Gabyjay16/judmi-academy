import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Judmi Academy - AI Exams, Paper Scanner & Academic Hub",
  description: "Judmi Academy is an AI assessment platform that generates exams from notes, grades handwritten physical scripts using camera OCR, evaluates essays, and manages school sub-accounts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-slate-50 text-slate-900 min-h-screen flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
        <Navbar />
        <main className="flex-1">
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white/70 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>© {new Date().getFullYear()} Judmi Academy. AI Assessment & School Management System.</p>
            <p className="flex items-center gap-2">
              <span>Powered by Google Gemini AI & Mobile Money (MTN & Orange)</span>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
