"use client";

import { useEffect, useState, useCallback } from "react";
import { BookOpen, Plus, Trash2, X, RotateCcw, BookUp, Search } from "lucide-react";

interface Book { id: string; title: string; author: string | null; isbn: string | null; category: string | null; location: string | null; totalCopies: number; availableCopies: number; }
interface Loan { id: string; bookId: string; studentName: string | null; dueDate: string; returnedAt: string | null; status: string; }
interface Student { id: string; name: string; studentId: string | null; }

const LOAN_STYLES: Record<string, string> = {
  borrowed: "text-navy-700 bg-navy-50 border-navy-100",
  overdue: "text-rose-600 bg-rose-50 border-rose-100",
  returned: "text-emerald-600 bg-emerald-50 border-emerald-100",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export default function LibraryPage() {
  const [user, setUser] = useState<any>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"book" | "checkout" | null>(null);
  const [saving, setSaving] = useState(false);

  // add book
  const [bTitle, setBTitle] = useState("");
  const [bAuthor, setBAuthor] = useState("");
  const [bIsbn, setBIsbn] = useState("");
  const [bCat, setBCat] = useState("");
  const [bLoc, setBLoc] = useState("");
  const [bCopies, setBCopies] = useState("1");

  // checkout
  const [cBook, setCBook] = useState("");
  const [cStudent, setCStudent] = useState("");
  const [cDue, setCDue] = useState("");

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem("judmi_user") || "null")); } catch {}
  }, []);

  const isAdmin = user?.role === "admin" || user?.role === "org_admin";

  const fetchAll = useCallback(async () => {
    const [lRes, sRes] = await Promise.all([fetch("/api/org/library"), fetch("/api/org/students")]);
    const lData = await lRes.json();
    const sData = await sRes.json();
    setBooks(lData.books || []);
    setLoans(lData.loans || []);
    setStudents(sData.students || []);
  }, []);

  useEffect(() => {
    if (!user?.orgId) { setLoading(false); return; }
    fetchAll().finally(() => setLoading(false));
  }, [user?.orgId, fetchAll]);

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/org/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "book", title: bTitle, author: bAuthor, isbn: bIsbn, category: bCat, location: bLoc, copies: bCopies }),
      });
      setModal(null);
      setBTitle(""); setBAuthor(""); setBIsbn(""); setBCat(""); setBLoc(""); setBCopies("1");
      await fetchAll();
    } finally { setSaving(false); }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const student = students.find((s) => s.id === cStudent);
      await fetch("/api/org/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkout", bookId: cBook, studentId: cStudent, studentName: student?.name, dueDate: cDue }),
      });
      setModal(null);
      setCBook(""); setCStudent(""); setCDue("");
      await fetchAll();
    } finally { setSaving(false); }
  };

  const handleReturn = async (loanId: string) => {
    await fetch("/api/org/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "return", loanId }),
    });
    await fetchAll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this book?")) return;
    await fetch("/api/org/library", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchAll();
  };

  const filteredBooks = books.filter((b) => !search || b.title.toLowerCase().includes(search.toLowerCase()) || (b.author || "").toLowerCase().includes(search.toLowerCase()));
  const activeLoans = loans.filter((l) => l.status !== "returned");
  const overdue = activeLoans.filter((l) => l.status === "overdue");

  const bookTitle = (id: string) => books.find((b) => b.id === id)?.title || "Book";

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-5 py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center animate-pulse mx-auto">
          <BookOpen className="w-6 h-6" />
        </div>
        <p className="text-sm text-slate-500 font-semibold mt-3">Loading library…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">Staff Portal</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-navy-700" /> Library
          </h1>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setModal("checkout")} className="btn-primary text-xs px-3 py-2.5 rounded-xl flex items-center gap-1.5">
            <BookUp className="w-4 h-4" /> Checkout
          </button>
          <button type="button" onClick={() => setModal("book")} className="btn-outline text-xs px-3 py-2.5 rounded-xl flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add Book
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="surface-elevated rounded-2xl p-5">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Books</div>
          <div className="text-xl font-extrabold text-navy-700 mt-1">{books.length}</div>
        </div>
        <div className="surface-elevated rounded-2xl p-5">
          <div className="text-[11px] font-bold text-slate-400 uppercase">On Loan</div>
          <div className="text-xl font-extrabold text-navy-700 mt-1">{activeLoans.length}</div>
        </div>
        <div className="surface-elevated rounded-2xl p-5">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Overdue</div>
          <div className="text-xl font-extrabold text-rose-600 mt-1">{overdue.length}</div>
        </div>
      </div>

      <div>
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title or author…" className="input-field py-2.5 pl-9 text-sm" />
        </div>
      </div>

      <section>
        <h2 className="text-sm font-extrabold text-slate-900 mb-3">Catalog ({filteredBooks.length})</h2>
        {filteredBooks.length === 0 ? (
          <div className="surface-elevated rounded-2xl p-6 text-center">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-400 mt-2">No books yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredBooks.map((b) => (
              <div key={b.id} className="surface-elevated rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <span className="w-10 h-10 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center shrink-0"><BookOpen className="w-5 h-5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900">{b.title}</div>
                    <div className="text-[11px] text-slate-400 font-semibold">{b.author || "Unknown author"}{b.category ? ` · ${b.category}` : ""}</div>
                    {b.isbn && <div className="text-[10px] text-slate-300 font-mono">ISBN {b.isbn}</div>}
                  </div>
                  {isAdmin && <button type="button" onClick={() => handleDelete(b.id)} className="text-slate-300 hover:text-rose-500 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>}
                </div>
                <div className="mt-3 flex justify-between items-center">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${b.availableCopies > 0 ? "text-emerald-600 bg-emerald-50 border border-emerald-100" : "text-rose-500 bg-rose-50 border border-rose-100"}`}>
                    {b.availableCopies}/{b.totalCopies} available
                  </span>
                  {b.location && <span className="text-[10px] text-slate-400 font-semibold">📍 {b.location}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-extrabold text-slate-900 mb-3">Loans ({loans.length})</h2>
        {loans.length === 0 ? (
          <div className="surface-elevated rounded-2xl p-6 text-center">
            <p className="text-xs text-slate-400">No loans recorded.</p>
          </div>
        ) : (
          <div className="surface-elevated rounded-2xl overflow-hidden">
            {loans.map((l) => (
              <div key={l.id} className="px-4 py-3 border-b border-slate-50 flex items-center gap-3">
                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border capitalize shrink-0 ${LOAN_STYLES[l.status] || LOAN_STYLES.borrowed}`}>{l.status}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900">{bookTitle(l.bookId)}</div>
                  <div className="text-[11px] text-slate-400 font-semibold">{l.studentName || "Student"} · due {fmt(l.dueDate)}{l.returnedAt ? ` · returned ${fmt(l.returnedAt)}` : ""}</div>
                </div>
                {l.status !== "returned" && (
                  <button type="button" onClick={() => handleReturn(l.id)} className="btn-outline text-[10px] px-2.5 py-1.5 rounded-lg flex items-center gap-1 shrink-0">
                    <RotateCcw className="w-3.5 h-3.5" /> Return
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add book modal */}
      {modal === "book" && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2"><BookOpen className="w-5 h-5 text-navy-700" /> Add Book</h2>
              <button type="button" onClick={() => setModal(null)} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddBook} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Title <span className="text-rose-500">*</span></label>
                <input type="text" required value={bTitle} onChange={(e) => setBTitle(e.target.value)} className="input-field py-2.5 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Author</label>
                  <input type="text" value={bAuthor} onChange={(e) => setBAuthor(e.target.value)} className="input-field py-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ISBN</label>
                  <input type="text" value={bIsbn} onChange={(e) => setBIsbn(e.target.value)} className="input-field py-2.5 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <input type="text" value={bCat} onChange={(e) => setBCat(e.target.value)} placeholder="e.g. Fiction" className="input-field py-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Location</label>
                  <input type="text" value={bLoc} onChange={(e) => setBLoc(e.target.value)} placeholder="e.g. Shelf B2" className="input-field py-2.5 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Copies</label>
                <input type="number" min={1} value={bCopies} onChange={(e) => setBCopies(e.target.value)} className="input-field py-2.5 text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)} className="btn-outline text-xs flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary text-xs flex-1">{saving ? "Adding…" : "Add Book"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Checkout modal */}
      {modal === "checkout" && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2"><BookUp className="w-5 h-5 text-navy-700" /> Checkout Book</h2>
              <button type="button" onClick={() => setModal(null)} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCheckout} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Book <span className="text-rose-500">*</span></label>
                <select required value={cBook} onChange={(e) => setCBook(e.target.value)} className="input-field py-2.5 text-sm">
                  <option value="">Select book…</option>
                  {books.filter((b) => b.availableCopies > 0).map((b) => <option key={b.id} value={b.id}>{b.title} ({b.availableCopies} avail)</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Student <span className="text-rose-500">*</span></label>
                <select required value={cStudent} onChange={(e) => setCStudent(e.target.value)} className="input-field py-2.5 text-sm">
                  <option value="">Select student…</option>
                  {students.map((s) => <option key={s.id} value={s.id}>{s.name} {s.studentId ? `(${s.studentId})` : ""}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Due Date <span className="text-rose-500">*</span></label>
                <input type="date" required value={cDue} onChange={(e) => setCDue(e.target.value)} className="input-field py-2.5 text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)} className="btn-outline text-xs flex-1">Cancel</button>
                <button type="submit" disabled={saving || !cBook || !cStudent || !cDue} className="btn-primary text-xs flex-1">{saving ? "Checking out…" : "Checkout"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
