"use client";

import { useEffect, useState } from "react";
import { ReceiptText, CheckCircle2, Clock, Wallet, Download } from "lucide-react";

interface Invoice { id: string; feeName: string | null; description: string | null; amount: number; paidAmount: number; status: string; dueDate: string | null; }

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

export default function StudentFeesPage() {
  const [user, setUser] = useState<any>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem("judmi_user") || "null")); } catch {}
  }, []);

  useEffect(() => {
    if (!user?.orgId) { setLoading(false); return; }
    fetch("/api/org/fees")
      .then((r) => r.json())
      .then((d) => setInvoices(d.invoices || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.orgId]);

  const totalDue = invoices.filter((i) => i.status !== "paid" && i.status !== "waived").reduce((s, i) => s + (i.amount - i.paidAmount), 0);
  const totalPaid = invoices.reduce((s, i) => s + i.paidAmount, 0);

  const handleDownloadReceipt = (inv: Invoice) => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
      body{font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;margin:0;padding:40px;}
      .rc{max-width:540px;margin:0 auto;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;}
      .h{background:#1a2c47;color:#fff;padding:24px;display:flex;justify-content:space-between;align-items:center;}
      .h .b{font-size:18px;font-weight:900;} .h .s{font-size:11px;opacity:.7;text-align:right;}
      .b{padding:24px;} table{width:100%;border-collapse:collapse;font-size:13px;}
      td{padding:8px 0;border-bottom:1px solid #f1f5f9;} td:last-child{text-align:right;font-weight:700;}
      .t{border-top:2px solid #1a2c47;font-weight:900;}
      .stat{display:inline-block;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:800;text-transform:uppercase;margin-top:12px;}
      .f{color:#94a3b8;font-size:10px;text-align:center;padding:14px;}
    </style></head><body>
      <div class="rc">
        <div class="h"><div><div class="b">Judmi Academy</div></div><div class="s">FEE RECEIPT<br/>${new Date().toLocaleDateString()}</div></div>
        <div class="b">
          <table>
            <tr><td>Student</td><td>${(user?.name || "Student")}</td></tr>
            <tr><td>Fee</td><td>${inv.feeName || "School fee"}</td></tr>
            <tr><td>Status</td><td style="text-transform:capitalize">${inv.status}</td></tr>
            <tr><td>Amount</td><td>${money(inv.amount)}</td></tr>
            <tr><td>Paid</td><td>${money(inv.paidAmount)}</td></tr>
            <tr class="t"><td>Balance</td><td>${money(inv.amount - inv.paidAmount)}</td></tr>
          </table>
          <span class="stat" style="color:${inv.status==='paid'?'#059669':'#d97706'};background:${inv.status==='paid'?'#d1fae5':'#fef3c7'};"">${inv.status}</span>
        </div>
        <div class="f">Generated electronically · contact the finance office for verification</div>
      </div>
    </body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${inv.id}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center animate-pulse mx-auto">
          <Wallet className="w-6 h-6" />
        </div>
        <p className="text-sm text-slate-500 font-semibold mt-3">Loading fees…</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
      <div>
        <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">Finance</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
          <Wallet className="w-7 h-7 text-navy-700" /> My Fees
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="surface-elevated rounded-2xl p-5">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Total Due</div>
          <div className="text-xl font-extrabold text-rose-600 mt-1">{money(totalDue)}</div>
        </div>
        <div className="surface-elevated rounded-2xl p-5">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Total Paid</div>
          <div className="text-xl font-extrabold text-emerald-600 mt-1">{money(totalPaid)}</div>
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="surface-elevated rounded-2xl p-8 text-center space-y-2">
          <ReceiptText className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-500">No invoices yet</p>
          <p className="text-xs text-slate-400">Your school will bill you here as fees are due.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((i) => (
            <div key={i.id} className="surface-elevated rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"><ReceiptText className="w-5 h-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900">{i.feeName || "School fee"}</div>
                  {i.description && <div className="text-[11px] text-slate-400 mt-0.5">{i.description}</div>}
                  {i.dueDate && <div className="text-[11px] text-slate-400 font-semibold mt-0.5">Due {fmtDate(i.dueDate)}</div>}
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border capitalize shrink-0 ${STATUS_STYLES[i.status] || STATUS_STYLES.unpaid}`}>{i.status}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl px-3 py-2 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Amount</div>
                  <div className="text-sm font-extrabold text-slate-900 mt-0.5">{money(i.amount)}</div>
                </div>
                <div className="bg-slate-50 rounded-xl px-3 py-2 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Paid</div>
                  <div className="text-sm font-extrabold text-emerald-600 mt-0.5">{money(i.paidAmount)}</div>
                </div>
              </div>
              {i.status !== "paid" && i.status !== "waived" && (
                <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl p-3 text-[11px] text-amber-800">
                  {i.status === "partial" ? <><CheckCircle2 className="w-3.5 h-3.5 inline" /> Partial payment recorded. Remaining balance: <b>{money(i.amount - i.paidAmount)}</b>. Contact the finance office to complete payment.</> : <><Clock className="w-3.5 h-3.5 inline" /> Please pay <b>{money(i.amount - i.paidAmount)}</b> at the finance office or via mobile money.</>}
                </div>
              )}
              <div className="mt-3 flex justify-end">
                <button type="button" onClick={() => handleDownloadReceipt(i)} className="btn-outline text-[10px] px-2.5 py-1.5 rounded-lg flex items-center gap-1">
                  <Download className="w-3.5 h-3.5" /> Receipt
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
