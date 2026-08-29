"use client";

import { useEffect, useRef } from "react";
import { 
  Trophy, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Award, 
  Sparkles, 
  RotateCcw,
  Share2,
  Lock
} from "lucide-react";
import { getGradeLetter, formatTime } from "@/lib/utils";
import Link from "next/link";

interface ScoreCardProps {
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  passScorePercentage: number;
  studentName: string;
  testTitle: string;
  testCode?: string;
  timeSpentSeconds: number;
  isAutoSubmitted?: boolean;
  allowRetake?: boolean;
}

// Lightweight self-contained confetti burst
function launchConfetti() {
  if (typeof window === "undefined") return;
  const count = 50;
  const colors = ["#4f46e5", "#10b981", "#f59e0b", "#ec4899", "#3b82f6"];
  
  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.style.position = "fixed";
    el.style.zIndex = "9999";
    el.style.width = `${Math.random() * 8 + 6}px`;
    el.style.height = `${Math.random() * 8 + 6}px`;
    el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    el.style.left = `${Math.random() * 80 + 10}vw`;
    el.style.top = `-20px`;
    el.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
    el.style.pointerEvents = "none";
    el.style.transition = `transform ${Math.random() * 2 + 2}s cubic-bezier(0.25, 1, 0.5, 1), opacity 2.5s ease-out`;
    
    document.body.appendChild(el);

    setTimeout(() => {
      const xOffset = (Math.random() - 0.5) * 300;
      const yOffset = Math.random() * 80 + 70;
      const rotation = Math.random() * 720 - 360;
      el.style.transform = `translate(${xOffset}px, ${yOffset}vh) rotate(${rotation}deg)`;
      el.style.opacity = "0";
    }, 20);

    setTimeout(() => {
      el.remove();
    }, 3000);
  }
}

export function ScoreCard({
  score,
  maxScore,
  percentage,
  passed,
  passScorePercentage,
  studentName,
  testTitle,
  testCode,
  timeSpentSeconds,
  isAutoSubmitted,
  allowRetake = true,
}: ScoreCardProps) {
  const gradeInfo = getGradeLetter(percentage);
  const confettiTriggered = useRef(false);

  useEffect(() => {
    if (passed && percentage >= 70 && !confettiTriggered.current) {
      confettiTriggered.current = true;
      launchConfetti();
    }
  }, [passed, percentage]);

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title: `${studentName}'s Score on ${testTitle}`,
        text: `I scored ${percentage}% (${score}/${maxScore}) on ${testTitle}!`,
        url: window.location.href,
      }).catch(() => {});
    } else if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      alert("Result link copied to clipboard!");
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-100 overflow-hidden">
      {/* Top Banner */}
      <div
        className={`p-6 sm:p-8 text-white relative overflow-hidden ${
          passed
            ? "bg-gradient-to-br from-indigo-600 via-indigo-700 to-emerald-600"
            : "bg-gradient-to-br from-slate-800 via-slate-900 to-rose-900"
        }`}
      >
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-100 text-xs font-semibold uppercase tracking-wider">
              <span>Exam Result Report</span>
              {testCode && <span className="bg-white/20 px-2 py-0.5 rounded font-mono">{testCode}</span>}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1 tracking-tight text-white">
              {testTitle}
            </h1>
            <p className="text-sm text-indigo-100/90 mt-1">
              Candidate: <span className="font-semibold text-white">{studentName}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex flex-col items-center justify-center font-bold text-2xl sm:text-3xl shadow-inner ${
                passed ? "bg-white text-indigo-700" : "bg-white/10 text-white border border-white/20"
              }`}
            >
              <span>{gradeInfo.letter}</span>
              <span className="text-[10px] font-normal uppercase tracking-wide opacity-80">Grade</span>
            </div>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="mt-6 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 text-xs text-white/90">
          <div className="flex items-center gap-2">
            {passed ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                Passed (Required: {passScorePercentage}%)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-200 border border-rose-400/30 font-semibold">
                <XCircle className="w-3.5 h-3.5 text-rose-300" />
                Below Pass Mark ({passScorePercentage}%)
              </span>
            )}

            {isAutoSubmitted && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-200 text-[11px]">
                <Clock className="w-3 h-3" /> Auto-Submitted (Time Out)
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 opacity-70" />
            <span>Time Taken: {formatTime(timeSpentSeconds)}</span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="p-6 sm:p-8 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-slate-100 bg-slate-50/50">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Final Score</div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
            {score} <span className="text-sm font-normal text-slate-400">/ {maxScore}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Percentage</div>
          <div className={`text-2xl sm:text-3xl font-bold mt-1 ${passed ? "text-indigo-600" : "text-rose-600"}`}>
            {percentage}%
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Correct Answers</div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-1">
            {score}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Incorrect Answers</div>
          <div className="text-2xl sm:text-3xl font-bold text-rose-600 mt-1">
            {maxScore - score}
          </div>
        </div>
      </div>

      {/* Feedback Note & Actions */}
      <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">Performance Summary</h4>
            <p className="text-xs text-slate-600 mt-0.5">{gradeInfo.feedback}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleShare}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share Result
          </button>

          {testCode && (
            allowRetake ? (
              <Link
                href={`/test/${testCode}`}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retake Test
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-slate-500 bg-slate-100 rounded-xl border border-slate-200">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                Retakes Disabled
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
