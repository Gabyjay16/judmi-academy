"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Scale,
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  AlertTriangle,
  Copy,
  Check,
  KeyRound,
  ArrowRight,
} from "lucide-react";

interface DraftQuestion {
  id: string;
  prompt: string;
  maxMarks: string;
  controlMark: string;
  answer: string;
  markScheme: string;
  isTrap: boolean;
}

const baseQuestion = (): DraftQuestion => ({
  id: Math.random().toString(36).substring(2, 10),
  prompt: "",
  maxMarks: "10",
  controlMark: "",
  answer: "",
  markScheme: "",
  isTrap: false,
});

export default function CreateInverseMarking() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [instruction, setInstruction] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([baseQuestion()]);
  const [tolerance, setTolerance] = useState("1");
  const [passThreshold, setPassThreshold] = useState("80");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ code: string; id: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const updateQuestion = (id: string, patch: Partial<DraftQuestion>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  const copyLink = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/student/inverse-marking?code=${created.code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (title.trim().length < 3) {
      setError("Give this exercise a title (at least 3 characters).");
      return;
    }
    for (const q of questions) {
      if (!q.prompt.trim()) {
        setError("Every question needs a prompt.");
        return;
      }
      const max = Math.round(Number(q.maxMarks));
      if (Number.isNaN(max) || max < 1 || max > 100) {
        setError("Every question needs a max marks value between 1 and 100.");
        return;
      }
      const control = q.controlMark === "" ? NaN : Math.round(Number(q.controlMark));
      if (Number.isNaN(control) || control < 0 || control > max) {
        setError(`The control mark for "Q. ${q.prompt.slice(0, 40)}" must be between 0 and ${max}.`);
        return;
      }
      if (q.answer.trim().length < 10) {
        setError(`Write the teacher's reference answer for "Q. ${q.prompt.slice(0, 40)}" (at least 10 characters).`);
        return;
      }
    }

    setCreating(true);
    try {
      const res = await fetch("/api/inverse-marking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          instruction: instruction.trim(),
          tolerance: Math.round(Number(tolerance)),
          passThreshold: Math.round(Number(passThreshold)),
          questions: questions.map((q) => ({
            id: q.id,
            prompt: q.prompt.trim(),
            maxMarks: Math.round(Number(q.maxMarks)),
            markScheme: q.markScheme.trim(),
            answer: q.answer.trim(),
            controlMark: Math.round(Number(q.controlMark)),
            isTrap: q.isTrap,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to create the exercise.");
        return;
      }
      setCreated(json.exercise);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setError(err?.message || "Failed to create the exercise.");
    } finally {
      setCreating(false);
    }
  };

  if (created) {
    return (
      <div className="max-w-3xl mx-auto px-5 sm:px-6 py-10 sm:py-14 space-y-6">
        <div className="bg-white rounded-3xl border border-emerald-200 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-8 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center">
              <Scale className="w-7 h-7 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-navy-900">Exercise created!</h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Students enter this code on the student page to mark your script.
              </p>
            </div>

            <div className="bg-navy-900 rounded-2xl px-6 py-5 text-white inline-block">
              <p className="text-[9px] uppercase tracking-wider text-gold-400 font-bold">Exercise Code</p>
              <div className="flex items-center justify-center gap-3 mt-1">
                <span className="font-mono font-extrabold text-3xl tracking-[0.35em]">{created.code}</span>
                <button type="button" onClick={copyLink} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors" title="Copy student link">
                  {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={copyLink}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-gold-400" /> : <Copy className="w-4 h-4" />}
                {copied ? "Link copied" : "Copy student link"}
              </button>
              <Link
                href={`/dashboard/inverse-marking/${created.code}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-navy-950 text-xs font-bold transition-colors"
              >
                View results <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/dashboard/inverse-marking"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors"
              >
                Back to exercises
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      <Link href="/dashboard/inverse-marking" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-900 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Inverse Marking
      </Link>

      <div className="flex items-start gap-3">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-navy-900 text-gold-400 flex items-center justify-center shrink-0 shadow-md shadow-navy-900/20">
          <Scale className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-navy-900">Create an Inverse Marking exercise</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Write the question(s), complete the script yourself, and mark your own script — the control mark. Students then mark your script; you grade their marking accuracy.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <form onSubmit={handleCreate} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-6">
        {/* Basic info */}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Exercise title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. SS1 Biology — Inverse Marking: Photosynthesis"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Note students see before they start (optional)</label>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={2}
              placeholder="e.g. Mark my answer as strictly as a real examiner. Award each question the marks you think it deserves — you must explain your marks."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-navy-500 resize-y"
            />
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-navy-900">Questions</h2>
            <button
              type="button"
              onClick={() => setQuestions((prev) => [...prev, baseQuestion()])}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gold-50 border border-gold-200 text-gold-700 hover:bg-gold-100 text-[11px] font-bold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add question
            </button>
          </div>

          {questions.map((q, i) => (
            <div key={q.id} className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between bg-slate-50/70 border-b border-slate-100 px-4 py-2.5">
                <span className="text-xs font-extrabold text-navy-900">Question {i + 1}</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-rose-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={q.isTrap}
                      onChange={(e) => updateQuestion(q.id, { isTrap: e.target.checked })}
                      className="accent-rose-600 w-3.5 h-3.5"
                    />
                    Trap (deliberately flawed)
                  </label>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setQuestions((prev) => prev.filter((x) => x.id !== q.id))}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Remove question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Question prompt</label>
                  <textarea
                    value={q.prompt}
                    onChange={(e) => updateQuestion(q.id, { prompt: e.target.value })}
                    rows={2}
                    placeholder="e.g. Explain the process of photosynthesis and the role of chlorophyll. (10 marks)"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-navy-500 resize-y"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Max marks</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={q.maxMarks}
                      onChange={(e) => updateQuestion(q.id, { maxMarks: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Your control mark {q.controlMark !== "" && <span className="text-slate-400 font-normal">(out of {q.maxMarks || 0})</span>}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={Number(q.maxMarks) || 0}
                      value={q.controlMark}
                      onChange={(e) => updateQuestion(q.id, { controlMark: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Rubric / mark scheme (optional)</label>
                    <input
                      type="text"
                      value={q.markScheme}
                      onChange={(e) => updateQuestion(q.id, { markScheme: e.target.value })}
                      placeholder="e.g. Definition 3, process 4, example 3"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    The teacher&apos;s own answer — this is the script students will mark
                  </label>
                  <textarea
                    value={q.answer}
                    onChange={(e) => updateQuestion(q.id, { answer: e.target.value })}
                    rows={4}
                    placeholder="Write the full, ideal answer here exactly as your best student would. Students award their own marks to THIS script — not their own answer."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-emerald-50/40 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-navy-500 resize-y"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Agreement band (± marks)</label>
            <select
              value={tolerance}
              onChange={(e) => setTolerance(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
            >
              <option value="0">Exact match only (0)</option>
              <option value="1">Within 1 mark (recommended)</option>
              <option value="2">Within 2 marks</option>
              <option value="3">Within 3 marks</option>
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              A student&apos;s mark counts as “in agreement” when it is within this many marks of yours.
            </p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Pass line (% marking accuracy)</label>
            <input
              type="number"
              min={50}
              max={100}
              value={passThreshold}
              onChange={(e) => setPassThreshold(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Students whose accuracy is at or above this line are marked as having passed the exercise.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={creating}
            className="px-6 py-3 rounded-xl bg-navy-900 hover:bg-navy-800 disabled:opacity-40 text-white text-xs font-bold shadow-[0_8px_20px_-10px_rgba(16,26,46,0.5)] transition-all inline-flex items-center justify-center gap-1.5"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Creating exercise…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Create exercise
              </>
            )}
          </button>
          <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5" />
            A unique 6-letter code is generated for students.
          </span>
        </div>
      </form>
    </div>
  );
}