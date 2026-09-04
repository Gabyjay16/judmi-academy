"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, Plus, Trash2, X, Megaphone, UserMinus, CalendarClock } from "lucide-react";

interface Club { id: string; name: string; description: string | null; category: string; advisorName: string | null; memberCount: number; isMember: boolean; isLead: boolean; members: { id: string; name: string; role: string }[]; announcements: { id: string; title: string; body: string | null; postedByName: string | null; createdAt: string }[]; }

const CATEGORY_META: Record<string, string> = { academic: "bg-blue-50 text-blue-600", sports: "bg-emerald-50 text-emerald-600", arts: "bg-amber-50 text-amber-600", tech: "bg-purple-50 text-purple-600", culture: "bg-rose-50 text-rose-600", other: "bg-slate-50 text-slate-500" };

function fmt(iso: string) { return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }); }

export default function ClubsPage() {
  const [user, setUser] = useState<any>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"create" | "announce" | null>(null);
  const [announceClub, setAnnounceClub] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [cName, setCName] = useState("");
  const [cDesc, setCDesc] = useState("");
  const [cCat, setCCat] = useState("other");
  const [aTitle, setATitle] = useState("");
  const [aBody, setABody] = useState("");

  useEffect(() => { try { setUser(JSON.parse(localStorage.getItem("judmi_user") || "null")); } catch {} }, []);
  const isStaff = user?.role === "admin" || user?.role === "org_admin" || user?.role === "teacher";

  const fetchAll = useCallback(async () => {
    const res = await fetch("/api/org/clubs");
    const d = await res.json();
    setClubs(d.clubs || []);
  }, []);

  useEffect(() => {
    if (!user?.orgId) { setLoading(false); return; }
    fetchAll().finally(() => setLoading(false));
  }, [user?.orgId, fetchAll]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/org/clubs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", name: cName, description: cDesc, category: cCat }) });
      setModal(null); setCName(""); setCDesc(""); setCCat("other"); await fetchAll();
    } finally { setSaving(false); }
  };

  const handleAnnounce = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/org/clubs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "announce", clubId: announceClub, title: aTitle, body: aBody }) });
      setModal(null); setATitle(""); setABody(""); setAnnounceClub(""); await fetchAll();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this club and all members/announcements?")) return;
    await fetch("/api/org/clubs", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await fetchAll();
  };

  const handleRemoveMember = async (clubId: string, memberId: string) => {
    if (!confirm("Remove this member from the club?")) return;
    await fetch("/api/org/clubs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "remove_member", clubId, memberId }) });
    await fetchAll();
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-5 py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center animate-pulse mx-auto"><Users className="w-6 h-6" /></div>
        <p className="text-sm text-slate-500 font-semibold mt-3">Loading clubs…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">Staff Portal</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
            <CalendarClock className="w-7 h-7 text-navy-700" /> Clubs & Societies
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Create clubs, manage members, and post club-specific announcements.</p>
        </div>
        {isStaff && (
          <button type="button" onClick={() => setModal("create")} className="btn-primary text-xs px-3 py-2.5 rounded-xl flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> New Club
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {clubs.length === 0 ? (
          <div className="md:col-span-2 surface-elevated rounded-2xl p-8 text-center">
            <Users className="w-9 h-9 text-navy-200 mx-auto mb-2" />
            <p className="text-sm text-slate-500 font-semibold">No clubs yet. Create the first one.</p>
          </div>
        ) : clubs.map((club) => (
          <div key={club.id} className="surface-elevated rounded-2xl p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900 truncate">{club.name}</h3>
                  <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-lg ${CATEGORY_META[club.category] || CATEGORY_META.other}`}>{club.category}</span>
                </div>
                <p className="text-xs text-slate-400 font-semibold mt-0.5 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> {club.memberCount} members{club.advisorName ? ` · Advisor: ${club.advisorName}` : ""}
                </p>
              </div>
              {isStaff && <button type="button" onClick={() => handleDelete(club.id)} className="text-slate-300 hover:text-rose-500 shrink-0"><Trash2 className="w-4 h-4" /></button>}
            </div>
            {club.description && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{club.description}</p>}

            {/* Announcements */}
            {(club.announcements.length > 0 || isStaff) && (
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 flex items-center gap-1"><Megaphone className="w-3 h-3" /> Announcements</span>
                  {isStaff && (
                    <button type="button" onClick={() => { setAnnounceClub(club.id); setModal("announce"); }} className="text-[10px] font-bold text-navy-700 hover:underline">+ Post</button>
                  )}
                </div>
                <div className="mt-1.5 space-y-1.5">
                  {club.announcements.length === 0 && <p className="text-[11px] text-slate-400 font-semibold">No announcements yet.</p>}
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

            {/* Members */}
            {club.members.length > 0 && (
              <div className="mt-3">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Members</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {club.members.map((m) => (
                    <span key={m.id} className="inline-flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-600">
                      {m.name} {m.role === "lead" && <span className="text-amber-600">✦</span>}
                      {isStaff && m.role !== "lead" && <button type="button" onClick={() => handleRemoveMember(club.id, m.id)} className="text-slate-300 hover:text-rose-500"><UserMinus className="w-3 h-3" /></button>}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create modal */}
      {modal === "create" && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900"><Users className="inline w-5 h-5 text-navy-700 mr-2" />New Club</h2>
              <button type="button" onClick={() => setModal(null)} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Club Name <span className="text-rose-500">*</span></label>
                <input type="text" required value={cName} onChange={(e) => setCName(e.target.value)} placeholder="e.g. Debate Society" className="input-field py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <select value={cCat} onChange={(e) => setCCat(e.target.value)} className="input-field py-2.5 text-sm">
                  <option value="academic">Academic</option><option value="sports">Sports</option><option value="arts">Arts</option><option value="tech">Tech</option><option value="culture">Culture</option><option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea value={cDesc} onChange={(e) => setCDesc(e.target.value)} rows={3} className="input-field py-2.5 text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)} className="btn-outline text-xs flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary text-xs flex-1">{saving ? "Creating…" : "Create Club"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Announce modal */}
      {modal === "announce" && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900"><Megaphone className="inline w-5 h-5 text-navy-700 mr-2" />Post Club Announcement</h2>
              <button type="button" onClick={() => setModal(null)} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAnnounce} className="p-5 sm:p-6 space-y-4">
              <p className="text-xs text-slate-400 font-semibold">This announcement is visible only to members of the selected club.</p>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Title <span className="text-rose-500">*</span></label>
                <input type="text" required value={aTitle} onChange={(e) => setATitle(e.target.value)} className="input-field py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Message</label>
                <textarea value={aBody} onChange={(e) => setABody(e.target.value)} rows={3} className="input-field py-2.5 text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)} className="btn-outline text-xs flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary text-xs flex-1">{saving ? "Posting…" : "Post"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
