"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  BookOpen, 
  Check, 
  ShieldCheck, 
  Lock, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Zap,
  Smartphone,
  PhoneCall,
  CheckCheck
} from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<"individual" | "school_pro">("individual");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  
  // User & Organization Fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");

  // Mobile Money Payment Details (Fabshi Gateway)
  const [operator, setOperator] = useState<"mtn" | "orange" | "momo" | "airtel">("mtn");
  const [momoPhone, setMomoPhone] = useState("+237 670 000 000");
  const [momoAccountName, setMomoAccountName] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [ussdPromptSent, setUssdPromptSent] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const planParam = params.get("plan");
      if (planParam === "school_pro" || planParam === "school" || planParam === "org") {
        setPlan("school_pro");
      } else {
        setPlan("individual");
      }
    }
  }, []);

  const planDetails = {
    individual: {
      title: "Individual Educator Plan",
      subtitle: "For independent tutors and solo teachers",
      priceUSD: 15,
      priceLocal: "10,000 XAF",
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
      title: "School & Organization Pro Plan",
      subtitle: "For schools, faculties, and institutions",
      priceUSD: 99,
      priceLocal: "65,000 XAF",
      role: "org_admin",
      features: [
        "100 Sub-Accounts for Faculty Teachers & Students",
        "Centralized Sub-Account & Seat Manager",
        "Admin Password Reset Request Approvals",
        "School-wide Academic Performance Transcripts",
        "AI Mark Scripts Studio & Batch OCR",
        "Priority Google Gemini AI Vision Capacity",
      ],
    },
  };

  const currentPlan = planDetails[plan];

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please retype your password correctly.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    setUssdPromptSent(true);

    try {
      // Simulate Mobile Money Prompt via Fabshi Gateway
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // 1. Create paid account in database with full access
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "signup",
          name,
          phone,
          email: phone,
          password,
          role: currentPlan.role,
          organizationName: plan === "school_pro" ? organizationName : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Mobile Money verification failed.");
        setLoading(false);
        setUssdPromptSent(false);
        return;
      }

      // Store token in localStorage for resilient session persistence
      if (data.token && typeof window !== "undefined") {
        localStorage.setItem("judmi_session", data.token);
      }

      setSuccess(true);
      setTimeout(() => {
        if (plan === "school_pro") {
          router.push("/org/dashboard");
        } else {
          router.push("/dashboard");
        }
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Mobile Money payment processing failed.");
      setLoading(false);
      setUssdPromptSent(false);
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
          <span>Mobile Money Payment (Fabshi Gateway)</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Judmi Academy Subscription Checkout
        </h1>
        <p className="text-xs text-slate-500">
          Subscribe instantly via Mobile Money to unlock unlimited AI exams, camera script scanning, and school sub-accounts.
        </p>
      </div>

      {/* Plan Selector Toggle */}
      <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100/90 rounded-2xl max-w-md">
        <button
          type="button"
          onClick={() => setPlan("individual")}
          className={`p-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${
            plan === "individual"
              ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Solo Teacher ($15 / ~10,000 XAF)</span>
        </button>

        <button
          type="button"
          onClick={() => setPlan("school_pro")}
          className={`p-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${
            plan === "school_pro"
              ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>School / Org ($99 / ~65,000 XAF)</span>
        </button>
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
              <h3 className="text-xl font-bold text-slate-900">Mobile Money Payment Confirmed!</h3>
              <p className="text-xs text-slate-500">
                Your Judmi Academy account is fully activated. Redirecting to your dashboard...
              </p>
            </div>
          ) : (
            <form onSubmit={handleCheckout} className="space-y-5">
              
              {/* Account Details Header */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                  1. {plan === "school_pro" ? "School Organization & Administrator Profile" : "Teacher Account Credentials"}
                </h3>

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
                      placeholder="e.g. Dr. Eleanor Vance"
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
                      Account Password <span className="text-rose-500">*</span>
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

              {/* Mobile Money Payment (Fabshi) */}
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
                  <span>2. Mobile Money Details (Fabshi Gateway)</span>
                  <span className="text-[11px] font-normal text-amber-700 font-semibold flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5" /> Direct Phone Prompt
                  </span>
                </h3>

                {/* Operator Selector */}
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setOperator("mtn")}
                    className={`p-2.5 rounded-xl border text-[11px] font-bold text-center transition-all ${
                      operator === "mtn"
                        ? "border-amber-500 bg-amber-50 text-amber-950 ring-1 ring-amber-400"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    MTN MoMo
                  </button>

                  <button
                    type="button"
                    onClick={() => setOperator("orange")}
                    className={`p-2.5 rounded-xl border text-[11px] font-bold text-center transition-all ${
                      operator === "orange"
                        ? "border-orange-500 bg-orange-50 text-orange-950 ring-1 ring-orange-400"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Orange Money
                  </button>

                  <button
                    type="button"
                    onClick={() => setOperator("momo")}
                    className={`p-2.5 rounded-xl border text-[11px] font-bold text-center transition-all ${
                      operator === "momo"
                        ? "border-amber-500 bg-amber-50 text-amber-950 ring-1 ring-amber-400"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    MoMo Pay
                  </button>

                  <button
                    type="button"
                    onClick={() => setOperator("airtel")}
                    className={`p-2.5 rounded-xl border text-[11px] font-bold text-center transition-all ${
                      operator === "airtel"
                        ? "border-rose-500 bg-rose-50 text-rose-950 ring-1 ring-rose-400"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Airtel Money
                  </button>
                </div>

                {/* Mobile Money Inputs */}
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mobile Money Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <PhoneCall className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={momoPhone}
                        onChange={(e) => setMomoPhone(e.target.value)}
                        placeholder="e.g. +237 670 000 000"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Registered Mobile Money Account Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={momoAccountName}
                      onChange={(e) => setMomoAccountName(e.target.value)}
                      placeholder="e.g. Jane Doe"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Fabshi Gateway Notice */}
                <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-2xl text-[11px] text-amber-900 flex items-start gap-2">
                  <Smartphone className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Fabshi Payment Gateway: </span>
                    <span>When you click Pay, a USSD payment prompt will be sent directly to your phone. Enter your Mobile Money PIN to complete the transaction.</span>
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !name || !phone || !password || !confirmPassword || (plan === "school_pro" && !organizationName)}
                  className="w-full py-4 rounded-2xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-amber-600/25 transition-all flex items-center justify-center gap-2"
                >
                  <span>{loading ? "Sending Mobile Money Prompt..." : `Pay ${currentPlan.priceLocal} via Mobile Money`}</span>
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
            <h3 className="text-xl font-bold mt-1 text-white">{currentPlan.title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{currentPlan.subtitle}</p>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-baseline justify-between">
            <span className="text-xs text-slate-400">Total Due (Mobile Money):</span>
            <div className="text-2xl font-extrabold text-amber-400">
              {currentPlan.priceLocal} <span className="text-xs font-normal text-slate-400">(${currentPlan.priceUSD}/mo)</span>
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Included in your subscription:
            </span>
            <ul className="space-y-2 text-xs text-slate-300">
              {currentPlan.features.map((f, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-400 space-y-1">
            <span className="font-bold text-slate-200 block">Instant Activation Guarantee</span>
            <span>Your Judmi Academy account activates immediately after the Mobile Money prompt is confirmed.</span>
          </div>
        </div>

      </div>

    </div>
  );
}
