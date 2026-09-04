"use client";

import { useEffect, useState, useCallback } from "react";
import { CalendarClock, Users, UserPlus, UserCheck, Megaphone } from "lucide-react";

interface Club { id: string; name: string; description: string | null; category: string; advisorName: string | null; memberCount: number; isMember: boolean; isLead: boolean; members: { id: string; name: string; role: string }[]; announcements: { id: string; title: string; body: string | null; postedByName: string | null; createdAt: string }[]; }

const CATEGORY_META: Record<string, string> = { academic: "bg-blue-50 text-blue-600", sports: "bg-emerald-50 text-emerald-600", arts: "bg-amber-50 text-amber-600", tech: "bg-purple-50 text-purple-600", culture: "bg-rose-50 text-rose-600", other: "bg-slate-50 text-slate-500" };

function fmt(iso: string) { return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }); }

export default function StudentClubs() {
  const [user, setUser] = useState<any>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { try { setUser(JSON.parse(localStorage.getItem("judmi_user") || "null")); } catch {} }, []);

  const fetchAll = useCallback(async () => {
    const res = await fetch("/api/org/clubs");
    const d = await res.json();
    setClubs(d.clubs || []);
  }, []);

  useEffect(() => {
    if (!user?.orgId) { setLoading(false); return; }
    fetchAll().finally(() => setLoading(false));
  }, [user?.orgId, fetchAll]);

  const toggle = async (club: Club) => {
    await fetch("/api/org/clubs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: club.isMember ? "leave" : "join", clubId: club.id }),
    });
    await fetchAll();
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-5 py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center animate-pulse mx-auto"><CalendarClock className="w-6 h-6" /></div>
        <p className="text-sm text-slate-500 font-semibold mt-3">Loading clubs…</p>
      </div>
    );
  }

  const myClubs = clubs.filter((c) => c.isMember);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
      <div>
        <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">Student Portal</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
          <CalendarClock className="w-7 h-7 text-navy-700" /> Clubs & Societies
        </h1>
        <p className="text-xs text-slate-400 font-semibold mt-0.5">Join clubs and keep up with their announcements.</p>
      </div>

      {myClubs.length > 0 && (
        <section className="rounded-2xl border-2 border-navy-100 bg-navy-50/50 p-4">
          <h2 className="text-sm font-extrabold text-navy-900 mb-2">My Clubs ({myClubs.length})</h2>
          <div className="flex flex-wrap gap-2">
            {myClubs.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1.5 bg-white border border-navy-200 rounded-lg px-2.5 py-1 text-[11px] font-bold text-navy-800">
                <Users className="w-3.5 h-3.5" /> {c.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {clubs.length === 0 ? (
        <div className="surface-elevated rounded-2xl p-8 text-center">
          <Users className="w-9 h-9 text-navy-200 mx-auto mb-2" />
          <p className="text-sm text-slate-500 font-semibold">No clubs are available yet.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {clubs.map((club) => (
            <div key={club.id} className={`surface-elevated rounded-2xl p-5 ${club.isMember ? "ring-2 ring-navy-200" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-extrabold text-slate-900">{club.name}</h3>
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-lg ${CATEGORY_META[club.category] || CATEGORY_META.other}`}>{club.category}</span>
                  </div>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {club.memberCount} members{club.advisorName ? ` · Advisor: ${club.advisorName}` : ""}
                  </p>
                </div>
                <button type="button" onClick={() => toggle(club)}
                  className={`text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 shrink-0 ${club.isMember ? "btn-outline text-rose-600" : "btn-primary"}`}>
                  {club.isMember ? <><UserCheck className="w-4 h-4" /> Leave</> : <><UserPlus className="w-4 h-4" /> Join</>}
                </button>
              </div>
              {club.description && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{club.description}</p>}

              {club.announcements.length > 0 && (
                <div className="mt-3">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 flex items-center gap-1"><Megaphone className="w-3 h-3" /> Announcements</span>
                  <div className="mt-1.5 space-y-1.5">
                    {club.announcements.map((a) => (
                      <div key={a.id} className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                        <div className="text-xs font-bold text-slate-800">{a.title}</div>
                        {a.body && <div className="text-[11px] text-slate-500 mt-0.5">{a.body}</div>}
                        <div className="text-[9px] text-slate-400 font-semibold mt-0.5">{a.postedByName || "Staff"} · {fmt(a.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
