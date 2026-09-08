import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import PwaRegister from "@/components/PwaRegister";
import BrandTheme from "@/components/BrandTheme";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const APP_TITLE = "Judmi Academy - AI Exams, Paper Scanner & Academic Hub";
const APP_DESCRIPTION = "Judmi Academy is an AI assessment platform that generates exams from notes, grades handwritten physical scripts using camera OCR, evaluates essays, and manages school sub-accounts.";

export const metadata: Metadata = {
  title: {
    default: APP_TITLE,
    template: "%s | Judmi Academy",
  },
  description: APP_DESCRIPTION,
  applicationName: "Judmi Academy",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Judmi Academy",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1a2c47",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
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
        <BrandTheme />
        <PwaRegister />
        <main className="flex-1">
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white/70 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>© {new Date().getFullYear()} Judmi Academy. AI Assessment & School Management System.</p>
            <p className="flex items-center gap-2">
              <span>Created by Gabsa Brandon Judmi</span>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
