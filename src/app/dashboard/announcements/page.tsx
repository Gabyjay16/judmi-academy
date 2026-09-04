"use client";

import { useEffect, useState, useCallback } from "react";
import { Megaphone, Plus, Trash2, X, Pin, CalendarDays } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  body: string | null;
  pinned: number;
  audience: string;
  authorName: string | null;
  eventDate: string | null;
  createdAt: string;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

export default function AnnouncementsManagerPage() {
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [audience, setAudience] = useState("all");
  const [eventDate, setEventDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem("judmi_user") || "null")); } catch {}
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    const res = await fetch("/api/org/announcements");
    const data = await res.json();
    setItems(data.announcements || []);
  }, []);

  useEffect(() => {
    if (!user?.orgId) { setLoading(false); return; }
    fetchAnnouncements().finally(() => setLoading(false));
  }, [user?.orgId, fetchAnnouncements]);

  const isAdmin = user?.role === "admin" || user?.role === "org_admin";

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/org/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, pinned, audience, eventDate: eventDate || null }),
      });
      await fetchAnnouncements();
      setShowModal(false);
      setTitle(""); setBody(""); setPinned(false); setAudience("all"); setEventDate("");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    await fetch("/api/org/announcements", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setItems((prev) => prev.filter((a) => a.id !== id));
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-16 flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center animate-pulse">
          <Megaphone className="w-6 h-6" />
        </div>
        <p className="text-sm text-slate-500 font-semibold">Loading announcements…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">Staff Portal</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
            <Megaphone className="w-7 h-7 text-navy-700" /> Announcements
          </h1>
        </div>
        <button type="button" onClick={() => setShowModal(true)} className="btn-primary text-xs px-3 py-2.5 rounded-xl flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New Announcement
        </button>
      </div>

      {items.length === 0 ? (
        <div className="surface-elevated rounded-2xl p-8 text-center space-y-3">
          <Megaphone className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-500">No announcements yet</p>
          <p className="text-xs text-slate-400">Post your first notice to students and staff.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <div key={a.id} className={`surface-elevated rounded-2xl overflow-hidden animate-slide-up ${a.pinned ? "ring-2 ring-amber-300" : ""}`}>
              <div className="px-4 py-3 flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${a.pinned ? "bg-amber-50 text-amber-600" : "bg-navy-50 text-navy-700"}`}>
                  {a.pinned ? <Pin className="w-4 h-4" /> : <Megaphone className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900">{a.title}</div>
                  {a.body && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 whitespace-pre-wrap">{a.body}</p>}
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-400 font-semibold">
                    <span>{formatDate(a.createdAt)}</span>
                    <span>→ {a.audience === "all" ? "Everyone" : a.audience === "students" ? "Students" : "Teachers"}</span>
                    {a.eventDate && <span className="flex items-center gap-0.5"><CalendarDays className="w-3 h-3" /> {formatDate(a.eventDate)}</span>}
                  </div>
                </div>
                {isAdmin && (
                  <button type="button" onClick={() => handleDelete(a.id)} className="text-slate-300 hover:text-rose-500 transition-colors shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-navy-700" /> New Announcement
              </h2>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-rose-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Title <span className="text-rose-500">*</span></label>
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Midterm examination schedule" className="input-field py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Message</label>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Add details for students…" className="input-field py-2.5 text-sm" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Audience</label>
                  <select value={audience} onChange={(e) => setAudience(e.target.value)} className="input-field py-2.5 text-sm">
                    <option value="all">Everyone</option>
                    <option value="students">Students only</option>
                    <option value="teachers">Teachers only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Event Date (optional)</label>
                  <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="input-field py-2.5 text-sm" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="w-4 h-4 accent-navy-900" />
                Pin to top
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline text-xs flex-1">Cancel</button>
                <button type="submit" disabled={saving || !title.trim()} className="btn-primary text-xs flex-1 disabled:opacity-50">
                  {saving ? "Posting…" : "Post Announcement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}