"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { 
  CheckCircle2, 
  ArrowLeft, 
  RotateCcw, 
  Share2, 
  FileText,
  AlertCircle
} from "lucide-react";
import { ScoreCard } from "@/components/ScoreCard";
import { CorrectionReview } from "@/components/CorrectionReview";

interface PageProps {
  params: Promise<{ submissionId: string }>;
}

export default function TestResultPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const submissionId = resolvedParams.submissionId;

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchResult();
  }, [submissionId]);

  const fetchResult = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/submissions/${submissionId}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Submission record not found");
      } else {
        setData(json);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load score report");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center text-slate-500 space-y-3">
        <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <h2 className="text-base font-bold text-slate-800">Calculating your score & AI corrections...</h2>
      </div>
    );
  }

  if (error || !data?.submission) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Score Report Not Found</h2>
        <p className="text-xs text-slate-500">{error}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Return Home
        </Link>
      </div>
    );
  }

  const { submission, corrections } = data;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        {submission.testCode && submission.allowRetake && (
          <Link
            href={`/test/${submission.testCode}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retake Exam</span>
          </Link>
        )}
      </div>

      {/* Main Score Card with Confetti */}
      <ScoreCard
        score={submission.score}
        maxScore={submission.maxScore}
        percentage={submission.percentage}
        passed={submission.passed}
        passScorePercentage={submission.passScorePercentage}
        studentName={submission.studentName}
        testTitle={submission.testTitle}
        testCode={submission.testCode}
        timeSpentSeconds={submission.timeSpentSeconds}
        isAutoSubmitted={submission.isAutoSubmitted}
        allowRetake={submission.allowRetake}
      />

      {/* Question Review & AI Explanations */}
      {submission.showCorrectionsImmediately && corrections && corrections.length > 0 && (
        <CorrectionReview corrections={corrections} />
      )}
    </div>
  );
}
