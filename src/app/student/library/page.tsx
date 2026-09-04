"use client";

import { useEffect, useState } from "react";
import { BookOpen, Search } from "lucide-react";

interface Book { id: string; title: string; author: string | null; category: string | null; location: string | null; totalCopies: number; availableCopies: number; }
interface Loan { id: string; bookId: string; dueDate: string; returnedAt: string | null; status: string; }

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export default function StudentLibraryPage() {
  const [user, setUser] = useState<any>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem("judmi_user") || "null")); } catch {}
  }, []);

  useEffect(() => {
    if (!user?.orgId) { setLoading(false); return; }
    fetch("/api/org/library")
      .then((r) => r.json())
      .then((d) => { setBooks(d.books || []); setLoans(d.loans || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.orgId]);

  const filtered = books.filter((b) => !search || b.title.toLowerCase().includes(search.toLowerCase()) || (b.author || "").toLowerCase().includes(search.toLowerCase()));
  const myActive = loans.filter((l) => l.status !== "returned");
  const bookTitle = (id: string) => books.find((b) => b.id === id)?.title || "Book";

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center animate-pulse mx-auto">
          <BookOpen className="w-6 h-6" />
        </div>
        <p className="text-sm text-slate-500 font-semibold mt-3">Loading library…</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
      <div>
        <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">Resource Center</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
          <BookOpen className="w-7 h-7 text-navy-700" /> School Library
        </h1>
      </div>

      {myActive.length > 0 && (
        <section>
          <h2 className="text-sm font-extrabold text-slate-900 mb-3">My Loans ({myActive.length})</h2>
          <div className="space-y-2">
            {myActive.map((l) => (
              <div key={l.id} className="surface-elevated rounded-2xl px-4 py-3 flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"><BookOpen className="w-4 h-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900">{bookTitle(l.bookId)}</div>
                  <div className={`text-[11px] font-bold ${l.status === "overdue" ? "text-rose-500" : "text-slate-400"}`}>
                    {l.status === "overdue" ? "⚠ Overdue — " : "Due "}{fmt(l.dueDate)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div>
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search catalog…" className="input-field py-2.5 pl-9 text-sm" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="surface-elevated rounded-2xl p-8 text-center space-y-2">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-500">No books found</p>
          <p className="text-xs text-slate-400">Borrow books at the library desk.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((b) => (
            <div key={b.id} className="surface-elevated rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center shrink-0"><BookOpen className="w-5 h-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900">{b.title}</div>
                  <div className="text-[11px] text-slate-400 font-semibold">{b.author || "Unknown author"}{b.category ? ` · ${b.category}` : ""}</div>
                </div>
              </div>
              <div className="mt-3 flex justify-between items-center">
                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${b.availableCopies > 0 ? "text-emerald-600 bg-emerald-50 border border-emerald-100" : "text-rose-500 bg-rose-50 border border-rose-100"}`}>
                  {b.availableCopies > 0 ? `${b.availableCopies} available` : "Out of stock"}
                </span>
                {b.location && <span className="text-[10px] text-slate-400 font-semibold">📍 {b.location}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
