"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, Loader2, Send, Star, AlertTriangle, CheckCircle2, History } from "lucide-react";

interface Criterion { criterion: string; score: number; maxScore: number; comment: string; }
interface Excerpt { original: string; suggestion: string; reason: string; }
interface GradingResult {
  overallScore: number;
  maxScore: number;
  criteriaScores: Criterion[];
  strengths: string[];
  weaknesses: string[];
  detailedFeedback: string;
  correctedExcerpts: Excerpt[];
}

interface HistoryItem {
  id: string;
  title: string;
  studentName: string;
  overallScore: number | null;
  maxScore: number | null;
  createdAt: string;
}

export default function EssayGraderPage() {
  const [user, setUser] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [studentName, setStudentName] = useState("");
  const [essayPrompt, setEssayPrompt] = useState("");
  const [rubricPrompt, setRubricPrompt] = useState("");
  const [studentEssay, setStudentEssay] = useState("");
  const [maxScore, setMaxScore] = useState(100);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GradingResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem("judmi_user") || "null")); } catch {}
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/grade-essay");
      const data = await res.json();
      setHistory((data.gradings || []).map((g: any) => ({
        id: g.id,
        title: g.title,
        studentName: g.studentName,
        overallScore: g.overallScore,
        maxScore: g.maxScore,
        createdAt: g.createdAt,
      })));
    } catch {}
  }, []);

  useEffect(() => {
    if (user?.orgId) loadHistory();
  }, [user?.orgId, loadHistory]);

  const handleGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!essayPrompt.trim() || !studentEssay.trim()) return;
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/grade-essay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || "Essay Submission",
          studentName: studentName.trim() || "Anonymous Student",
          essayPrompt,
          rubricPrompt,
          studentEssay,
          maxScore: Number(maxScore) || 100,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to grade essay. Please try again."); return; }
      setResult(data.grading);
      setTitle(""); setStudentName(""); setEssayPrompt(""); setRubricPrompt(""); setStudentEssay("");
      await loadHistory();
    } catch (err: any) {
      setError(err?.message || "Failed to grade essay. Please try again.");
    } finally { setRunning(false); }
  };

  const pct = result && result.maxScore ? Math.round((result.overallScore / result.maxScore) * 100) : 0;
  const scoreColor = pct >= 70 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-rose-600";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fade-in">
      <div>
        <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">AI Assessment</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
          <BookOpen className="w-7 h-7 text-navy-700" /> Essay Grader
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Paste a student&apos;s essay and the question prompt — AI grades it against your rubric with detailed feedback.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Grade form */}
        <form onSubmit={handleGrade} className="surface-elevated rounded-2xl p-5 space-y-3 h-fit">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" placeholder="e.g. Essay 3" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Student</label>
              <input value={studentName} onChange={(e) => setStudentName(e.target.value)} className="input-field" placeholder="Student name" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Question / Prompt <span className="text-rose-500">*</span></label>
            <textarea value={essayPrompt} onChange={(e) => setEssayPrompt(e.target.value)} rows={3} className="input-field" placeholder="e.g. Discuss the causes and effects of the Industrial Revolution." required />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Student Essay <span className="text-rose-500">*</span></label>
            <textarea value={studentEssay} onChange={(e) => setStudentEssay(e.target.value)} rows={6} className="input-field font-mono text-[13px]" placeholder="Paste the student's essay here…" required />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Rubric / Grading criteria (optional)</label>
            <textarea value={rubricPrompt} onChange={(e) => setRubricPrompt(e.target.value)} rows={2} className="input-field" placeholder="e.g. Content 40%, Structure 25%, Evidence 20%, Grammar 15%" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Max score</label>
              <input type="number" min={1} value={maxScore} onChange={(e) => setMaxScore(Number(e.target.value) || 100)} className="input-field" />
            </div>
          </div>

          <button type="submit" disabled={running} className="btn-primary w-full text-sm py-2.5 rounded-xl flex items-center justify-center gap-1.5">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {running ? "Grading…" : "Grade Essay"}
          </button>
        </form>

        {/* Result */}
        <div className="space-y-4">
          {!result ? (
            <div className="surface-elevated rounded-2xl p-6 text-center text-sm text-slate-400 border border-dashed border-slate-200 h-fit">
              <Star className="w-8 h-8 text-navy-200 mx-auto mb-2" />
              Your AI-graded essay with criteria scores, feedback, and corrections will appear here.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="surface-elevated rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Overall score</div>
                  <div className={`text-3xl font-extrabold ${scoreColor}`}>
                    {result.overallScore}<span className="text-slate-400 text-lg">/{result.maxScore}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Percentage</div>
                  <div className={`text-3xl font-extrabold ${scoreColor}`}>{pct}%</div>
                </div>
              </div>

              {result.criteriaScores.length > 0 && (
                <div className="surface-elevated rounded-2xl p-5">
                  <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-3">Criteria breakdown</h3>
                  <div className="space-y-2.5">
                    {result.criteriaScores.map((c) => (
                      <div key={c.criterion}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-bold text-slate-800">{c.criterion}</span>
                          <span className="font-extrabold text-navy-700">{c.score}/{c.maxScore}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${(c.score / c.maxScore) >= 0.7 ? "bg-emerald-500" : (c.score / c.maxScore) >= 0.5 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${Math.min(100, (c.score / c.maxScore) * 100)}%` }} />
                        </div>
                        {c.comment && <p className="text-[11px] text-slate-500 mt-1">{c.comment}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.detailedFeedback && (
                <div className="surface-elevated rounded-2xl p-5">
                  <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-2">Detailed feedback</h3>
                  <p className="text-sm text-slate-600">{result.detailedFeedback}</p>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                {result.strengths.length > 0 && (
                  <div className="surface-elevated rounded-2xl p-5">
                    <h3 className="text-xs font-extrabold text-emerald-700 uppercase tracking-wide mb-2 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Strengths</h3>
                    <ul className="text-sm text-slate-600 space-y-1.5">
                      {result.strengths.map((s, i) => <li key={i}>• {s}</li>)}
                    </ul>
                  </div>
                )}
                {result.weaknesses.length > 0 && (
                  <div className="surface-elevated rounded-2xl p-5">
                    <h3 className="text-xs font-extrabold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Areas to improve</h3>
                    <ul className="text-sm text-slate-600 space-y-1.5">
                      {result.weaknesses.map((s, i) => <li key={i}>• {s}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              {result.correctedExcerpts.length > 0 && (
                <div className="surface-elevated rounded-2xl p-5">
                  <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-3">Suggested corrections</h3>
                  <div className="space-y-3">
                    {result.correctedExcerpts.map((ex, i) => (
                      <div key={i} className="text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="text-[11px] font-bold text-rose-500 uppercase tracking-wide mb-0.5">Original</div>
                            <p className="text-slate-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{ex.original}</p>
                            <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wide mt-2 mb-0.5">Suggestion</div>
                            <p className="text-slate-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">{ex.suggestion}</p>
                            {ex.reason && <p className="text-[11px] text-slate-500 italic mt-1">{ex.reason}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="surface-elevated rounded-2xl p-5">
          <h2 className="text-sm font-extrabold text-slate-900 mb-3 flex items-center gap-2"><History className="w-4 h-4" /> Recent gradings</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wide border-b border-slate-100">
                  <th className="py-2 pr-3">Title</th>
                  <th className="py-2 px-2">Student</th>
                  <th className="py-2 px-2 text-center">Score</th>
                  <th className="py-2 px-2 text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-slate-50">
                    <td className="py-2.5 pr-3 font-bold text-slate-900">{h.title}</td>
                    <td className="py-2.5 px-2 text-slate-600">{h.studentName}</td>
                    <td className="py-2.5 px-2 text-center font-extrabold text-navy-700">{h.overallScore == null ? "—" : `${h.overallScore}/${h.maxScore ?? 100}`}</td>
                    <td className="py-2.5 px-2 text-right text-slate-400 text-xs">{new Date(h.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}