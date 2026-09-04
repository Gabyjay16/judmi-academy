"use client";

import { useEffect, useState, useCallback } from "react";
import { ClipboardList, Pin, CalendarDays, CheckCircle2, Clock, BookOpen, Send, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface Submission {
  id: string;
  assignmentId: string;
  content: string | null;
  score: number | null;
  feedback: string | null;
  submittedAt: string;
}

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  courseName: string | null;
  dueDate: string | null;
  maxScore: number;
  pinned: number;
  createdAt: string;
  mySubmission: Submission | null;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

export default function StudentAssignmentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Assignment | null>(null);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem("judmi_user") || "null")); } catch {}
  }, []);

  const fetchAssignments = useCallback(async () => {
    const res = await fetch("/api/org/assignments");
    const data = await res.json();
    setItems(data.assignments || []);
  }, []);

  useEffect(() => {
    if (!user?.orgId) { setLoading(false); return; }
    fetchAssignments().finally(() => setLoading(false));
  }, [user?.orgId, fetchAssignments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active || !draft.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`/api/org/assignments/${active.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft }),
      });
      await fetchAssignments();
      setActive(null);
      setDraft("");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-16 flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center animate-pulse">
          <ClipboardList className="w-6 h-6" />
        </div>
        <p className="text-sm text-slate-500 font-semibold">Loading assignments…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-16 text-center space-y-4 animate-fade-in">
        <div className="w-16 h-16 rounded-3xl bg-navy-900 text-amber-500 flex items-center justify-center mx-auto">
          <ClipboardList className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">Assignments</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          {user?.orgId ? "No assignments yet. Your teachers will post work here." : "Link your school account to see assignments."}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5 animate-fade-in">
      <div>
        <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">
          {user?.year || "Student"}
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
          <ClipboardList className="w-7 h-7 text-navy-700" /> Assignments
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((a) => {
          const done = a.mySubmission?.score != null;
          const submitted = !!a.mySubmission;
          return (
            <div key={a.id} className={`surface-elevated rounded-2xl overflow-hidden animate-slide-up flex flex-col ${a.pinned ? "ring-2 ring-amber-300" : ""}`}>
              {a.pinned && (
                <div className="px-4 py-1.5 bg-amber-50 border-b border-amber-100 flex items-center gap-1.5 text-[11px] font-bold text-amber-700">
                  <Pin className="w-3 h-3" /> Pinned
                </div>
              )}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-start gap-3">
                  <span className="w-10 h-10 rounded-xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-extrabold text-slate-900 leading-tight">{a.title}</h3>
                    <div className="text-[11px] text-slate-400 font-semibold mt-0.5">
                      {a.courseName || "General"} · Max {a.maxScore} pts
                    </div>
                  </div>
                </div>

                {a.description && <p className="mt-3 text-[13px] text-slate-600 leading-relaxed line-clamp-3">{a.description}</p>}

                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400 font-semibold">
                  {a.dueDate && (
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" /> Due {formatDate(a.dueDate)}
                    </span>
                  )}
                  {done ? (
                    <span className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 className="w-3 h-3" /> Grade: {a.mySubmission!.score}/{a.maxScore}
                    </span>
                  ) : submitted ? (
                    <span className="flex items-center gap-1 text-amber-600">
                      <Clock className="w-3 h-3" /> Submitted, awaiting grade
                    </span>
                  ) : null}
                </div>

                {a.mySubmission?.feedback && (
                  <div className="mt-3 bg-navy-50 border border-navy-100 rounded-xl p-3 text-[12px] text-slate-700">
                    <span className="font-bold text-navy-900 block mb-0.5">Teacher feedback</span>
                    {a.mySubmission.feedback}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => { setActive(a); setDraft(a.mySubmission?.content || ""); }}
                  className="mt-4 btn-outline text-xs py-2.5 rounded-xl w-full"
                >
                  {submitted ? "Resubmit / View Submission" : "Submit / View"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {active && (
        <div className="modal-overlay" onClick={() => setActive(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900">{active.title}</h2>
              <button type="button" onClick={() => setActive(null)} className="text-slate-400 hover:text-rose-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 sm:p-6">
              {active.mySubmission?.score != null && (
                <div className="mb-4 bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-emerald-700">Grade</span>
                  <span className="text-sm font-extrabold text-emerald-700">{active.mySubmission.score}/{active.maxScore}</span>
                </div>
              )}
              {active.mySubmission?.feedback && (
                <div className="mb-4 bg-navy-50 border border-navy-100 rounded-xl p-3 text-[13px] text-slate-700">
                  <span className="font-bold text-navy-900 block mb-0.5">Teacher feedback</span>
                  {active.mySubmission.feedback}
                </div>
              )}
              <div className="text-[11px] text-slate-400 font-semibold mb-1">YOUR ANSWER</div>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={6}
                placeholder="Write your answer here…"
                className="input-field py-2.5 text-sm"
              />
              <button
                type="button"
                disabled={submitting || !draft.trim()}
                onClick={async () => {
                  setSubmitting(true);
                  try {
                    await fetch(`/api/org/assignments/${active.id}/submit`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ content: draft }),
                    });
                    await fetchAssignments();
                    setActive(null);
                    setDraft("");
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="mt-4 btn-primary text-xs py-2.5 rounded-xl w-full flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" /> {active.mySubmission ? "Update Submission" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}