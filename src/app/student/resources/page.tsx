"use client";

import { useEffect, useState, useCallback } from "react";
import { BookOpenText, Link as LinkIcon, FileText, PlayCircle, Presentation } from "lucide-react";

interface Resource { id: string; courseId: string | null; title: string; description: string | null; url: string | null; fileType: string; courseName: string | null; uploadedByName: string | null; createdAt: string; }
interface Course { id: string; name: string; }

function fmt(iso: string) { return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }); }

export default function StudentResources() {
  const [user, setUser] = useState<any>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseFilter, setCourseFilter] = useState("");

  useEffect(() => { try { setUser(JSON.parse(localStorage.getItem("judmi_user") || "null")); } catch {} }, []);

  const fetchAll = useCallback(async () => {
    const res = await fetch("/api/org/resources");
    const d = await res.json();
    setResources(d.resources || []);
    setCourses(d.courses || []);
  }, []);

  useEffect(() => {
    if (!user?.orgId) { setLoading(false); return; }
    fetchAll().finally(() => setLoading(false));
  }, [user?.orgId, fetchAll]);

  const filtered = courseFilter ? resources.filter((r) => r.courseId === courseFilter) : resources;

  const IconFor = (type: string) => type === "video" ? PlayCircle : type === "document" ? FileText : type === "slides" ? Presentation : LinkIcon;

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-5 py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center animate-pulse mx-auto"><BookOpenText className="w-6 h-6" /></div>
        <p className="text-sm text-slate-500 font-semibold mt-3">Loading resources…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
      <div>
        <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">Student Portal</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
          <BookOpenText className="w-7 h-7 text-navy-700" /> Study Resources
        </h1>
        <p className="text-xs text-slate-400 font-semibold mt-0.5">Materials shared by your teachers.</p>
      </div>

      {courses.length > 1 && (
        <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="input-field py-2 text-sm max-w-xs">
          <option value="">All subjects</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}

      {filtered.length === 0 ? (
        <div className="surface-elevated rounded-2xl p-8 text-center">
          <BookOpenText className="w-9 h-9 text-navy-200 mx-auto mb-2" />
          <p className="text-sm text-slate-500 font-semibold">No study resources available yet.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((r) => {
            const Icon = IconFor(r.fileType);
            return (
              <a key={r.id} href={r.url || "#"} target="_blank" rel="noopener noreferrer" className={`surface-elevated rounded-2xl p-5 block ${r.url ? "hover:border-navy-200" : "cursor-default"}`}>
                <div className="flex items-start gap-3">
                  <span className="w-10 h-10 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center shrink-0"><Icon className="w-5 h-5" /></span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-extrabold text-slate-900">{r.title}</h3>
                    {r.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{r.description}</p>}
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      {r.courseName && <span className="text-[10px] font-bold bg-slate-50 border border-slate-100 rounded-lg px-2 py-0.5 text-slate-600">{r.courseName}</span>}
                      <span className="text-[10px] text-slate-400 font-semibold">{r.uploadedByName || "Staff"} · {fmt(r.createdAt)}</span>
                      {r.url && <span className="text-[10px] font-bold text-navy-700 flex items-center gap-0.5"><LinkIcon className="w-3 h-3" /> Open</span>}
                    </div>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
