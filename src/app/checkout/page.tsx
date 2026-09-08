"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  BookOpen, 
  ShieldCheck, 
  Smartphone, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Sparkles,
  Lock,
  Loader2,
  Phone,
  User,
  CheckCheck,
  Check
} from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<"individual" | "school_pro">("individual");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  
  // Authenticated State & Profile
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  // User & Organization Fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");

  // Mobile Money Payment Details
  const [operator, setOperator] = useState<"mtn" | "orange">("mtn");
  const [momoPhone, setMomoPhone] = useState("");
  const [momoAccountName, setMomoAccountName] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  // Fapshi portal checkout states
  const [confirming, setConfirming] = useState(false);
  const [paymentRef, setPaymentRef] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const planParam = params.get("plan");
      const cycleParam = params.get("cycle");
      
      if (planParam === "school_pro" || planParam === "school" || planParam === "org") {
        setPlan("school_pro");
      } else {
        setPlan("individual");
      }

      if (cycleParam === "yearly" || cycleParam === "annual") {
        setBillingCycle("yearly");
      } else {
        setBillingCycle("monthly");
      }

      // Check cached user in local storage immediately
      try {
        const cached = localStorage.getItem("judmi_user");
        if (cached) {
          const u = JSON.parse(cached);
          setIsLoggedIn(true);
          setCurrentUser(u);
          setName(u.name || "");
          setPhone(u.email || "");
          setMomoPhone(u.email || "");
          if (u.organizationName) setOrganizationName(u.organizationName);
        }
      } catch {}
    }

    fetchUserSession();

    // Auto-resume a payment in progress: either we were redirected back from
    // the Fapshi portal (?pay=...) or a pending payment is still in local
    // storage (link not aged out). Immediately start confirming so the user's
    // plan activates the moment the webhook confirms SUCCESSFUL.
    const paramsAtLoad = new URLSearchParams(window.location.search);
    const payParam = paramsAtLoad.get("pay");
    if (payParam) {
      localStorage.setItem("judmi_pending_payment", JSON.stringify({ paymentId: payParam, createdAt: Date.now() }));
      setPaymentRef(payParam);
      startPolling(payParam);
    } else {
      try {
        const pendingRaw = localStorage.getItem("judmi_pending_payment");
        if (pendingRaw) {
          const pending = JSON.parse(pendingRaw);
          if (pending?.paymentId && Date.now() - (pending.createdAt || 0) < 1000 * 60 * 120) {
            setPaymentRef(pending.paymentId);
            startPolling(pending.paymentId);
          } else {
            localStorage.removeItem("judmi_pending_payment");
          }
        }
      } catch {}
    }
  }, []);

  const startPolling = (paymentId: string) => {
    setConfirming(true);
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
          localStorage.removeItem("judmi_pending_payment");
          setConfirming(false);
          await refreshUser();
          setSuccess(true);
          setTimeout(() => {
            router.push(data.redirectTo || (plan === "school_pro" ? "/org/dashboard" : "/dashboard"));
          }, 1800);
          return;
        }
        if (data?.status === "FAILED" || data?.status === "EXPIRED") {
          localStorage.removeItem("judmi_pending_payment");
          setConfirming(false);
          setPaymentRef(null);
          setError(
            data?.status === "EXPIRED"
              ? "This payment link has expired. No money was taken — please start a new payment."
              : "Payment failed. No money was taken — please try again."
          );
          return;
        }
      } catch {}
      if (attempts < 72) {
        setTimeout(poll, 10000);
      } else {
        setConfirming(false);
        setError("We could not confirm your payment yet. If you already paid through Mobile Money, please refresh this page to re-check.");
      }
    };
    setTimeout(poll, 3000);
  };

  const refreshUser = async () => {
    try {
      const storedToken = typeof window !== "undefined" ? localStorage.getItem("judmi_session") || "" : "";
      const res = await fetch("/api/auth", {
        headers: storedToken ? { "x-session-token": storedToken } : {},
        credentials: "include",
      });
      const data = await res.json();
      if (data?.user) {
        setIsLoggedIn(true);
        setCurrentUser(data.user);
        if (typeof window !== "undefined") {
          if (data.token) localStorage.setItem("judmi_session", data.token);
          localStorage.setItem("judmi_user", JSON.stringify(data.user));
        }
      }
    } catch {}
  };

  const fetchUserSession = async () => {
    try {
      const storedToken = typeof window !== "undefined" ? localStorage.getItem("judmi_session") || "" : "";
      const headers: Record<string, string> = {};
      if (storedToken) headers["x-session-token"] = storedToken;

      const res = await fetch("/api/auth", {
        headers,
        credentials: "include",
      });
      const data = await res.json();
      if (data?.user) {
        setIsLoggedIn(true);
        setCurrentUser(data.user);
        setName(data.user.name || "");
        setPhone(data.user.email || "");
        setMomoPhone(data.user.email || "");
        if (data.user.organizationName) setOrganizationName(data.user.organizationName);
        if (typeof window !== "undefined") {
          if (data.token) localStorage.setItem("judmi_session", data.token);
          localStorage.setItem("judmi_user", JSON.stringify(data.user));
        }
      }
    } catch {
      // Keep cached state
    }
  };

  const planDetails = {
    individual: {
      title: "Solo Teacher Plan",
      subtitle: "For independent tutors and solo teachers",
      priceLocal: billingCycle === "monthly" ? "5,000 FCFA" : "36,000 FCFA",
      periodLabel: billingCycle === "monthly" ? "/ month" : "/ year (Save 40%)",
      role: "teacher",
      features: [
        "Unlimited AI Exam Generation from Notes",
        "AI Mark Scripts (MCQs & Handwritten Essays)",
        "Twin Grid Multi-Page Camera OCR (up to 5 pages)",
        "Anti-cheating randomized question pools",
        "Official PDF Academic Transcripts & Gradebooks",
      ],
    },
    school_pro: {
      title: "School / Organization Pro Plan",
      subtitle: "For schools, faculties, and institutions",
      priceLocal: billingCycle === "monthly" ? "25,000 FCFA" : "236,000 FCFA",
      periodLabel: billingCycle === "monthly" ? "/ month" : "/ year (Save 64,000 FCFA)",
      role: "org_admin",
      features: [
        "50 Sub-Accounts for Faculty Teachers & Students",
        "Centralized Sub-Account Manager & School Invite Code",
        "Expand extra seats anytime (from 1,500 FCFA/member)",
        "Admin Password Reset Request Approvals",
        "School-wide Academic Performance Transcripts",
        "Camera Script Snapper & Batch AI Marking",
      ],
    },
  };

  const currentPlan = planDetails[plan];

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // If new user registering, validate passwords
    if (!isLoggedIn) {
      if (password !== confirmPassword) {
        setError("Passwords do not match. Please retype your password correctly.");
        return;
      }

      if (password.length < 6) {
        setError("Password must be at least 6 characters long.");
        return;
      }
    }

    setLoading(true);

    try {
      let sessionToken = typeof window !== "undefined" ? localStorage.getItem("judmi_session") || "" : "";

      // Guest? Create the free account first (paywall accounts never receive a
      // plan — access is granted only after Fapshi confirms payment).
      if (!isLoggedIn) {
        const signupRes = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            action: "signup",
            name,
            phone,
            email: phone,
            password,
            role: "teacher",
            paywall: true,
          }),
        });
        const signupData = await signupRes.json();
        if (!signupRes.ok || !signupData?.success) {
          setError(signupData?.error || "Could not create your account. Please try again.");
          setLoading(false);
          return;
        }
        if (signupData.token) sessionToken = signupData.token;
        if (typeof window !== "undefined") {
          if (sessionToken) localStorage.setItem("judmi_session", sessionToken);
          if (signupData.user) localStorage.setItem("judmi_user", JSON.stringify(signupData.user));
        }
        setIsLoggedIn(true);
        setCurrentUser(signupData.user);
      }

      // Start a real Fapshi payment. No plan is granted here.
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (sessionToken) headers["x-session-token"] = sessionToken;

      const initiateRes = await fetch("/api/payments/initiate", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          plan,
          cycle: billingCycle,
          organizationName: plan === "school_pro" ? organizationName : undefined,
        }),
      });
      const initiateData = await initiateRes.json();
      if (!initiateRes.ok || !initiateData?.success) {
        setError(initiateData?.error || "Could not start the payment. Please try again.");
        setLoading(false);
        return;
      }

      // Remember the pending payment so we can resume after the portal
      // redirects back (or if the user returns later).
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "judmi_pending_payment",
          JSON.stringify({ paymentId: initiateData.paymentId, transId: initiateData.transId, createdAt: Date.now() })
        );
      }
      setPaymentRef(initiateData.paymentId);
      setLoading(false);

      // Send the user to Fapshi's secure checkout (MTN MoMo / Orange Money).
      window.location.href = initiateData.link;
    } catch (err: any) {
      setError(err.message || "Payment setup failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      {/* Back Link */}
      <Link
        href="/pricing"
        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Plans & Pricing
      </Link>

      {/* Title */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 text-xs font-bold uppercase tracking-wider">
          <Smartphone className="w-3.5 h-3.5" />
          <span>Mobile Money Payment (MTN MoMo & Orange Money)</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Judmi Academy Subscription Checkout
        </h1>
        <p className="text-xs text-slate-500">
          Subscribe instantly via Mobile Money to unlock unlimited AI exams, camera script scanning, and school sub-accounts.
        </p>
      </div>

      {/* Plan & Cycle Selectors */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Plan Selector */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100/90 rounded-2xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setPlan("individual")}
            className={`px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${
              plan === "individual"
                ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Solo Teacher</span>
          </button>

          <button
            type="button"
            onClick={() => setPlan("school_pro")}
            className={`px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${
              plan === "school_pro"
                ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>School / Org</span>
          </button>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100/90 rounded-2xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              billingCycle === "monthly"
                ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("yearly")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              billingCycle === "yearly"
                ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Yearly</span>
            <span className="px-1 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] rounded-full font-extrabold">
              -40%
            </span>
          </button>
        </div>
      </div>

      {/* Main Grid: Form & Order Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left 2 Cols: Account & Payment Info Form */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl shadow-slate-200/50 space-y-6">
          
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="text-center py-10 space-y-3 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Payment Confirmed!</h3>
              <p className="text-xs text-slate-500">
                Your Judmi Academy {plan === "school_pro" ? "School" : "Pro"} subscription is now active. Redirecting to your dashboard...
              </p>
            </div>
          ) : confirming ? (
            <div className="text-center py-12 space-y-3 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Confirming your payment...</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Your Mobile Money payment is being verified via Fapshi. This usually takes under a minute. Keep this page open — your plan activates automatically.
              </p>
            </div>
          ) : (
            <form onSubmit={handleCheckout} className="space-y-5">
              
              {/* Account Details Header */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    1. Account & Subscription Profile
                  </h3>
                  {isLoggedIn && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Logged In User
                    </span>
                  )}
                </div>

                {/* If Logged In: Show Clean Profile Card with no password inputs */}
                {isLoggedIn ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                          {(name || "U")[0]}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">{name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{phone}</div>
                        </div>
                      </div>

                      <span className="text-[11px] text-slate-400">
                        {currentUser?.role === "org_admin" ? "School Admin" : "Teacher Account"}
                      </span>
                    </div>

                    {plan === "school_pro" && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          School / Institution Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={organizationName}
                          onChange={(e) => setOrganizationName(e.target.value)}
                          placeholder="e.g. St. Jude International Academy"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  /* New Guest User Registration Fields */
                  <div className="space-y-4">
                    {plan === "school_pro" && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          School / Institution Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={organizationName}
                          onChange={(e) => setOrganizationName(e.target.value)}
                          placeholder="e.g. St. Jude International Academy"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          {plan === "school_pro" ? "Administrator Name" : "Teacher Full Name"} <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Eleanor Vance"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Account Phone Number <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="e.g. 670000000 or +237..."
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Create Account Password <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Retype Password <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Retype password"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Secure Payment (Fapshi powered) */}
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
                  <span>2. Secure Payment</span>
                  <span className="text-[11px] font-normal text-amber-700 font-semibold flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5" /> MTN MoMo & Orange Money
                  </span>
                </h3>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2">
                  <Smartphone className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Fapshi Secure Checkout: </span>
                    <span>
                      When you click Pay, you will be redirected to our secure Fapshi payment page, where you complete the payment
                      with MTN Mobile Money or Orange Money. Your plan activates automatically the moment the payment is confirmed.
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={
                    loading ||
                    (!isLoggedIn && (!name || !phone || !password || !confirmPassword)) ||
                    (plan === "school_pro" && !organizationName)
                  }
                  className="w-full py-4 rounded-2xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-amber-600/25 transition-all flex items-center justify-center gap-2"
                >
                  <span>{loading ? "Preparing Secure Checkout..." : `Pay ${currentPlan.priceLocal} — Continue to Fapshi Checkout`}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </form>
          )}

        </div>

        {/* Right 1 Col: Order Summary Card */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-5">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Judmi Academy Subscription
            </span>
            <h3 className="text-xl font-bold text-white mt-1">
              {currentPlan.title}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {currentPlan.subtitle}
            </p>
          </div>

          <div className="py-4 border-y border-slate-800 space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-400">Subscription Total:</span>
              <span className="text-2xl font-extrabold text-white">
                {currentPlan.priceLocal}
              </span>
            </div>
            <div className="text-[11px] text-amber-400 font-semibold">
              {currentPlan.periodLabel}
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-300 block">Included Features:</span>
            <ul className="space-y-2 text-xs text-slate-300">
              {currentPlan.features.map((feat, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Secure activation via MTN & Orange Mobile Money — powered by Fapshi.</span>
          </div>
        </div>

      </div>

    </div>
  );
}
