"use client";

import { useEffect, useState } from "react";
import { Megaphone, Pin, CalendarDays, User } from "lucide-react";

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

export default function StudentAnnouncementsPage() {
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem("judmi_user") || "null")); } catch {}
  }, []);

  useEffect(() => {
    if (!user?.orgId) { setLoading(false); return; }
    fetch("/api/org/announcements")
      .then((r) => r.json())
      .then((data) => setItems(data.announcements || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.orgId]);

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

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-16 text-center space-y-4 animate-fade-in">
        <div className="w-16 h-16 rounded-3xl bg-navy-900 text-amber-500 flex items-center justify-center mx-auto">
          <Megaphone className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">Announcements</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          {user?.orgId
            ? "No announcements yet. Your school will post notices here."
            : "Link your school account to see announcements."}
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
          <Megaphone className="w-7 h-7 text-navy-700" /> Announcements
        </h1>
      </div>

      <div className="space-y-4">
        {items.map((a) => (
          <div key={a.id} className={`surface-elevated rounded-2xl overflow-hidden animate-slide-up ${a.pinned ? "ring-2 ring-amber-300" : ""}`}>
            {a.pinned && (
              <div className="px-4 py-1.5 bg-amber-50 border-b border-amber-100 flex items-center gap-1.5 text-[11px] font-bold text-amber-700">
                <Pin className="w-3 h-3" /> Pinned
              </div>
            )}
            <div className="p-5">
              <h2 className="text-lg font-extrabold text-slate-900">{a.title}</h2>
              {a.body && <p className="mt-2 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{a.body}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 font-semibold">
                {a.authorName && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" /> {a.authorName}
                  </span>
                )}
                <span>{formatDate(a.createdAt)}</span>
                {a.eventDate && (
                  <span className="flex items-center gap-1 text-navy-700">
                    <CalendarDays className="w-3 h-3" /> Event: {formatDate(a.eventDate)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}