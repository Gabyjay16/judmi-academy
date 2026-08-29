"use client";

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
  Smartphone
} from "lucide-react";

export default function PricingPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10 sm:space-y-12">
      
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Judmi Academy • Mobile Money Plans (Fabshi Gateway)</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Pricing for Educators & Schools
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          Independent tutors pay via Mobile Money (MTN, Orange, MoMo, Airtel), and schools manage 100+ teacher & student sub-accounts with centralized controls.
        </p>

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
              0 XAF <span className="text-xs font-normal text-slate-500">/ forever ($0)</span>
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
            <span>Mobile Money (Fabshi)</span>
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Solo Educator Plan</span>
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-1">Individual Teacher</h3>
              <p className="text-xs text-slate-500 mt-1">
                For independent tutors and personal educators giving their own exams.
              </p>
            </div>

            <div className="text-3xl font-extrabold text-slate-900">
              10,000 XAF <span className="text-xs font-normal text-slate-500">/ month ($15)</span>
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
            href="/checkout?plan=individual"
            className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs text-center shadow-md shadow-amber-500/20 transition-all block"
          >
            Pay via Mobile Money (~10,000 XAF)
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
              <h3 className="text-xl font-bold text-white mt-1">School & Organization</h3>
              <p className="text-xs text-slate-400 mt-1">
                For schools managing faculty teachers and enrolled student sub-accounts.
              </p>
            </div>

            <div className="text-3xl font-extrabold text-white">
              65,000 XAF <span className="text-xs font-normal text-slate-400">/ month ($99)</span>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-300 pt-3 border-t border-slate-800">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>100 Sub-Accounts</strong> (Teachers + Students)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Centralized Sub-Account Manager & Seat Allocator</span>
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
                <span>Camera Script Snapper & Batch OCR</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Priority Google Gemini AI Vision Capacity</span>
              </li>
            </ul>
          </div>

          <Link
            href="/checkout?plan=school_pro"
            className="w-full py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs text-center transition-colors block"
          >
            Register School (~65,000 XAF)
          </Link>
        </div>

      </div>

      {/* FAQ Section */}
      <div className="bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-200/80 space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-indigo-600" />
          <span>Mobile Money & Sub-Accounts FAQ</span>
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600 leading-relaxed">
          <div className="p-4 bg-white rounded-2xl border border-slate-200/60 space-y-1">
            <h4 className="font-bold text-slate-800">How do I pay with Mobile Money?</h4>
            <p>
              When you proceed to checkout, enter your phone number. You will receive an instant Mobile Money prompt (USSD) on your phone to validate your PIN via Fabshi.
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
