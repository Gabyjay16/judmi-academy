import Link from "next/link";
import { 
  Sparkles, 
  BookOpen, 
  Camera, 
  GraduationCap, 
  Building2, 
  CheckCircle2, 
  ArrowRight, 
  FileText, 
  ShieldCheck, 
  Zap,
  Timer,
  Download,
  Users,
  Smartphone
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col justify-between space-y-12 sm:space-y-16 pb-16">
      
      {/* Hero Section */}
      <section className="pt-6 sm:pt-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center space-y-6">
        
        {/* Mobile Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold tracking-wide shadow-xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Judmi Academy • Mobile AI Assessment & Academic Engine</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
          Welcome to <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Judmi Academy
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          The premier AI assessment hub for schools, tutors, and students. Generate exams from lecture notes, snap physical paper scripts with your camera for instant grading, and manage school sub-accounts with Mobile Money (MTN & Orange).
        </p>

        {/* Mobile-First Primary Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 max-w-md mx-auto sm:max-w-none">
          <Link
            href="/login"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
          >
            <span>Sign In to Judmi Academy</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/signup"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm border border-slate-200 shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            <span>Create New Account</span>
          </Link>
        </div>

        {/* Role Quick Links */}
        <div className="grid grid-cols-3 gap-2.5 max-w-md mx-auto pt-4 text-center">
          <Link
            href="/login"
            className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 hover:bg-indigo-100/70 transition-colors flex flex-col items-center gap-1 text-slate-800"
          >
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold">Students</span>
            <span className="text-[10px] text-slate-500">Take Tests & PDF</span>
          </Link>

          <Link
            href="/login"
            className="p-3 rounded-2xl bg-purple-50/70 border border-purple-100 hover:bg-purple-100/70 transition-colors flex flex-col items-center gap-1 text-slate-800"
          >
            <BookOpen className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-bold">Teachers</span>
            <span className="text-[10px] text-slate-500">Create & Grade</span>
          </Link>

          <Link
            href="/pricing"
            className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100 hover:bg-emerald-100/70 transition-colors flex flex-col items-center gap-1 text-slate-800"
          >
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold">Schools / Orgs</span>
            <span className="text-[10px] text-slate-500">Sub-Accounts</span>
          </Link>
        </div>

        {/* Discreet Admin / Staff login link */}
        <div className="pt-1">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Admin / Staff Portal
          </Link>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Engineered for Modern Classrooms
          </h2>
          <p className="text-xs text-slate-500">
            Everything educators, tutors, and institutions need in one lightweight interface.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Card 1: Camera Script Snapper */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Mark Scripts (MCQs & Essays)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Snap photo of your marking guide, then snap student written papers (up to 5 pages per student with twin grid). Gemini Vision reads handwriting and grades instantly.
            </p>
          </div>

          {/* Card 2: Note-to-Exam Generator */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">AI Exam Generator</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Upload teaching notes or syllabus PDFs. The AI generates complete MCQs with distractors, correct answers, and educational explanations.
            </p>
          </div>

          {/* Card 3: Downloadable PDF Transcripts */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Official PDF Transcripts</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Students can download certified Judmi Academy academic transcripts. Teachers can download unified class gradebook results in 1 click.
            </p>
          </div>

          {/* Card 4: Anti-Cheating Shuffled Pools */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Personalized Question Pools</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Generate large question banks where each student receives a unique randomized subset of questions so no two candidates see the same exam.
            </p>
          </div>

          {/* Card 5: Mobile Money Integration */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Mobile Money (MTN MoMo & Orange)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Convenient subscription checkout via MTN Mobile Money and Orange Money with instant prompt confirmation directly on your phone.
            </p>
          </div>

          {/* Card 6: School Sub-Accounts */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Institutional Sub-Accounts</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Schools manage teacher and student sub-accounts under one organization, with admin-approved password resets and central seat allocation.
            </p>
          </div>

        </div>
      </section>

      {/* Mobile-Friendly Call to Action */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center">
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl space-y-5">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Ready to experience Judmi Academy?
          </h2>
          <p className="text-xs sm:text-sm text-indigo-200 max-w-md mx-auto">
            Log in to your student or teacher portal to take assessments or start scanning scripts today.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white text-indigo-900 font-bold text-xs shadow-md hover:bg-indigo-50 transition-colors"
            >
              <span>Access Your Judmi Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
