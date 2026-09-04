"use client";

import { useEffect, useState, useCallback } from "react";
import { BookOpenText, Plus, Trash2, X, Link as LinkIcon, FileText, PlayCircle } from "lucide-react";

interface Resource { id: string; courseId: string | null; title: string; description: string | null; url: string | null; fileType: string; courseName: string | null; uploadedByName: string | null; createdAt: string; }
interface Course { id: string; name: string; }

function fmt(iso: string) { return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }); }

export default function ResourcesPage() {
  const [user, setUser] = useState<any>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [courseFilter, setCourseFilter] = useState("");
  const [rTitle, setRTitle] = useState("");
  const [rDesc, setRDesc] = useState("");
  const [rUrl, setRUrl] = useState("");
  const [rType, setRType] = useState("link");
  const [rCourse, setRCourse] = useState("");
  const [rCourseName, setRCourseName] = useState("");

  useEffect(() => { try { setUser(JSON.parse(localStorage.getItem("judmi_user") || "null")); } catch {} }, []);
  const isStaff = user?.role === "admin" || user?.role === "org_admin" || user?.role === "teacher";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/org/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: rCourse || undefined, courseName: rCourseName || undefined, title: rTitle, description: rDesc, url: rUrl, fileType: rType }),
      });
      setModal(false); setRTitle(""); setRDesc(""); setRUrl(""); setRType("link"); setRCourse(""); setRCourseName("");
      await fetchAll();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this resource?")) return;
    await fetch("/api/org/resources", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await fetchAll();
  };

  const filtered = courseFilter ? resources.filter((r) => r.courseId === courseFilter) : resources;

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">Staff Portal</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
            <BookOpenText className="w-7 h-7 text-navy-700" /> Study Resources
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Share learning materials with students.</p>
        </div>
        {isStaff && (
          <button type="button" onClick={() => setModal(true)} className="btn-primary text-xs px-3 py-2.5 rounded-xl flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add Resource
          </button>
        )}
      </div>

      {courses.length > 1 && (
        <div className="flex items-center gap-2">
          <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="input-field py-2 text-sm max-w-xs">
            <option value="">All courses</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="surface-elevated rounded-2xl p-8 text-center">
          <BookOpenText className="w-9 h-9 text-navy-200 mx-auto mb-2" />
          <p className="text-sm text-slate-500 font-semibold">No study resources yet.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((r) => (
            <a key={r.id} href={r.url || "#"} target="_blank" rel="noopener noreferrer" className={`surface-elevated rounded-2xl p-5 block ${r.url ? "hover:border-navy-200" : "cursor-default"}`}>
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center shrink-0">
                  {r.fileType === "video" ? <PlayCircle className="w-5 h-5" /> : r.fileType === "document" ? <FileText className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-extrabold text-slate-900">{r.title}</h3>
                    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(r.id); }} className="text-slate-300 hover:text-rose-500 shrink-0"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  {r.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{r.description}</p>}
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {r.courseName && <span className="text-[10px] font-bold bg-slate-50 border border-slate-100 rounded-lg px-2 py-0.5 text-slate-600">{r.courseName}</span>}
                    <span className="text-[10px] text-slate-400 font-semibold">{r.uploadedByName || "Staff"} · {fmt(r.createdAt)}</span>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Add modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900"><BookOpenText className="inline w-5 h-5 text-navy-700 mr-2" />Add Study Resource</h2>
              <button type="button" onClick={() => setModal(false)} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Title <span className="text-rose-500">*</span></label>
                <input type="text" required value={rTitle} onChange={(e) => setRTitle(e.target.value)} className="input-field py-2.5 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Course</label>
                  <select value={rCourse} onChange={(e) => { setRCourse(e.target.value); setRCourseName(courses.find((c) => c.id === e.target.value)?.name || ""); }} className="input-field py-2.5 text-sm">
                    <option value="">General</option>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Type</label>
                  <select value={rType} onChange={(e) => setRType(e.target.value)} className="input-field py-2.5 text-sm">
                    <option value="link">Link</option><option value="document">Document</option><option value="video">Video</option><option value="slides">Slides</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">URL</label>
                <input type="url" value={rUrl} onChange={(e) => setRUrl(e.target.value)} placeholder="https://…" className="input-field py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea value={rDesc} onChange={(e) => setRDesc(e.target.value)} rows={3} className="input-field py-2.5 text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="btn-outline text-xs flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary text-xs flex-1">{saving ? "Adding…" : "Add Resource"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
