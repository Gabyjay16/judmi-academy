"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Sparkles, 
  Timer, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft, 
  Flag, 
  User, 
  Check, 
  Send, 
  HelpCircle,
  Clock,
  Lock,
  FileCheck2,
  Building2
} from "lucide-react";
import { TestTimer } from "@/components/TestTimer";
import { StudentViewQuestion } from "@/lib/question-shuffler";

interface PageProps {
  params: Promise<{ code: string }>;
}

export default function StudentTestPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const code = resolvedParams.code.toUpperCase();
  const router = useRouter();

  // Test setup & state
  const [loading, setLoading] = useState(true);
  const [testMeta, setTestMeta] = useState<any | null>(null);
  const [questions, setQuestions] = useState<StudentViewQuestion[]>([]);
  const [assignedQuestionIds, setAssignedQuestionIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previousSubmissionId, setPreviousSubmissionId] = useState<string | null>(null);

  // Student details & session
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [inputSchoolCode, setInputSchoolCode] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  const [startedAt, setStartedAt] = useState<string>("");

  // Live test progress
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Time tracking
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Fetch initial test metadata and user session
  useEffect(() => {
    // Check cached session
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("judmi_user");
        if (cached) {
          const u = JSON.parse(cached);
          setCurrentUser(u);
          if (u.name) setStudentName(u.name);
          if (u.studentId) setStudentId(u.studentId);
        }
      } catch {}
    }

    const fetchMetadata = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/tests/${code}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Test not found");
        } else {
          setTestMeta(data.test);
          if (data.test?.organization?.slug) {
            setInputSchoolCode(data.test.organization.slug);
          }
        }
      } catch (e: any) {
        setError(e.message || "Failed to load test");
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [code]);

  // Start the test after student enters their name
  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      alert("Please enter your name to start the test.");
      return;
    }

    // Check school verification if test is administered by an organization
    const org = testMeta?.organization;
    const isLinkedToThisOrg = Boolean(currentUser?.orgId && org?.id && currentUser.orgId === org.id);

    if (org && !isLinkedToThisOrg) {
      if (!inputSchoolCode.trim()) {
        setError(`This exam is hosted by ${org.name}. Please enter your School Code to verify your enrollment.`);
        return;
      }
      const cleanCode = inputSchoolCode.trim().toLowerCase();
      if (cleanCode !== org.slug?.toLowerCase() && cleanCode !== org.id?.toLowerCase()) {
        setError(`Invalid School Code. This exam belongs to ${org.name}. Please enter the correct school code.`);
        return;
      }
      if (!studentId.trim()) {
        setError(`Student Matricule is strictly required for examinations hosted by ${org.name}.`);
        return;
      }

      // Link school in background
      try {
        await fetch("/api/student/link-school", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schoolCode: inputSchoolCode.trim(),
            studentId: studentId.trim(),
          }),
        });
      } catch {}
    }

    try {
      setLoading(true);
      setError(null);
      setPreviousSubmissionId(null);

      // Fetch assigned questions with student seed
      const queryParams = new URLSearchParams({
        studentName: studentName.trim(),
        studentId: studentId.trim(),
      });

      const res = await fetch(`/api/tests/${code}?${queryParams.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to start test");
        if (data.previousSubmissionId) {
          setPreviousSubmissionId(data.previousSubmissionId);
        }
        return;
      }

      setTestMeta(data.test);
      setQuestions(data.questions);
      setAssignedQuestionIds(data.assignedQuestionIds);
      setStartedAt(new Date().toISOString());
      setHasStarted(true);
    } catch (e: any) {
      setError(e.message || "Error starting test");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const toggleFlag = (questionId: string) => {
    setFlagged((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const handleSubmit = async (isAutoSubmitted: boolean = false) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const totalTime = testMeta ? testMeta.durationMinutes * 60 - elapsedSeconds : 0;

      const res = await fetch(`/api/tests/${code}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: studentName.trim(),
          studentId: studentId.trim(),
          answers,
          assignedQuestionIds,
          timeSpentSeconds: Math.max(1, totalTime),
          isAutoSubmitted,
          startedAt,
        }),
      });

      const data = await res.json();
      if (data.success && data.submissionId) {
        // Clear session timer cache
        sessionStorage.removeItem(`test_${code}_startTime`);
        router.push(`/test/result/${data.submissionId}`);
      } else {
        alert(data.error || "Failed to submit test.");
        setIsSubmitting(false);
      }
    } catch (e: any) {
      console.error("Submission error:", e);
      alert("Submission failed. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center text-slate-500 space-y-3">
        <div className="w-9 h-9 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-medium">Loading examination environment...</p>
      </div>
    );
  }

  if (error && !testMeta) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Exam Unavailable</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          {error || "The test code you entered is invalid or the test has ended."}
        </p>
        <button
          onClick={() => router.push("/")}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs transition-colors"
        >
          Return Home
        </button>
      </div>
    );
  }

  // SCREEN 1: Candidate Registration / Start Exam Prompt
  if (!hasStarted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xl shadow-slate-200/50 space-y-6">
          {/* Header */}
          <div className="text-center space-y-1.5 border-b border-slate-100 pb-5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-mono font-bold">
              <span>EXAM CODE: {testMeta.code}</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {testMeta.title}
            </h1>
            {testMeta.subject && (
              <p className="text-xs text-slate-500">{testMeta.subject}</p>
            )}
          </div>

          {/* Test Rules Overview */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <Timer className="w-4 h-4 text-indigo-600 mx-auto mb-1" />
              <div className="text-xs font-bold text-slate-900">{testMeta.durationMinutes} Mins</div>
              <div className="text-[10px] text-slate-400">Time Limit</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <HelpCircle className="w-4 h-4 text-purple-600 mx-auto mb-1" />
              <div className="text-xs font-bold text-slate-900">{testMeta.totalQuestions} Questions</div>
              <div className="text-[10px] text-slate-400">Total Items</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
              <div className="text-xs font-bold text-slate-900">{testMeta.passScorePercentage}%</div>
              <div className="text-[10px] text-slate-400">Pass Mark</div>
            </div>
          </div>

          {/* Retake Notice */}
          <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">
            <span>Retake Policy:</span>
            {testMeta.allowRetake ? (
              <span className="font-semibold text-emerald-700">✓ Multiple Attempts Allowed</span>
            ) : (
              <span className="font-semibold text-amber-700 flex items-center gap-1">
                <Lock className="w-3 h-3" /> One Attempt Only (Retakes Disabled)
              </span>
            )}
          </div>

          {/* Retake Rejection Alert */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-2 text-xs">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>{error}</span>
              </div>
              {previousSubmissionId && (
                <div className="pt-1">
                  <Link
                    href={`/test/result/${previousSubmissionId}`}
                    className="inline-flex items-center gap-1 text-indigo-700 font-bold hover:underline"
                  >
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>View Your Previous Score Report & Corrections →</span>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleStartExam} className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            {/* School Enrollment Verification Banner if test is hosted by a school */}
            {testMeta.organization && (!currentUser?.orgId || currentUser?.orgId !== testMeta.organization.id) ? (
              <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-xs space-y-3">
                <div className="flex items-center gap-2 text-indigo-950 font-bold">
                  <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>School Verification: {testMeta.organization.name}</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  This examination is administered by <strong>{testMeta.organization.name}</strong>. Please enter your School Code and your Student Matricule to verify your enrollment before starting.
                </p>

                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      School Organization Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={inputSchoolCode}
                      onChange={(e) => setInputSchoolCode(e.target.value)}
                      placeholder="e.g. springfield-academy"
                      className="w-full px-3.5 py-2 rounded-xl border border-indigo-200 text-xs font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Student Matricule <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="e.g. MAT-2026-104"
                      className="w-full px-3.5 py-2 rounded-xl border border-indigo-200 text-xs font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Student ID / Matric Number (Optional)
                </label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g. STU-2026-089"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={!studentName.trim()}
                className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
              >
                <span>Start Assessment</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // SCREEN 2: Live Test Interface
  const currentQ = questions[currentQIndex];
  const totalQ = questions.length;
  const answeredCount = Object.keys(answers).length;
  const currentAnswer = currentQ ? answers[currentQ.id] : undefined;
  const isFlagged = currentQ ? flagged[currentQ.id] : false;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Timer Bar */}
      <TestTimer
        durationMinutes={testMeta.durationMinutes}
        storageKey={`test_${code}`}
        onTimeExpired={() => handleSubmit(true)}
        onTick={(remaining) => setElapsedSeconds(remaining)}
      />

      {/* Main Test Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Left 3 Cols: Active Question */}
        <div className="md:col-span-3 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            {/* Question Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                  {currentQIndex + 1}
                </span>
                <div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Question {currentQIndex + 1} of {totalQ}
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    {currentQ.marks} mark{currentQ.marks > 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleFlag(currentQ.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isFlagged
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Flag className={`w-3.5 h-3.5 ${isFlagged ? "fill-amber-600 text-amber-600" : ""}`} />
                <span>{isFlagged ? "Flagged" : "Flag for Review"}</span>
              </button>
            </div>

            {/* Question Text */}
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">
              {currentQ.questionText}
            </h2>

            {/* MCQ Options */}
            <div className="space-y-3 pt-2">
              {currentQ.options.map((opt, optIdx) => {
                const isSelected = currentAnswer === optIdx;
                const letter = String.fromCharCode(65 + optIdx);

                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => handleSelectOption(currentQ.id, optIdx)}
                    className={`w-full p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/70 shadow-xs ring-2 ring-indigo-500/20"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 bg-white"
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                        isSelected
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {letter}
                    </span>
                    <span className={`text-sm leading-relaxed mt-0.5 ${isSelected ? "font-semibold text-indigo-950" : "text-slate-700"}`}>
                      {opt}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-100">
              <button
                type="button"
                disabled={currentQIndex === 0}
                onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 disabled:opacity-30 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              {currentQIndex < totalQ - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentQIndex((prev) => Math.min(totalQ - 1, prev + 1))}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs"
                >
                  <span>Next Question</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-500/20"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Exam</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Question Navigator */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Questions Navigator
              </h3>
              <span className="text-xs font-bold text-indigo-600">
                {answeredCount}/{totalQ} Answered
              </span>
            </div>

            {/* Grid of Number Bubbles */}
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = answers[q.id] !== undefined;
                const isFlag = flagged[q.id];
                const isCurrent = currentQIndex === idx;

                let styles = "bg-slate-100 text-slate-600 border-transparent";
                if (isCurrent) {
                  styles = "bg-indigo-600 text-white font-bold ring-2 ring-indigo-400";
                } else if (isFlag) {
                  styles = "bg-amber-100 text-amber-800 border-amber-300 font-bold";
                } else if (isAnswered) {
                  styles = "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold";
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentQIndex(idx)}
                    className={`w-9 h-9 rounded-xl text-xs flex items-center justify-center border transition-all ${styles}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300" />
                <span>Flagged for review</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-slate-100" />
                <span>Unanswered</span>
              </div>
            </div>

            {/* Big Submit Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Finish & Submit</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 animate-fade-in">
            <h3 className="text-xl font-bold text-slate-900">
              Confirm Exam Submission
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              You have answered <strong className="text-slate-900">{answeredCount}</strong> out of <strong className="text-slate-900">{totalQ}</strong> questions.
              {answeredCount < totalQ && (
                <span className="block text-amber-700 font-semibold mt-1">
                  ⚠️ You have {totalQ - answeredCount} unanswered question{totalQ - answeredCount > 1 ? "s" : ""}.
                </span>
              )}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors"
              >
                Continue Reviewing
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit(false)}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? "Submitting..." : "Yes, Submit Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
