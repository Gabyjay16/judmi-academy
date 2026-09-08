"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  ScanSearch,
  ArrowLeft,
  FileText,
  Building2,
  Loader2,
  Copy,
  Check,
  Sparkles,
  AlertTriangle,
  KeyRound,
  Upload,
  Smartphone,
  ImageIcon,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import PlagiarismResult, { CheckDisplay } from "@/components/PlagiarismResult";
import { extractTextFromFile } from "@/lib/pdf-parser";

const PRICE = 5000;
const METHOD = {
  operator: "MTN Mobile Money",
  phone: "681597837",
  accountName: "Brandon Judmi",
};

// Downscale & compress an image to a small JPEG data URL for safe storage.
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1200;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Could not process image"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.6));
      };
      img.onerror = () => reject(new Error("Could not read that image"));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("Could not read that image"));
    reader.readAsDataURL(file);
  });
}

export default function StudentPlagiarismPage() {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [plagiarismAccess, setPlagiarismAccess] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState<any | null>(null);
  const [paymentMode, setPaymentMode] = useState<"fapshi" | "manual">("manual");

  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CheckDisplay | null>(null);
  const [history, setHistory] = useState<CheckDisplay[]>([]);
  const [lastCopied, setLastCopied] = useState<string | null>(null);

  // Payment gate state (manual screenshot flow)
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [phone, setPhone] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Payment gate state (Fapshi online flow)
  const [payingFapshi, setPayingFapshi] = useState(false);
  const [confirmingFapshi, setConfirmingFapshi] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/plagcheck");
      if (!res.ok) return;
      const json = await res.json();
      setHistory(json.checks || []);
    } catch {}
  }, []);

  const loadPaymentStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/manual-payments");
      if (!res.ok) return;
      const json = await res.json();
      const my = (json.requests || []).filter((r: any) => r.feature === "plagiarism");
      const latest = my.sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt))[0] || null;
      setPaymentRequest(latest);
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth");
        const data = await res.json();
        setUser(data.user || null);
        setPlagiarismAccess(true);
        if (data.globalSettings?.paymentMode) {
          setPaymentMode(data.globalSettings.paymentMode === "manual" ? "manual" : "fapshi");
        }
      } catch {}
      setLoading(false);
      fetchHistory();
      loadPaymentStatus();
    })();
  }, [fetchHistory, loadPaymentStatus]);

  // Auto-resume a Fapshi plagiarism payment on return (?pay=...) so access
  // unlocks the moment the webhook confirms SUCCESSFUL.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const payParam = new URLSearchParams(window.location.search).get("pay");
    if (payParam) {
      localStorage.setItem("judmi_plag_payment", JSON.stringify({ paymentId: payParam, createdAt: Date.now() }));
      startFapshiPolling(payParam);
    } else {
      try {
        const pendingRaw = localStorage.getItem("judmi_plag_payment");
        if (pendingRaw) {
          const pending = JSON.parse(pendingRaw);
          if (pending?.paymentId && Date.now() - (pending.createdAt || 0) < 1000 * 60 * 120) {
            startFapshiPolling(pending.paymentId);
          } else {
            localStorage.removeItem("judmi_plag_payment");
          }
        }
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startFapshiPolling = (paymentId: string) => {
    setConfirmingFapshi(true);
    let attempts = 0;
    const poll = async () => {
      attempts += 1;
      try {
        const storedToken = typeof window !== "undefined" ? localStorage.getItem("judmi_session") || "" : "";
        const res = await fetch(`/api/payments/status?paymentId=${encodeURIComponent(paymentId)}`, {
          headers: storedToken ? { "x-session-token": storedToken } : {},
          credentials: "include",
        });
        const data = await res.json();
        if (data?.status === "SUCCESSFUL") {
          localStorage.removeItem("judmi_plag_payment");
          setConfirmingFapshi(false);
          setError(null);
          setPlagiarismAccess(true);
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
        if (data?.status === "FAILED" || data?.status === "EXPIRED") {
          localStorage.removeItem("judmi_plag_payment");
          setConfirmingFapshi(false);
          setError(data?.status === "EXPIRED" ? "This payment link expired. No money was taken — try again." : "Payment failed. No money was taken — try again.");
          return;
        }
      } catch {}
      if (attempts < 72) {
        setTimeout(poll, 10000);
      } else {
        setConfirmingFapshi(false);
        setError("We could not confirm your payment yet. If you already paid, refresh this page to re-check.");
      }
    };
    setTimeout(poll, 3000);
  };

  const startFapshiPayment = async () => {
    setError(null);
    setPayingFapshi(true);
    try {
      const storedToken = typeof window !== "undefined" ? localStorage.getItem("judmi_session") || "" : "";
      const res = await fetch("/api/payments/plagiarism", {
        method: "POST",
        headers: storedToken ? { "Content-Type": "application/json", "x-session-token": storedToken } : { "Content-Type": "application/json" },
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Could not start the payment. Please try again.");
        return;
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("judmi_plag_payment", JSON.stringify({ paymentId: json.paymentId, createdAt: Date.now() }));
      }
      window.location.href = json.link;
    } catch (err: any) {
      setError(err?.message || "Payment setup failed. Please try again.");
    } finally {
      setPayingFapshi(false);
    }
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!screenshotFile) {
      setError("Please upload a screenshot of your payment confirmation.");
      return;
    }
    if (!screenshotFile.type.startsWith("image/")) {
      setError("The payment proof must be an image (PNG/JPG) screenshot.");
      return;
    }
    setSubmittingPayment(true);
    try {
      const screenshotUrl = await compressImage(screenshotFile);
      const res = await fetch("/api/manual-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feature: "plagiarism",
          amount: PRICE,
          phone: phone.trim(),
          operator: METHOD.operator,
          screenshotUrl,
          screenshotName: screenshotFile.name,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to submit your payment request.");
        return;
      }
      setScreenshotFile(null);
      setPhone("");
      loadPaymentStatus();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setError(err?.message || "Failed to submit your payment request.");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const runCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("Please upload a PDF or Word (.docx) document containing your work to check.");
      return;
    }
    setRunning(true);
    try {
      const extracted = await extractTextFromFile(file);
      if (!extracted.ok || !extracted.text.trim()) {
        setError(extracted.message || "Could not read text from that document. Please try another file.");
        return;
      }
      const res = await fetch("/api/plagcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || file.name,
          text: extracted.text,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.paymentRequired) {
          setPlagiarismAccess(false);
        }
        setError(json.error || "The check failed. Please try again.");
        return;
      }
      setResult(json.check);
      setFile(null);
      fetchHistory();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setError(err?.message || "The check failed. Please try again.");
    } finally {
      setRunning(false);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setLastCopied(code);
      setTimeout(() => setLastCopied(null), 2000);
    } catch {}
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-slate-500 space-y-3">
        <div className="w-10 h-10 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold">Loading Plagiarism & Authenticity Checker...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
          <Building2 className="w-7 h-7 text-slate-400" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">Plagiarism & Authenticity Checker</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Please sign in to run an authenticity check on your work.
        </p>
        <Link href="/login" className="inline-block mt-2 text-sm font-bold text-indigo-600 hover:underline">
          Sign in
        </Link>
      </div>
    );
  }

  if (!user.orgId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
          <Building2 className="w-7 h-7 text-slate-400" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">Plagiarism & Authenticity Checker</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          This tool is available to students and teachers registered under a school. Ask your school administrator for the enrolment link to join your school.
        </p>
        <Link href="/" className="inline-block mt-2 text-sm font-bold text-indigo-600 hover:underline">
          ← Back to Home
        </Link>
      </div>
    );
  }

  // --- PAYMENT GATE: no plagiarism access yet ---
  if (!plagiarismAccess) {
    const hasPending = paymentRequest?.status === "pending";
    const wasRejected = paymentRequest?.status === "rejected";

    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-7">
        <Link
          href="/student/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>

        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Plagiarism & Authenticity Checker</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              Activate access to check your thesis or assignment for copied, recycled, or likely AI-generated writing.
            </p>
          </div>
        </div>

        {/* Pending approval banner */}
        {hasPending && (
          <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Payment submitted — awaiting admin approval</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              We received your payment request for {METHOD.operator} ({PRICE.toLocaleString()} FCFA). An administrator
              is verifying your screenshot. As soon as it is confirmed, your access will be unlocked automatically.
            </p>
          </div>
        )}

        {wasRejected && (
          <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-sm text-rose-900">
              <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>Your previous payment request was declined</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              The screenshot could not be verified. Please make the payment again and re-submit your proof below.
            </p>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {confirmingFapshi && paymentMode === "fapshi" && (
          <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-sm text-indigo-900">
              <Loader2 className="w-5 h-5 text-indigo-600 animate-spin shrink-0" />
              <span>Confirming your payment...</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your Mobile Money payment is being verified. Keep this page open — your plagiarism checker access
              activates automatically once confirmed.
            </p>
          </div>
        )}

        {/* Payment method card */}
        {paymentMode === "manual" ? (
        <form onSubmit={submitPayment} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-extrabold text-slate-800">Activate the Plagiarism Checker</h2>
          </div>

          {/* Payment method card */}
          <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-4 sm:p-5 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-900">{METHOD.operator}</p>
                <p className="text-[11px] text-slate-500">Pay exactly and send your proof below</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amount</p>
                <p className="text-base font-extrabold text-slate-900">{PRICE.toLocaleString()} FCFA</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Number</p>
                <p className="text-base font-extrabold text-slate-900 font-mono">{METHOD.phone}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Name</p>
                <p className="text-sm font-extrabold text-slate-900">{METHOD.accountName}</p>
              </div>
            </div>
          </div>

          <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside">
            <li>Dial *126# and transfer <strong className="text-slate-900">{PRICE.toLocaleString()} FCFA</strong> to <strong className="font-mono">{METHOD.phone}</strong> ({METHOD.accountName}).</li>
            <li>Take a screenshot of the MTN confirmation message.</li>
            <li>Upload the screenshot below and submit.</li>
            <li>An administrator verifies your payment — access is unlocked once approved.</li>
          </ol>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Mobile Money phone number (optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 681597837"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
              Payment screenshot (proof)
            </label>
            <label
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-all cursor-pointer p-8 text-center ${
                screenshotFile
                  ? "border-emerald-400 bg-emerald-50/60"
                  : "border-slate-300 bg-slate-50/50 hover:border-emerald-400 hover:bg-emerald-50/30"
              }`}
            >
              {screenshotFile ? (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-slate-800">{screenshotFile.name}</span>
                  <span className="text-xs text-slate-500">
                    {(screenshotFile.size / 1024 / 1024).toFixed(1)} MB • {screenshotFile.type}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600">Tap to choose a different screenshot</span>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-slate-800">Upload your payment screenshot</span>
                  <span className="text-xs text-slate-500 max-w-sm">
                    Use a clear screenshot of the MTN Mobile Money confirmation message.
                  </span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const chosen = e.target.files?.[0] || null;
                  if (chosen && !chosen.type.startsWith("image/")) {
                    setScreenshotFile(null);
                    setError("Payment proof must be an image (PNG/JPG) screenshot.");
                    return;
                  }
                  setError(null);
                  setScreenshotFile(chosen);
                }}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={submittingPayment || !screenshotFile || hasPending}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5"
          >
            {submittingPayment ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting payment request…
              </>
            ) : hasPending ? (
              <>
                <Clock className="w-4 h-4" />
                Pending Approval
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Submit Payment Proof
              </>
            )}
          </button>

          <p className="text-[11px] text-slate-400 flex items-start gap-1.5">
            <KeyRound className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            Your access is activated only after an administrator verifies your payment and grants permission.
          </p>
        </form>
        ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-extrabold text-slate-800">Activate the Plagiarism Checker</h2>
          </div>

          <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/40 p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-900">Online Checkout — {PRICE.toLocaleString()} FCFA</p>
                <p className="text-[11px] text-slate-500">Secure Fapshi payment via MTN MoMo / Orange Money</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              When you click Pay, you will be redirected to our secure Fapshi checkout to complete the {PRICE.toLocaleString()} FCFA
              payment with MTN Mobile Money or Orange Money. Your Plagiarism Checker access unlocks automatically the moment
              the payment is confirmed — no screenshot or admin approval needed.
            </p>
          </div>

          <button
            type="button"
            onClick={startFapshiPayment}
            disabled={payingFapshi || confirmingFapshi}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-1.5"
          >
            {payingFapshi ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Preparing secure checkout…
              </>
            ) : confirmingFapshi ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Confirming payment…
              </>
            ) : (
              <>
                <Smartphone className="w-4 h-4" />
                Pay {PRICE.toLocaleString()} FCFA — Continue to Checkout
              </>
            )}
          </button>

          <p className="text-[11px] text-slate-400 flex items-start gap-1.5">
            <KeyRound className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            Use the Mobile Money option in the checkout to pay securely. Access is granted instantly after confirmation.
          </p>
        </div>
        )}
      </div>
    );
  }

  // --- ACCESS GRANTED: normal checker ---
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-7">
      <Link
        href="/student/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
      </Link>

      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Plagiarism & Authenticity Checker</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Upload your thesis or assignment (PDF or Word) and we'll check it for copied, recycled, or likely AI-generated writing. When the check finishes, a unique verification code lets your teacher confirm the exact result under your school.
          </p>
        </div>
      </div>

      {/* Activated badge */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Access activated
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <PlagiarismResult check={result} showCopyHint />
      )}

      {/* Check form */}
      <form onSubmit={runCheck} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ScanSearch className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-extrabold text-slate-800">Run a new check</h2>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Work title (optional)</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. History Essay — Origins of the Cold War"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-emerald-600" />
            Upload your work (PDF or Word)
          </label>

          <label
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-all cursor-pointer p-8 text-center ${
              file
                ? "border-emerald-400 bg-emerald-50/60"
                : "border-slate-300 bg-slate-50/50 hover:border-emerald-400 hover:bg-emerald-50/30"
            }`}
          >
            {file ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="text-sm font-bold text-slate-800">{file.name}</span>
                <span className="text-xs text-slate-500">
                  {(file.size / 1024 / 1024).toFixed(1)} MB • {file.type.includes("pdf") ? "PDF" : "Word"} document
                </span>
                <span className="text-[11px] font-semibold text-emerald-600">Tap to choose a different file</span>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-sm font-bold text-slate-800">Choose a PDF or Word document</span>
                <span className="text-xs text-slate-500 max-w-sm">
                  Your thesis, essay or report as a .pdf or .docx file. The AI reads the document and gives you the result.
                </span>
              </>
            )}
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => {
                const chosen = e.target.files?.[0] || null;
                if (chosen) {
                  const name = chosen.name.toLowerCase();
                  const ext = name.endsWith(".pdf") || name.endsWith(".docx") || name.endsWith(".doc");
                  if (!ext) {
                    setFile(null);
                    setError("Please upload a PDF or Word (.doc / .docx) document.");
                    return;
                  }
                  setError(null);
                  setFile(chosen);
                }
              }}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={running || !file}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5"
        >
          {running ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing your document…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Run Authenticity Check
            </>
          )}
        </button>

        <p className="text-[11px] text-slate-400 flex items-start gap-1.5">
          <KeyRound className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Analysis takes a few seconds. The AI-use estimate is advisory and style-based. Combined score = Similarity + (AI-use × 0.5); approved when it is 30% or below.
        </p>
      </form>

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-extrabold text-slate-800">Your previous checks</h2>
          <div className="space-y-2">
            {history.map((c) => {
              const approved = c.verdict === "approved" || c.combinedScore <= 30;
              return (
                <div
                  key={c.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white rounded-2xl border border-slate-200 shadow-xs p-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{c.title}</p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(c.createdAt || "").toLocaleString()} • {c.wordCount.toLocaleString()} words
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] font-bold">
                      <span className={approved ? "text-emerald-600" : "text-rose-600"}>
                        {approved ? "APPROVED" : "FLAGGED"}
                      </span>
                      <span className="text-slate-400 font-normal">Combined {c.combinedScore}%</span>
                      <span className="text-slate-400 font-normal">Similarity {c.similarityPercent}%</span>
                      <span className="text-slate-400 font-normal">AI-use {c.aiPercent}%</span>
                    </div>
                  </div>
                  <button
                    onClick={() => copyCode(c.code)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-800 transition-colors shrink-0"
                    title="Copy code"
                  >
                    {lastCopied === c.code ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="font-mono tracking-widest">{c.code}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
