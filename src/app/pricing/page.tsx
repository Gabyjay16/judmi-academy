"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Sparkles, 
  Check, 
  Building2, 
  BookOpen, 
  ShieldCheck, 
  ArrowRight, 
  Zap,
  HelpCircle,
  GraduationCap,
  Smartphone,
  Users
} from "lucide-react";

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10 sm:space-y-12">
      
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Judmi Academy • Mobile Money Plans</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Pricing for Educators & Schools
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          Instant activation via Mobile Money (MTN MoMo & Orange Money). Choose monthly flexibility or save with yearly subscriptions.
        </p>

        {/* Billing Cycle Toggle */}
        <div className="flex items-center justify-center pt-2">
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                billingCycle === "monthly"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                billingCycle === "yearly"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Yearly (Discounted)</span>
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                SAVE 40%
              </span>
            </button>
          </div>
        </div>

        {/* Student Notice Banner */}
        <div className="inline-flex items-center gap-2 p-2 px-4 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-700 font-medium mt-2">
          <GraduationCap className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            Are you a student? Students take exams for free using an exam code or free student account.{" "}
            <Link href="/student/dashboard" className="text-indigo-700 font-bold hover:underline">
              Go to Student Portal →
            </Link>
          </span>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
        
        {/* Tier 1: Free Trial / Starter */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Trial Tier
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-1">Starter Free</h3>
              <p className="text-xs text-slate-500 mt-1">
                Explore AI question generation and paper scanning with zero upfront cost.
              </p>
            </div>

            <div className="text-3xl font-extrabold text-slate-900">
              0 FCFA <span className="text-xs font-normal text-slate-500">/ forever</span>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-700 pt-3 border-t border-slate-100">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>3 AI Exam Generations from notes</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>3 Camera Paper Script Scans</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>2 AI Essay Gradings with rubrics</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Up to 15 student submissions / exam</span>
              </li>
            </ul>
          </div>

          <Link
            href="/signup?role=teacher"
            className="w-full py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs text-center transition-colors block"
          >
            Get Started Free
          </Link>
        </div>

        {/* Tier 2: Individual Teacher Pro */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-amber-500 shadow-xl shadow-amber-100/50 flex flex-col justify-between space-y-6 relative">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[11px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1">
            <Smartphone className="w-3 h-3" />
            <span>Mobile Money</span>
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Solo Educator Plan</span>
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-1">Solo Teacher</h3>
              <p className="text-xs text-slate-500 mt-1">
                For independent tutors and personal educators creating their own exams.
              </p>
            </div>

            <div>
              <div className="text-3xl font-extrabold text-slate-900">
                {billingCycle === "monthly" ? "5,000 FCFA" : "36,000 FCFA"}
                <span className="text-xs font-normal text-slate-500">
                  {billingCycle === "monthly" ? " / month" : " / year"}
                </span>
              </div>
              {billingCycle === "yearly" && (
                <p className="text-[11px] font-bold text-emerald-600 mt-1">
                  Just 3,000 FCFA/mo (Save 40% vs monthly)
                </p>
              )}
            </div>

            <ul className="space-y-2.5 text-xs text-slate-700 pt-3 border-t border-slate-100">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>Unlimited</strong> AI Exam Generation from Notes</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>Unlimited</strong> AI Mark Scripts (MCQs & Essays)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Twin-grid multi-page handwriting OCR</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Shuffled / Anti-cheating unique question pools</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Custom timers & retake permissions</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Class analytics & PDF grade exports</span>
              </li>
            </ul>
          </div>

          <Link
            href={`/checkout?plan=individual&cycle=${billingCycle}`}
            className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs text-center shadow-md shadow-amber-500/20 transition-all block"
          >
            Pay {billingCycle === "monthly" ? "5,000 FCFA" : "36,000 FCFA"} via Mobile Money
          </Link>
        </div>

        {/* Tier 3: School & Organization */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                <span>Institutional Tier</span>
              </span>
              <h3 className="text-xl font-bold text-white mt-1">School / Organization</h3>
              <p className="text-xs text-slate-400 mt-1">
                For schools managing faculty teachers and enrolled student sub-accounts.
              </p>
            </div>

            <div>
              <div className="text-3xl font-extrabold text-white">
                {billingCycle === "monthly" ? "25,000 FCFA" : "236,000 FCFA"}
                <span className="text-xs font-normal text-slate-400">
                  {billingCycle === "monthly" ? " / month" : " / year"}
                </span>
              </div>
              {billingCycle === "yearly" && (
                <p className="text-[11px] font-bold text-amber-400 mt-1">
                  Save 64,000 FCFA with annual subscription
                </p>
              )}
            </div>

            <ul className="space-y-2.5 text-xs text-slate-300 pt-3 border-t border-slate-800">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>50 Sub-Accounts Included</strong> (Teachers + Students)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Centralized Sub-Account Manager & School Invite Code</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Add extra seats anytime (from 1,500 FCFA/member)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Admin Password Reset Approvals</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>School-wide Academic Performance Transcripts</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Camera Script Snapper & Batch AI Marking</span>
              </li>
            </ul>
          </div>

          <Link
            href={`/checkout?plan=school_pro&cycle=${billingCycle}`}
            className="w-full py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs text-center transition-colors block"
          >
            Pay {billingCycle === "monthly" ? "25,000 FCFA" : "236,000 FCFA"} via Mobile Money
          </Link>
        </div>

      </div>

      {/* Seat Expansion Info Card */}
      <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-3xl p-6 sm:p-8 border border-indigo-100 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-bold uppercase tracking-wider">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>Flexible Member Seat Scaling</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Need to add more teachers or students to your school?
            </h3>
            <p className="text-xs text-slate-600">
              Schools can expand their member seats at any time directly from the School Dashboard:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-white border border-indigo-100 text-xs text-slate-800">
            <span className="font-bold text-indigo-700 block text-sm">2,000 FCFA / member</span>
            <span className="text-slate-500">For 1 to 9 additional member seats</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-white border border-indigo-100 text-xs text-slate-800">
            <span className="font-bold text-emerald-700 block text-sm">1,500 FCFA / member</span>
            <span className="text-slate-500">Discounted rate for 10 or more member seats</span>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-200/80 space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-indigo-600" />
          <span>Mobile Money (MTN MoMo & Orange Money) FAQ</span>
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600 leading-relaxed">
          <div className="p-4 bg-white rounded-2xl border border-slate-200/60 space-y-1">
            <h4 className="font-bold text-slate-800">How do I pay with Mobile Money?</h4>
            <p>
              When you click Pay, enter your MTN or Orange Mobile Money phone number. You will receive an instant USSD prompt on your phone. Enter your Mobile Money PIN to complete the transaction.
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200/60 space-y-1">
            <h4 className="font-bold text-slate-800">Can an Admin grant access directly?</h4>
            <p>
              Yes! School administrators and Super Admins can also grant full Pro access or reset quotas directly from the Judmi Academy Admin Panel.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
