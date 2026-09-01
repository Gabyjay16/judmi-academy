"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Sparkles, 
  Upload, 
  FileText, 
  Timer, 
  Shuffle, 
  Plus, 
  Trash2, 
  Check, 
  Copy, 
  ArrowRight, 
  CheckCircle2, 
  HelpCircle,
  Settings2,
  RefreshCw,
  BookOpen,
  Lock,
  Zap,
  Crown,
  ListChecks,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { extractTextFromFile } from "@/lib/pdf-parser";
import { UpgradeModal } from "@/components/UpgradeModal";

interface EditableQuestion {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  marks: number;
}

export default function CreateExamPage() {
  const router = useRouter();

  // User & Quota state
  const [user, setUser] = useState<any | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    fetchSession();
  }, []);

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth");
      const data = await res.json();
      if (data.user) setUser(data.user);
    } catch {}
  };

  // Step state
  const [step, setStep] = useState<1 | 2>(1); // 1: Note upload & Generation, 2: Review & Settings

  // Note & Generation inputs
  const [notes, setNotes] = useState("");
  const [subject, setSubject] = useState("General Science & Tech");
  const [questionCount, setQuestionCount] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "mixed">("mixed");
  const [isGenerating, setIsGenerating] = useState(false);

  // Exam Configuration Settings
  const [title, setTitle] = useState("Midterm Assessment");
  const [description, setDescription] = useState("Automated timed assessment generated from curriculum notes.");
  
  // Timer & Duration settings: blank defaults to number of questions (e.g. 20 questions = 20 mins)
  const [durationMinutes, setDurationMinutes] = useState("");

  const [distributionMode, setDistributionMode] = useState<"general" | "shuffled">("shuffled");
  const [questionsPerStudent, setQuestionsPerStudent] = useState(5);
  const [passScorePercentage, setPassScorePercentage] = useState(50);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [showCorrectionsImmediately, setShowCorrectionsImmediately] = useState(true);
  const [allowRetake, setAllowRetake] = useState(true); // Teacher retake permission

  // Generated Questions List
  const [questionsList, setQuestionsList] = useState<EditableQuestion[]>([]);
  const [showQuestions, setShowQuestions] = useState(false);

  // Publishing State
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedCode, setPublishedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Computed number of questions each student answers (drives blank-duration default)
  const effectiveQuestionsToAnswer = distributionMode === "shuffled" 
    ? Math.min(questionsPerStudent, Math.max(1, questionsList.length))
    : Math.max(1, questionsList.length);

  // If the teacher leaves the time blank, use the number of questions (20 questions = 20 mins)
  const effectiveDurationMinutes = durationMinutes.trim()
    ? Math.max(1, Math.min(300, parseInt(durationMinutes, 10) || effectiveQuestionsToAnswer))
    : effectiveQuestionsToAnswer;

  // Blank "number of questions" is allowed — defaults to 10 when left empty
  const parsedQuestionCount = questionCount.trim()
    ? Math.max(1, Math.min(100, parseInt(questionCount, 10) || 10))
    : 10;

  // Sample notes loader for quick testing
  const handleLoadSampleNotes = () => {
    setSubject("Computer Science: Operating Systems & Memory");
    setTitle("OS Memory Management & Virtual Memory Quiz");
    setNotes(`Operating Systems - Memory Management & Paging Notes:
1. Virtual Memory is a storage allocation scheme in which secondary memory can be addressed as though it were part of the main memory. It allows execution of processes that are not completely in physical memory.
2. Paging is a memory management scheme by which a computer stores and retrieves data from secondary storage for use in main memory. In paging, physical memory is divided into fixed-sized blocks called Frames, and logical memory is divided into blocks of the same size called Pages.
3. The Memory Management Unit (MMU) is a hardware component that translates virtual addresses into physical addresses using a Page Table.
4. A Page Fault is an interrupt that occurs when a program tries to access a page that was mapped in address space, but not loaded in physical RAM. The OS must retrieve the page from swap space on disk.
5. Thrashing occurs when a computer's virtual memory subsystem is in a constant state of paging (rapidly exchanging data in memory for data on disk), leading to high disk usage and virtually zero CPU utilization.
6. The Translation Lookaside Buffer (TLB) is a high-speed hardware cache used by the MMU to reduce virtual address translation latency.`);
  };

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const text = await extractTextFromFile(file);
      setNotes(text);
      if (!title || title === "Midterm Assessment") {
        setTitle(`${file.name.replace(/\.[^/.]+$/, "")} Assessment`);
      }
    }
  };

  // Generate Questions with AI
  const handleGenerate = async () => {
    if (!notes.trim()) {
      alert("Please enter or upload teaching notes first.");
      return;
    }

    try {
      setIsGenerating(true);
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes,
          count: parsedQuestionCount,
          difficulty,
          subject,
          type: "mcq",
        }),
      });

      const data = await res.json();

      if (res.status === 403 || data.quotaReached) {
        setShowUpgradeModal(true);
        return;
      }

      if (data.questions && data.questions.length > 0) {
        setQuestionsList(data.questions);
        if (questionsPerStudent > data.questions.length) {
          setQuestionsPerStudent(data.questions.length);
        }
        setShowQuestions(false);
        setStep(2);
      } else {
        alert(data.error || "Could not generate questions. Please try again.");
      }
    } catch (err) {
      console.error("Generation error:", err);
      alert("Failed to generate questions. Please check your connection.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Question editing helpers
  const handleQuestionTextChange = (index: number, text: string) => {
    const updated = [...questionsList];
    updated[index].questionText = text;
    setQuestionsList(updated);
  };

  const handleOptionChange = (qIndex: number, optIndex: number, text: string) => {
    const updated = [...questionsList];
    updated[qIndex].options[optIndex] = text;
    setQuestionsList(updated);
  };

  const handleCorrectAnswerChange = (qIndex: number, optIndex: number) => {
    const updated = [...questionsList];
    updated[qIndex].correctAnswerIndex = optIndex;
    setQuestionsList(updated);
  };

  const handleExplanationChange = (index: number, text: string) => {
    const updated = [...questionsList];
    updated[index].explanation = text;
    setQuestionsList(updated);
  };

  const handleDeleteQuestion = (index: number) => {
    if (questionsList.length <= 1) {
      alert("An exam must have at least one question.");
      return;
    }
    const updated = questionsList.filter((_, i) => i !== index);
    setQuestionsList(updated);
    if (questionsPerStudent > updated.length) {
      setQuestionsPerStudent(updated.length);
    }
  };

  const handleAddCustomQuestion = () => {
    const newQ: EditableQuestion = {
      questionText: "Enter your custom question text here...",
      options: ["Option A", "Option B", "Option C", "Option D"],
      correctAnswerIndex: 0,
      explanation: "Add explanation for why this answer is correct...",
      difficulty: "medium",
      marks: 1,
    };
    setQuestionsList([...questionsList, newQ]);
  };

  // Publish Exam
  const handlePublish = async () => {
    if (!title.trim()) {
      alert("Please provide an exam title.");
      return;
    }

    try {
      setIsPublishing(true);
      const res = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          subject,
          notesContent: notes,
          durationMinutes: effectiveDurationMinutes,
          distributionMode,
          questionsPerStudent: distributionMode === "shuffled" ? questionsPerStudent : questionsList.length,
          passScorePercentage,
          shuffleOptions,
          showCorrectionsImmediately,
          allowRetake,
          questionsList,
        }),
      });

      const data = await res.json();
      if (data.success && data.code) {
        setPublishedCode(data.code);
      } else {
        alert(data.error || "Failed to publish test.");
      }
    } catch (err) {
      console.error("Publish error:", err);
      alert("Failed to publish test.");
    } finally {
      setIsPublishing(false);
    }
  };

  const copyStudentLink = () => {
    if (!publishedCode) return;
    const url = `${window.location.origin}/test/${publishedCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-indigo-600" />
            <span>AI Exam Creator & Question Setter</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Transform notes into timed assessments with custom timers, auto-duration, and retake controls.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold">
          <span
            className={`px-3 py-1.5 rounded-lg ${
              step === 1 ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 cursor-pointer"
            }`}
            onClick={() => setStep(1)}
          >
            1. Notes & AI Prompt
          </span>
          <span className="text-slate-300">→</span>
          <span
            className={`px-3 py-1.5 rounded-lg ${
              step === 2 ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"
            }`}
          >
            2. Review & Exam Settings
          </span>
        </div>
      </div>

      {/* STEP 1: Upload Notes & AI Configuration */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Quota Notice Banner */}
          {user?.planType !== "individual" && user?.planType !== "school_pro" && user?.role !== "admin" && (
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold px-2 py-0.5 rounded-md bg-amber-200/60 text-amber-950 text-[11px]">
                  Free Starter Plan
                </span>
                <span>
                  <strong>{Math.max(0, 3 - (user?.examGenerationsUsed || 0))} of 3</strong> free AI exam generations remaining.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(true)}
                className="text-indigo-700 font-bold hover:underline self-start sm:self-auto text-xs"
              >
                Upgrade to Pro ($15/mo) for Unlimited →
              </button>
            </div>
          )}

          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>Teaching Notes or Curriculum Material</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload a PDF/document or paste your lecture content below.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadSampleNotes}
                  className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors"
                >
                  ⚡ Load Sample Notes
                </button>

                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                  <input
                    type="file"
                    accept=".txt,.md,.pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Note Textarea */}
            <div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Paste lecture notes, study guide, key terms, or textbook excerpts here..."
                rows={10}
                className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-y font-sans"
              />
              <div className="flex items-center justify-between text-xs text-slate-400 mt-1.5 px-1">
                <span>{notes.trim().split(/\s+/).filter(Boolean).length} words</span>
                <span>{notes.length} characters</span>
              </div>
            </div>

            {/* Generation Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Subject / Topic
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Biology, History, Computer Science"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Questions to Generate <span className="text-slate-400 font-normal">(Type a number — leave blank to use 10)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(e.target.value)}
                  placeholder="e.g. 10, 20, 25, 50"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {distributionMode === "shuffled" ? "Minimum 20 questions required for Shuffled Mode" : "Leave blank and we will generate 10. Type a number for a custom amount."}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Difficulty Level
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
                >
                  <option value="mixed">Mixed (Easy, Medium, Hard)</option>
                  <option value="easy">Easy (Foundational)</option>
                  <option value="medium">Medium (Standard)</option>
                  <option value="hard">Hard (Advanced & Critical Thinking)</option>
                </select>
              </div>
            </div>

            {/* Distribution Mode: General vs Shuffled Pool (Starts from 20 Qs & Pro Only) */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Shuffle className="w-4 h-4 text-indigo-600" />
                <span>Question Distribution & Anti-Cheating Mode</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* General Mode */}
                <div
                  onClick={() => setDistributionMode("general")}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    distributionMode === "general"
                      ? "border-indigo-600 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-500"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>📄 General Mode (Standard)</span>
                    </div>
                    {distributionMode === "general" && (
                      <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    All students see and answer the exact same questions in the exact same order. Great for standard class tests and quizzes. (Free & Pro).
                  </p>
                </div>

                {/* Shuffled Mode (Starts from 20 questions, Pro Only) */}
                <div
                  onClick={() => {
                    const isPaid = user?.isPro || user?.planType === "individual" || user?.planType === "school_pro" || user?.role === "admin";
                    if (!isPaid) {
                      setShowUpgradeModal(true);
                      return;
                    }
                    setDistributionMode("shuffled");
                    if (parsedQuestionCount < 20) {
                      setQuestionCount("20");
                    }
                  }}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all relative ${
                    distributionMode === "shuffled"
                      ? "border-amber-500 bg-amber-50/50 shadow-xs ring-1 ring-amber-400"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                      <Shuffle className="w-4 h-4 text-amber-600" />
                      <span>🔀 Shuffled / Unique Pool</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-extrabold uppercase">
                      ⭐ PRO (Min 20 Qs)
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Generates a larger pool (minimum 20 questions) and delivers a randomized unique subset to each student so no two students get the same test.
                  </p>
                  {!user?.isPro && user?.planType !== "individual" && user?.planType !== "school_pro" && user?.role !== "admin" && (
                    <div className="mt-2 text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>Free Starter Plan cannot use Shuffled pools. Upgrade to Pro ($15/mo).</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action CTA */}
            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !notes.trim()}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-indigo-500/20 transition-all"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing Notes & Generating Questions...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Questions with AI</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Review Question Bank & Set Exam Parameters */}
      {step === 2 && (
        <div className="space-y-8">
          {/* Exam Configuration Card */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-indigo-600" />
                <span>Exam Configuration & Distribution Settings</span>
              </h2>
              <button
                onClick={() => setStep(1)}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                ← Back to Notes
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Exam Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Subject / Course
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Test Duration & Question Distribution Modes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              {/* Test Duration Controller */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 flex items-center gap-2">
                    <Timer className="w-4 h-4 text-indigo-600" />
                    <span>Exam Time / Duration</span>
                  </label>
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    {effectiveDurationMinutes} Minutes
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Time limit for students (minutes)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={300}
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                      placeholder={String(effectiveQuestionsToAnswer)}
                      className="w-28 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-slate-500 text-xs">Minutes</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    {durationMinutes.trim()
                      ? `Students will have ${effectiveDurationMinutes} minutes.`
                      : `Leave blank to auto-set to the number of questions (${effectiveQuestionsToAnswer} questions = ${effectiveQuestionsToAnswer} minutes). Type a number to give a custom time.`}
                  </p>
                </div>
              </div>

              {/* Pass Score & Retake Permission */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
                {/* Pass Score */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Passing Mark Percentage</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={10}
                      max={100}
                      value={passScorePercentage}
                      onChange={(e) => setPassScorePercentage(Math.min(100, Math.max(10, Number(e.target.value))))}
                      className="w-24 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-medium text-slate-600">% score to pass</span>
                  </div>
                </div>

                {/* Retake Toggle */}
                <div className="pt-3 border-t border-slate-200/80">
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Student Retake Permission</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={allowRetake}
                      onChange={(e) => setAllowRetake(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span className={allowRetake ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
                      {allowRetake ? "Allow students to retake this test" : "Disallow retakes (One attempt only)"}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Question Distribution Mode: General vs Shuffled / Unique */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Shuffle className="w-4 h-4 text-indigo-600" />
                <span>Question Distribution Mode (Anti-Cheating & Personalization)</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Mode A: General */}
                <div
                  onClick={() => setDistributionMode("general")}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    distributionMode === "general"
                      ? "border-indigo-600 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-500"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>📄 General Mode (Static Set)</span>
                    </div>
                    {distributionMode === "general" && (
                      <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    All students receive the exact same {questionsList.length} questions in the test. (Free & Pro).
                  </p>
                </div>

                {/* Mode B: Shuffled / Unique */}
                <div
                  onClick={() => {
                    const isPaid = user?.isPro || user?.planType === "individual" || user?.planType === "school_pro" || user?.role === "admin";
                    if (!isPaid) {
                      setShowUpgradeModal(true);
                      return;
                    }
                    if (questionsList.length < 20) {
                      alert("Shuffled mode requires at least 20 questions in the pool. Please add more questions to the bank or generate a 20+ question pool.");
                      return;
                    }
                    setDistributionMode("shuffled");
                  }}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all relative ${
                    distributionMode === "shuffled"
                      ? "border-amber-500 bg-amber-50/50 shadow-xs ring-1 ring-amber-400"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                      <Shuffle className="w-4 h-4 text-amber-600" />
                      <span>🔀 Shuffled / Unique Mode</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-extrabold uppercase">
                      ⭐ PRO (Min 20 Qs)
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Each student receives a randomized distinct subset of questions from the {questionsList.length}-question bank. No two students get the same test.
                  </p>

                  {distributionMode === "shuffled" && (
                    <div className="mt-3 pt-3 border-t border-amber-200/60 flex items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-700">Questions per student:</span>
                      <input
                        type="number"
                        min={1}
                        max={questionsList.length}
                        value={questionsPerStudent}
                        onChange={(e) =>
                          setQuestionsPerStudent(
                            Math.min(questionsList.length, Math.max(1, Number(e.target.value)))
                          )
                        }
                        className="w-16 px-2 py-1 rounded-lg border border-amber-300 bg-white font-bold text-center"
                      />
                      <span className="text-slate-400">/ {questionsList.length} pool total</span>
                    </div>
                  )}

                  {!user?.isPro && user?.planType !== "individual" && user?.planType !== "school_pro" && user?.role !== "admin" && (
                    <div className="mt-2 text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>Upgrade to Pro ($15/mo) to unlock Shuffled pools.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Toggles */}
            <div className="flex flex-wrap gap-6 pt-3 border-t border-slate-100 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCorrectionsImmediately}
                  onChange={(e) => setShowCorrectionsImmediately(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="font-semibold text-slate-700">
                  Show student score and wrong answer corrections immediately on submission
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shuffleOptions}
                  onChange={(e) => setShuffleOptions(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="font-semibold text-slate-700">
                  Shuffle option choices (A/B/C/D order) per student
                </span>
              </label>
            </div>
          </div>

          {/* Review & Approve (Approve-first) */}
          {!showQuestions && (
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-600/20">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-[11px] font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                {questionsList.length} question{questionsList.length === 1 ? "" : "s"} are ready
              </div>
              <h3 className="text-xl font-extrabold mt-3">Review & Approve Your Exam</h3>
              <p className="text-sm text-white/80 mt-1 max-w-lg">
                Nothing has been published yet. View and edit every question, or approve right away to generate the exam code.
              </p>

              <div className="flex flex-wrap gap-2 mt-4 text-[11px] font-semibold">
                <span className="px-2.5 py-1 rounded-full bg-white/10">{questionsList.length} Questions</span>
                <span className="px-2.5 py-1 rounded-full bg-white/10">{effectiveDurationMinutes} mins</span>
                <span className="px-2.5 py-1 rounded-full bg-white/10 capitalize">{difficulty}</span>
                <span className="px-2.5 py-1 rounded-full bg-white/10">{distributionMode === "shuffled" ? "Shuffled mode" : "General mode"}</span>
                <span className="px-2.5 py-1 rounded-full bg-white/10">{parsedQuestionCount} targeted</span>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setShowQuestions(true)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-white text-indigo-700 font-bold text-sm hover:bg-indigo-50 transition-colors"
                >
                  <ListChecks className="w-4 h-4" />
                  View & Edit Questions
                </button>
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={isPublishing || questionsList.length === 0}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-bold text-sm transition-colors"
                >
                  {isPublishing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  {isPublishing ? "Publishing..." : "Approve & Generate Exam"}
                </button>
              </div>

              <div className="flex items-center gap-1.5 mt-3 text-[11px] text-white/70">
                <Lock className="w-3.5 h-3.5" />
                Publishing generates a 6-character code students use to join this exam.
              </div>
            </div>
          )}

          {/* Question Bank Review & Editor */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowQuestions((s) => !s)}
                    className="inline-flex items-center gap-1.5 p-2 -ml-2 rounded-xl hover:bg-slate-100 text-slate-700"
                    title={showQuestions ? "Collapse question bank" : "Expand question bank"}
                  >
                    {showQuestions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <span>Question Bank Studio</span>
                  <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {questionsList.length} Items
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {showQuestions
                    ? "Click on an option letter to change the correct answer key. Edit text freely."
                    : "Questions are ready — click “View & Edit Questions” above to fine-tune them before publishing."}
                </p>
              </div>

              {showQuestions && (
                <button
                  type="button"
                  onClick={handleAddCustomQuestion}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Question
                </button>
              )}
            </div>

            {/* Questions List */}
            {showQuestions && (
            <div className="space-y-4">
              {questionsList.map((q, qIdx) => (
                <div
                  key={qIdx}
                  className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center">
                        {qIdx + 1}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Question {qIdx + 1}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium capitalize">
                        {q.difficulty}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(qIdx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Question Text */}
                  <textarea
                    value={q.questionText}
                    onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                    rows={2}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />

                  {/* 4 Options */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Options & Correct Answer (Select the green circle for the correct key):
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = q.correctAnswerIndex === optIdx;
                        const letter = String.fromCharCode(65 + optIdx);
                        return (
                          <div
                            key={optIdx}
                            className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all ${
                              isCorrect
                                ? "border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-400"
                                : "border-slate-200 bg-slate-50/40"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleCorrectAnswerChange(qIdx, optIdx)}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                                isCorrect
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                              }`}
                              title={isCorrect ? "Correct answer" : "Click to set as correct answer"}
                            >
                              {letter}
                            </button>

                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                              className="w-full bg-transparent text-xs sm:text-sm focus:outline-none text-slate-800"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Explanation */}
                  <div className="pt-2">
                    <label className="block text-[11px] font-bold text-indigo-700 uppercase tracking-wider mb-1">
                      AI Explanation for Students (Shown after submission):
                    </label>
                    <textarea
                      value={q.explanation}
                      onChange={(e) => handleExplanationChange(qIdx, e.target.value)}
                      rows={2}
                      className="w-full p-2.5 rounded-lg border border-indigo-100 bg-indigo-50/40 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              ))}
            </div>
            )}

            {/* Bottom Action CTA */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Ready to publish exam?</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Duration: <strong className="text-indigo-700">{effectiveDurationMinutes} minutes</strong> • Retakes: <strong className={allowRetake ? "text-emerald-700" : "text-amber-700"}>{allowRetake ? "Allowed" : "Disabled (1 attempt)"}</strong>
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={isPublishing || questionsList.length === 0}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-indigo-500/20 transition-all"
                >
                  {isPublishing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Publishing Exam...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Publish Exam & Generate Code</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal on Publish */}
      {publishedCode && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-extrabold text-slate-900">
                Exam Published Live!
              </h3>
              <p className="text-xs text-slate-500">
                Share this 6-character code or direct link with your students.
              </p>
            </div>

            {/* Big Code Display */}
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-between">
              <div className="text-left">
                <div className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider">
                  Student Access Code
                </div>
                <div className="text-3xl font-extrabold font-mono text-indigo-950 tracking-wider">
                  {publishedCode}
                </div>
                <div className="text-[11px] text-indigo-700 font-semibold mt-1">
                  ⏱️ {effectiveDurationMinutes} Mins • {allowRetake ? "Retakes Allowed" : "One Attempt Only"}
                </div>
              </div>

              <button
                onClick={copyStudentLink}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copied!" : "Copy Link"}</span>
              </button>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => router.push("/dashboard")}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors"
              >
                Go to Dashboard
              </button>

              <button
                onClick={() => router.push(`/test/${publishedCode}`)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Take Test Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="examGenerations"
        limitCount={3}
        usedCount={user?.examGenerationsUsed || 3}
      />
    </div>
  );
}
