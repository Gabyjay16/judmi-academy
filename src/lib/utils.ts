import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateTestCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function getGradeLetter(percentage: number): { letter: string; color: string; feedback: string } {
  if (percentage >= 90) return { letter: "A+", color: "text-emerald-600 bg-emerald-50 border-emerald-200", feedback: "Outstanding Mastery! Exceptional performance." };
  if (percentage >= 80) return { letter: "A", color: "text-emerald-600 bg-emerald-50 border-emerald-200", feedback: "Excellent performance! Strong grasp of material." };
  if (percentage >= 70) return { letter: "B", color: "text-blue-600 bg-blue-50 border-blue-200", feedback: "Good Job! Solid understanding with minor gaps." };
  if (percentage >= 60) return { letter: "C", color: "text-amber-600 bg-amber-50 border-amber-200", feedback: "Satisfactory. Review the highlighted corrections to improve." };
  if (percentage >= 50) return { letter: "D", color: "text-orange-600 bg-orange-50 border-orange-200", feedback: "Pass. Significant revision needed on weak topics." };
  return { letter: "F", color: "text-rose-600 bg-rose-50 border-rose-200", feedback: "Needs Improvement. Review the study corrections below carefully." };
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}
