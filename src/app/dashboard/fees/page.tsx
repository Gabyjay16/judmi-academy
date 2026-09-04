"use client";

import { useEffect, useState, useCallback } from "react";
import { Wallet, Plus, Trash2, X, ReceiptText, CheckCircle2, Users } from "lucide-react";

interface FeeStructure { id: string; name: string; amount: number; departmentId: string | null; programId: string | null; year: string | null; period: string | null; description: string | null; mandatory: number; }
interface Invoice { id: string; studentName: string | null; feeName: string | null; description: string | null; amount: number; paidAmount: number; status: string; dueDate: string | null; }
interface Payment { id: string; invoiceId: string; studentId: string; amount: number; method: string; reference: string | null; note: string | null; paidAt: string; }

function money(n: number) {
  return new Intl.NumberFormat("en-US").format(n || 0) + " FCFA";
}

const STATUS_STYLES: Record<string, string> = {
  unpaid: "text-rose-600 bg-rose-50 border-rose-100",
  partial: "text-amber-600 bg-amber-50 border-amber-100",
  paid: "text-emerald-600 bg-emerald-50 border-emerald-100",
  waived: "text-slate-500 bg-slate-50 border-slate-100",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

export default function FeesPage() {
  const [user, setUser] = useState<any>(null);
  const [fees, setFees] = useState<FeeStructure[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState<"fee" | "invoice" | "pay" | null>(null);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState<Invoice | null>(null);

  // fee structure form
  const [fName, setFName] = useState("");
  const [fAmount, setFAmount] = useState("");
  const [fDept, setFDept] = useState("");
  const [fProgram, setFProgram] = useState("");
  const [fYear, setFYear] = useState("");
  const [fPeriod, setFPeriod] = useState("");
  const [fDesc, setFDesc] = useState("");

  // invoice form
  const [iStudent, setIStudent] = useState("");
  const [iFee, setIFee] = useState("");
  const [iAmount, setIAmount] = useState("");
  const [iDue, setIDue] = useState("");
  const [iDesc, setIDesc] = useState("");

  // payment form
  const [pAmount, setPAmount] = useState("");
  const [pMethod, setPMethod] = useState("cash");
  const [pRef, setPRef] = useState("");
  const [pNote, setPNote] = useState("");

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem("judmi_user") || "null")); } catch {}
  }, []);

  const isAdmin = user?.role === "admin" || user?.role === "org_admin";

  const fetchAll = useCallback(async () => {
    const [fRes, sRes, dRes, pRes] = await Promise.all([
      fetch("/api/org/fees"),
      fetch("/api/org/students"),
      fetch("/api/org/departments"),
      fetch("/api/org/programs"),
    ]);
    const fData = await fRes.json();
    const sData = await sRes.json();
    const dData = await dRes.json();
    const pData = await pRes.json();
    setFees(fData.feeStructures || []);
    setInvoices(fData.invoices || []);
    setPayments(fData.payments || []);
    setStudents(sData.students || []);
    setDepartments(dData.departments || []);
    setPrograms(pData.programs || []);
  }, []);

  useEffect(() => {
    if (!user?.orgId) { setLoading(false); return; }
    fetchAll().finally(() => setLoading(false));
  }, [user?.orgId, fetchAll]);

  const handleCreateFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/org/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fee_structure", name: fName, amount: fAmount, departmentId: fDept || null, programId: fProgram || null, year: fYear || null, period: fPeriod || null, description: fDesc || null }),
      });
      await fetchAll();
      setModal(null);
      setFName(""); setFAmount(""); setFDept(""); setFProgram(""); setFYear(""); setFPeriod(""); setFDesc("");
    } finally { setSaving(false); }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const student = students.find((s) => s.id === iStudent);
      const fee = fees.find((f) => f.id === iFee);
      const amount = iAmount || fee?.amount || 0;
      await fetch("/api/org/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "invoice", studentId: iStudent, studentName: student?.name, feeStructureId: iFee || null, feeName: fee?.name || null, amount, description: iDesc || null, dueDate: iDue || null }),
      });
      await fetchAll();
      setModal(null);
      setIStudent(""); setIFee(""); setIAmount(""); setIDue(""); setIDesc("");
    } finally { setSaving(false); }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/org/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "payment", invoiceId: active?.id, studentId: active ? undefined : undefined, childAmount: pAmount, method: pMethod, reference: pRef || null, note: pNote || null }),
      });
      await fetchAll();
      setModal(null);
      setActive(null);
      setPAmount(""); setPMethod("cash"); setPRef(""); setPNote("");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, kind: string) => {
    if (!confirm("Delete this " + kind + "?")) return;
    await fetch("/api/org/fees", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, kind }),
    });
    await fetchAll();
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-5 py-16 flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center animate-pulse">
          <Wallet className="w-6 h-6" />
        </div>
        <p className="text-sm text-slate-500 font-semibold">Loading fees & billing…</p>
      </div>
    );
  }

  const totalCollected = payments.reduce((s, p) => s + p.amount, 0);
  const outstanding = invoices.filter((i) => i.status !== "paid" && i.status !== "waived").reduce((s, i) => s + (i.amount - i.paidAmount), 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">Staff Portal</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
            <Wallet className="w-7 h-7 text-navy-700" /> Fees & Billing
          </h1>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setModal("fee")} className="btn-primary text-xs px-3 py-2.5 rounded-xl flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> New Fee
          </button>
          <button type="button" onClick={() => setModal("invoice")} className="btn-outline text-xs px-3 py-2.5 rounded-xl flex items-center gap-1.5">
            <ReceiptText className="w-4 h-4" /> New Invoice
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="surface-elevated rounded-2xl p-5">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Collected</div>
          <div className="text-xl font-extrabold text-emerald-600 mt-1">{money(totalCollected)}</div>
        </div>
        <div className="surface-elevated rounded-2xl p-5">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Outstanding</div>
          <div className="text-xl font-extrabold text-rose-600 mt-1">{money(outstanding)}</div>
        </div>
        <div className="surface-elevated rounded-2xl p-5">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Invoices</div>
          <div className="text-xl font-extrabold text-navy-700 mt-1">{invoices.length}</div>
        </div>
      </div>

      {/* Fee structures */}
      <section>
        <h2 className="text-sm font-extrabold text-slate-900 mb-3">Fee Structures ({fees.length})</h2>
        {fees.length === 0 ? (
          <div className="surface-elevated rounded-2xl p-6 text-center">
            <p className="text-xs text-slate-400">No fee structures yet. Create one to invoice students.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {fees.map((f) => (
              <div key={f.id} className="surface-elevated rounded-2xl px-4 py-3 flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center shrink-0"><Wallet className="w-4 h-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900">{f.name}</div>
                  <div className="text-[11px] text-slate-400 font-semibold">{[f.year, f.period, f.description].filter(Boolean).join(" · ") || "General"}</div>
                </div>
                <div className="text-sm font-extrabold text-navy-700">{money(f.amount)}</div>
                {isAdmin && (
                  <button type="button" onClick={() => handleDelete(f.id, "fee_structure")} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Invoices */}
      <section>
        <h2 className="text-sm font-extrabold text-slate-900 mb-3">Invoices ({invoices.length})</h2>
        {invoices.length === 0 ? (
          <div className="surface-elevated rounded-2xl p-6 text-center">
            <p className="text-xs text-slate-400">No invoices yet.</p>
          </div>
        ) : (
          <div className="surface-elevated rounded-2xl overflow-hidden">
            {invoices.map((i) => (
              <div key={i.id} className="px-4 py-3 border-b border-slate-50 flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"><ReceiptText className="w-4 h-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900">{i.studentName || "Student"}</div>
                  <div className="text-[11px] text-slate-400 font-semibold">{i.feeName || "Fee"} · due {fmtDate(i.dueDate)}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-extrabold text-slate-900">{money(i.amount)}</div>
                  <div className="text-[11px] text-slate-400 font-semibold">paid {money(i.paidAmount)}</div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border capitalize ${STATUS_STYLES[i.status] || STATUS_STYLES.unpaid}`}>{i.status}</span>
                <button type="button" onClick={() => { setActive(i); setPAmount(String(i.amount - i.paidAmount || "")); setModal("pay"); }} className="btn-primary text-[10px] px-2.5 py-1.5 rounded-lg shrink-0">Pay</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent payments */}
      {payments.length > 0 && (
        <section>
          <h2 className="text-sm font-extrabold text-slate-900 mb-3">Recent Payments ({payments.length})</h2>
          <div className="surface-elevated rounded-2xl overflow-hidden">
            {payments.map((p) => (
              <div key={p.id} className="px-4 py-3 border-b border-slate-50 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><CheckCircle2 className="w-4 h-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-800">{money(p.amount)} · {p.method}</div>
                  <div className="text-[10px] text-slate-400 font-semibold">{p.reference || "no ref"} · {fmtDate(p.paidAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Fee structure modal */}
      {modal === "fee" && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2"><Wallet className="w-5 h-5 text-navy-700" /> New Fee Structure</h2>
              <button type="button" onClick={() => setModal(null)} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateFee} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Name <span className="text-rose-500">*</span></label>
                <input type="text" required value={fName} onChange={(e) => setFName(e.target.value)} placeholder="e.g. Tuition - Year 1" className="input-field py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Amount (FCFA) <span className="text-rose-500">*</span></label>
                <input type="number" required min={1} value={fAmount} onChange={(e) => setFAmount(e.target.value)} className="input-field py-2.5 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                  <select value={fDept} onChange={(e) => setFDept(e.target.value)} className="input-field py-2.5 text-sm">
                    <option value="">All</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Program</label>
                  <select value={fProgram} onChange={(e) => setFProgram(e.target.value)} className="input-field py-2.5 text-sm">
                    <option value="">All</option>
                    {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Level (Year)</label>
                  <input type="text" value={fYear} onChange={(e) => setFYear(e.target.value)} placeholder="e.g. Year 1" className="input-field py-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Period</label>
                  <input type="text" value={fPeriod} onChange={(e) => setFPeriod(e.target.value)} placeholder="e.g. Term 1" className="input-field py-2.5 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea value={fDesc} onChange={(e) => setFDesc(e.target.value)} rows={2} className="input-field py-2.5 text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)} className="btn-outline text-xs flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary text-xs flex-1">{saving ? "Saving…" : "Create Fee"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice modal */}
      {modal === "invoice" && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2"><ReceiptText className="w-5 h-5 text-navy-700" /> Generate Invoice</h2>
              <button type="button" onClick={() => setModal(null)} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateInvoice} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Student <span className="text-rose-500">*</span></label>
                <select required value={iStudent} onChange={(e) => setIStudent(e.target.value)} className="input-field py-2.5 text-sm">
                  <option value="">Select student…</option>
                  {students.map((s) => <option key={s.id} value={s.id}>{s.name} {s.studentId ? `(${s.studentId})` : ""}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fee</label>
                <select value={iFee} onChange={(e) => { setIFee(e.target.value); const fee = fees.find((f) => f.id === e.target.value); if (fee) setIAmount(String(fee.amount)); }} className="input-field py-2.5 text-sm">
                  <option value="">Manual amount</option>
                  {fees.map((f) => <option key={f.id} value={f.id}>{f.name} · {money(f.amount)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Amount (FCFA) <span className="text-rose-500">*</span></label>
                <input type="number" required min={1} value={iAmount} onChange={(e) => setIAmount(e.target.value)} className="input-field py-2.5 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Due Date</label>
                  <input type="date" value={iDue} onChange={(e) => setIDue(e.target.value)} className="input-field py-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                  <input type="text" value={iDesc} onChange={(e) => setIDesc(e.target.value)} className="input-field py-2.5 text-sm" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)} className="btn-outline text-xs flex-1">Cancel</button>
                <button type="submit" disabled={saving || !iStudent} className="btn-primary text-xs flex-1">{saving ? "Saving…" : "Create Invoice"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment modal */}
      {modal === "pay" && active && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-600" /> Record Payment</h2>
              <button type="button" onClick={() => setModal(null)} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handlePayment} className="p-5 sm:p-6 space-y-4">
              <p className="text-xs text-slate-500">Invoice for <b className="text-slate-800">{active.studentName}</b> — {money(active.amount)} (paid {money(active.paidAmount)})</p>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Amount (FCFA) <span className="text-rose-500">*</span></label>
                <input type="number" required min={1} value={pAmount} onChange={(e) => setPAmount(e.target.value)} className="input-field py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Method</label>
                <select value={pMethod} onChange={(e) => setPMethod(e.target.value)} className="input-field py-2.5 text-sm">
                  <option value="cash">Cash</option>
                  <option value="mobile">Mobile Money</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="card">Card</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reference</label>
                  <input type="text" value={pRef} onChange={(e) => setPRef(e.target.value)} className="input-field py-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Note</label>
                  <input type="text" value={pNote} onChange={(e) => setPNote(e.target.value)} className="input-field py-2.5 text-sm" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)} className="btn-outline text-xs flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary text-xs flex-1">{saving ? "Recording…" : "Record Payment"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
