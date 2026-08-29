"use client";

import Link from "next/link";
import { 
  Sparkles, 
  Check, 
  Zap, 
  Crown, 
  X, 
  ArrowRight, 
  BookOpen, 
  Camera, 
  ShieldCheck,
  Building2,
  Smartphone
} from "lucide-react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  feature?: "examGenerations" | "scriptScans" | "essayGradings" | "general";
  usedCount?: number;
  limitCount?: number;
}

export function UpgradeModal({
  isOpen,
  onClose,
  title = "Upgrade to Pro for Full Access",
  feature = "general",
  usedCount = 3,
  limitCount = 3,
}: UpgradeModalProps) {
  if (!isOpen) return null;

  const featureCopy = {
    examGenerations: {
      tag: "Exam Generation Limit Reached",
      desc: `You have used all ${limitCount} free AI exam generations on the Free Starter Plan. Upgrade to create unlimited exams and question banks.`,
    },
    scriptScans: {
      tag: "Camera Paper Scan Limit Reached",
      desc: `You have reached your free limit of ${limitCount} student paper scans. Upgrade to scan unlimited handwritten scripts and essays.`,
    },
    essayGradings: {
      tag: "AI Essay Marking Limit Reached",
      desc: `You have used your ${limitCount} free AI essay evaluations. Upgrade for unlimited grading and detailed rubric breakdowns.`,
    },
    general: {
      tag: "Unlock Full Platform Access",
      desc: "Upgrade your educator account to access unlimited AI generations, camera paper scanning, and anti-cheating question pools.",
    },
  };

  const copy = featureCopy[feature] || featureCopy.general;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-6 relative overflow-hidden">
        
        {/* Top Decorative Gradient */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Title */}
        <div className="space-y-2 text-center pt-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center mx-auto shadow-md shadow-indigo-500/25">
            <Crown className="w-7 h-7" />
          </div>

          <div className="inline-block px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold uppercase tracking-wider">
            {copy.tag}
          </div>

          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {title}
          </h3>

          <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
            {copy.desc}
          </p>
        </div>

        {/* Pro Plan Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border-2 border-amber-300 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-600 fill-amber-600" />
              <span>Solo Teacher Pro (Mobile Money)</span>
            </span>
            <div className="text-lg font-extrabold text-amber-900">
              5,000 FCFA <span className="text-xs font-normal text-slate-500">/ mo</span>
            </div>
          </div>

          <ul className="space-y-1.5 text-xs text-slate-700">
            <li className="flex items-center gap-2 font-medium">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span><strong>Unlimited</strong> AI Exam Creation from Notes</span>
            </li>
            <li className="flex items-center gap-2 font-medium">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span><strong>Unlimited</strong> AI Mark Scripts & Handwritten OCR</span>
            </li>
            <li className="flex items-center gap-2 font-medium">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Anti-Cheating Shuffled Pools & Unlimited Students</span>
            </li>
            <li className="flex items-center gap-2 font-medium">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Official PDF Gradebooks & Exportable Analytics</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          <Link
            href="/checkout?plan=individual"
            className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2"
          >
            <span>Pay 5,000 FCFA via Mobile Money</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <div className="flex items-center justify-between text-xs pt-1 px-1">
            <Link
              href="/checkout?plan=school_pro"
              className="text-slate-600 hover:text-indigo-600 font-semibold inline-flex items-center gap-1"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>School Plan (25,000 FCFA/mo) →</span>
            </Link>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
            >
              Maybe Later
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
export { UpgradeModal as default };
