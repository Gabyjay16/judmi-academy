"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  GraduationCap, 
  BookOpen, 
  Timer, 
  CheckCircle2, 
  XCircle, 
  Award, 
  History, 
  Play, 
  ArrowRight, 
  ExternalLink, 
  KeyRound, 
  FileCheck2,
  TrendingUp,
  Clock,
  Sparkles,
  Download,
  MessageSquare,
  AlertCircle,
  Upload,
  FileText,
  Building2,
  Check,
  Send,
  HelpCircle,
  Network,
  ShieldCheck
} from "lucide-react";
import { formatTime } from "@/lib/utils";
import { exportStudentTranscriptPDF } from "@/lib/pdf-export";

export default function StudentDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"exams" | "complaints">("exams");
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [examCode, setExamCode] = useState("");

  // Complaints State
  const [complaintsData, setComplaintsData] = useState<any | null>(null);
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [complaintError, setComplaintError] = useState<string | null>(null);
  const [complaintSuccess, setComplaintSuccess] = useState<string | null>(null);

  // Complaint Form Fields
  const [departmentId, setDepartmentId] = useState("");
  const [studentLevel, setStudentLevel] = useState("Year 1");
  const [courseCode, setCourseCode] = useState("");
  const [nature, setNature] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState<string | null>(null);

  // Read user's org branding (name/logo/color) from the persistent session.
  const [branding, setBranding] = useState<any | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("judmi_user");
      if (!raw) return null;
      const u = JSON.parse(raw);
      return u?.branding || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    fetchHistory();
    fetchComplaints();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/student/history");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error("Failed to load student history:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchComplaints = async () => {
    try {
      setComplaintsLoading(true);
      const res = await fetch("/api/complaints");
      const json = await res.json();
      setComplaintsData(json);
      if (json?.formConfig?.levels && json.formConfig.levels.length > 0) {
        setStudentLevel(json.formConfig.levels[0]);
      }
      if (json?.formConfig?.categories && json.formConfig.categories.length > 0) {
        setNature(json.formConfig.categories[0]);
      }
    } catch (e) {
      console.error("Failed to load complaints:", e);
    } finally {
      setComplaintsLoading(false);
    }
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (examCode.trim()) {
      router.push(`/test/${examCode.trim().toUpperCase()}`);
    }
  };

  const handleDownloadPDF = () => {
    if (!data) return;
    exportStudentTranscriptPDF({
      student: data.student,
      stats: data.stats,
      history: data.history,
    });
  };

  // Handle document file upload (convert to Base64 data URL)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit. Please upload a smaller image or PDF document.");
      return;
    }

    setDocumentName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setDocumentUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setComplaintError(null);
    setComplaintSuccess(null);
    setSubmittingComplaint(true);

    try {
      const selectedDept = complaintsData?.departments?.find((d: any) => d.id === departmentId);

      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentLevel,
          courseCode: courseCode.trim() || undefined,
          departmentId: departmentId || undefined,
          departmentName: selectedDept ? selectedDept.name : undefined,
          nature,
          subject,
          description,
          documentUrl,
          documentName,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        setComplaintError(resData.error || "Failed to submit complaint.");
        setSubmittingComplaint(false);
        return;
      }

      setComplaintSuccess("Your complaint has been successfully submitted to your school administration.");
      setSubject("");
      setDescription("");
      setCourseCode("");
      setDocumentUrl(null);
      setDocumentName(null);
      setShowComplaintModal(false);
      fetchComplaints();
    } catch (err: any) {
      setComplaintError(err.message || "Failed to submit complaint.");
    } finally {
      setSubmittingComplaint(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-slate-500 space-y-3">
        <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold">Loading student portal & examination transcripts...</p>
      </div>
    );
  }

  const student = data?.student || { name: "Student", studentId: "" };
  const stats = data?.stats || { totalTaken: 0, avgPercentage: 0, passRate: 0, highestScore: 0 };
  const history = data?.history || [];
  const availableExams = data?.availableExams || [];
  const complaintsList = complaintsData?.complaints || [];
  const formAvailable = complaintsData?.formAvailable === true;
  const formConfig = complaintsData?.formConfig;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      
      {/* Mobile-First Primary Hero & Exam Code Bar */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-5 sm:p-8 text-white shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            {branding?.brandName ? (
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "#e0e7ff" }}>
                {branding.logoData ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={branding.logoData} alt={branding.brandName} className="w-4 h-4 object-contain bg-white rounded" />
                ) : (
                  <Building2 className="w-3.5 h-3.5" />
                )}
                <span>{branding.brandName} · School Portal</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                <GraduationCap className="w-4 h-4" />
                <span>Student Examination & Academic Hub</span>
              </div>
            )}
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {student.name}
            </h1>
            <p className="text-xs text-indigo-200">
              {student.studentId ? `Student Matricule: ${student.studentId} • ` : ""}
              {student.email}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleDownloadPDF}
              disabled={history.length === 0}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold text-xs shadow-xs transition-colors"
            >
              <Download className="w-4 h-4 text-indigo-200" />
              <span>Download Transcript</span>
            </button>
          </div>
        </div>

        {/* PROMINENT MOBILE EXAM CODE BAR */}
        <div className="bg-white/10 p-3 sm:p-4 rounded-2xl border border-white/15 backdrop-blur-sm space-y-2">
          <label className="block text-xs font-bold text-indigo-200 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5" />
            <span>Have an Exam Access Code from your Teacher?</span>
          </label>
          
          <form onSubmit={handleJoinByCode} className="flex flex-col sm:flex-row items-center gap-2">
            <input
              type="text"
              required
              placeholder="ENTER 6-CHAR EXAM CODE (e.g. BIO101)"
              value={examCode}
              onChange={(e) => setExamCode(e.target.value.toUpperCase())}
              maxLength={8}
              className="w-full px-4 py-3 bg-white text-slate-900 rounded-xl text-sm font-mono font-extrabold tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={!examCode.trim()}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white font-bold text-xs tracking-wide shadow-md transition-all flex items-center justify-center gap-1.5 shrink-0"
            >
              <span>Start Assessment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* AUTHENTICITY CHECKER TOOL */}
        <Link
          href="/student/plagiarism"
          className="group flex items-center gap-3 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm p-3 sm:p-4 hover:bg-white/20 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/90 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white flex items-center gap-1.5">
              Plagiarism & Authenticity Checker
              <span className="text-[9px] font-extrabold bg-emerald-400/90 text-emerald-950 px-1.5 py-0.5 rounded-full">NEW</span>
            </p>
            <p className="text-[11px] text-indigo-100/80">
              Check your work for copied or AI-sounding content, get a verification code, and share it with your teacher.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-indigo-100 shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl w-full sm:w-auto overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab("exams")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === "exams"
              ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Assessments & Gradebook ({stats.totalTaken})</span>
        </button>

        <button
          onClick={() => setActiveTab("complaints")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === "complaints"
              ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Academic Complaints & Petitions ({complaintsList.length})</span>
        </button>
      </div>

      {complaintSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{complaintSuccess}</span>
          </div>
          <button onClick={() => setComplaintSuccess(null)} className="text-emerald-600 hover:text-emerald-800">✕</button>
        </div>
      )}

      {/* TAB 1: ASSESSMENTS & GRADEBOOK */}
      {activeTab === "exams" && (
        <div className="space-y-6">
          {/* Summary Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] sm:text-xs text-slate-500 font-medium">Tests Completed</span>
              <div className="text-xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {stats.totalTaken}
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-400">Total transcripts</span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] sm:text-xs text-slate-500 font-medium">Average Score</span>
              <div className="text-xl sm:text-3xl font-extrabold text-indigo-600 mt-1">
                {stats.avgPercentage}%
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-400">Across all exams</span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] sm:text-xs text-slate-500 font-medium">Pass Rate</span>
              <div className="text-xl sm:text-3xl font-extrabold text-emerald-600 mt-1">
                {stats.passRate}%
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-400">Success percentage</span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] sm:text-xs text-slate-500 font-medium">Highest Mark</span>
              <div className="text-xl sm:text-3xl font-extrabold text-amber-600 mt-1">
                {stats.highestScore}%
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-400">Peak performance</span>
            </div>
          </div>

          {/* Test History Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Examination Transcripts & Submissions
                </h2>
                <p className="text-xs text-slate-500">
                  Review test results, instant answer keys, and teacher feedback.
                </p>
              </div>
            </div>

            {history.length === 0 ? (
              <div className="p-8 sm:p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">No examination attempts yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Enter an exam access code in the box above or launch one of the available assessments below.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-4 sm:px-5 py-3">Assessment Title</th>
                      <th className="px-3 sm:px-4 py-3">Score</th>
                      <th className="px-3 sm:px-4 py-3">Status</th>
                      <th className="px-3 sm:px-4 py-3">Time Spent</th>
                      <th className="px-4 sm:px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map((sub: any) => (
                      <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 sm:px-5 py-3.5">
                          <div className="font-bold text-slate-900 text-xs sm:text-sm">
                            {sub.testTitle || "Examination"}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="font-mono uppercase font-bold text-indigo-600">{sub.testCode}</span>
                            {sub.testSubject && <span>• {sub.testSubject}</span>}
                            <span>• {new Date(sub.submittedAt).toLocaleDateString()}</span>
                          </div>
                        </td>

                        <td className="px-3 sm:px-4 py-3.5">
                          <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                            {sub.score} / {sub.maxScore}
                          </div>
                          <div className="text-[11px] font-bold text-indigo-600">
                            {sub.percentage}%
                          </div>
                        </td>

                        <td className="px-3 sm:px-4 py-3.5">
                          {sub.passed === 1 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] sm:text-[11px] font-bold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Passed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] sm:text-[11px] font-bold">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              Failed
                            </span>
                          )}
                        </td>

                        <td className="px-3 sm:px-4 py-3.5 text-slate-600 text-xs">
                          {formatTime(sub.timeSpentSeconds)}
                        </td>

                        <td className="px-4 sm:px-5 py-3.5 text-right">
                          <Link
                            href={`/test/result/${sub.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors"
                          >
                            <Sparkles className="w-3 h-3 text-indigo-600" />
                            <span className="hidden sm:inline">Review Corrections</span>
                            <span className="sm:hidden">Review</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Available School Exams */}
          {availableExams.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <span>Available Assessments</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {availableExams.map((exam: any) => (
                  <div
                    key={exam.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {exam.code}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Timer className="w-3 h-3" /> {exam.durationMinutes} mins
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-900 text-sm sm:text-base mt-2.5">
                        {exam.title}
                      </h3>
                      {exam.subject && (
                        <p className="text-xs text-slate-500 mt-0.5">{exam.subject}</p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Pass Mark: {exam.passScorePercentage}%</span>
                      <Link
                        href={`/test/${exam.code}`}
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
                      >
                        <span>Launch Test</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ACADEMIC COMPLAINTS & PETITIONS */}
      {activeTab === "complaints" && (
        <div className="space-y-6">
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                <span>Academic Grievance & Grade Petitions</span>
              </h2>
              <p className="text-xs text-slate-500">
                Submit formal requests regarding missing marks, grade discrepancies, and course record issues.
              </p>
            </div>

            {formAvailable ? (
              <button
                onClick={() => setShowComplaintModal(true)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                <span>+ Submit Complaint</span>
              </button>
            ) : (
              <div className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold border border-slate-200">
                Forms Disabled by Admin
              </div>
            )}
          </div>

          {/* If Form is Disabled by Admin */}
          {!formAvailable && (
            <div className="p-6 sm:p-8 rounded-3xl bg-amber-50/80 border border-amber-200 text-amber-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>Complaint Submission Not Available Yet</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Academic complaint and petition submission is currently disabled for {complaintsData?.schoolName || "your school"} until configured and activated by your school administrator.
              </p>
            </div>
          )}

          {/* List of Student's Submitted Complaints */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Your Submitted Petitions</h3>
              <span className="text-xs text-slate-500 font-semibold">{complaintsList.length} Total</span>
            </div>

            {complaintsList.length === 0 ? (
              <div className="p-8 sm:p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">No complaints filed yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  If you notice an error with your Continuous Assessment or Final Exam mark, click "+ Submit Complaint" above.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {complaintsList.map((comp: any) => (
                  <div key={comp.id} className="p-5 sm:p-6 space-y-3 hover:bg-slate-50/50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-extrabold text-slate-900">{comp.subject}</span>
                          {comp.courseCode && (
                            <span className="font-mono text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                              {comp.courseCode}
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {comp.nature}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {comp.studentLevel} • {comp.departmentName || "General Faculty"} • Submitted {new Date(comp.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {comp.status === "pending" && (
                          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                            ⏳ Pending Review
                          </span>
                        )}
                        {comp.status === "under_review" && (
                          <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-bold">
                            🔍 Under Review
                          </span>
                        )}
                        {comp.status === "resolved" && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                            ✓ Resolved
                          </span>
                        )}
                        {comp.status === "rejected" && (
                          <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-bold">
                            ✕ Rejected
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      {comp.description}
                    </p>

                    {/* Attached Evidence Document */}
                    {comp.documentUrl && (
                      <div className="flex items-center gap-2 text-xs">
                        <FileText className="w-4 h-4 text-indigo-600" />
                        <span className="text-slate-500">Attachment:</span>
                        <a
                          href={comp.documentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 font-bold hover:underline truncate max-w-xs"
                        >
                          {comp.documentName || "View Evidence Document"}
                        </a>
                      </div>
                    )}

                    {/* Administrative Resolution Decision */}
                    {comp.resolutionNote && (
                      <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-100 text-xs space-y-1">
                        <div className="font-bold text-indigo-950 flex items-center justify-between">
                          <span>Official Administrative Decision:</span>
                          <span className="text-[10px] text-slate-400">
                            Reviewed by {comp.assignedReviewerName || "School Administration"}
                          </span>
                        </div>
                        <p className="text-indigo-900 leading-relaxed font-medium">
                          {comp.resolutionNote}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* COMPLAINT SUBMISSION MODAL */}
      {showComplaintModal && formConfig && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Submit Academic Complaint</h3>
              <p className="text-xs text-slate-500">
                {formConfig.instructions || "Fill out the required information to petition your school administration."}
              </p>
            </div>

            {complaintError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{complaintError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitComplaint} className="space-y-4">
              
              {/* Level & Department Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Student Level / Year <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={studentLevel}
                    onChange={(e) => setStudentLevel(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {formConfig.levels?.map((lvl: string) => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>

                {complaintsData?.departments?.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Department / Faculty
                    </label>
                    <select
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select department (Optional)...</option>
                      {complaintsData.departments.map((dept: any) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name} {dept.code ? `(${dept.code})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Course Code & Nature Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Course Code (e.g. CSC 401)
                  </label>
                  <input
                    type="text"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                    placeholder="e.g. MAT201, BIO101"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nature of Complaint <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={nature}
                    onChange={(e) => setNature(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {formConfig.categories?.map((cat: string) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subject Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subject / Summary <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Continuous Assessment mark not reflecting on portal"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Detailed Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Detailed Statement & Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue clearly, including dates, assignment titles, or test scores..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Document / Evidence Upload Section */}
              {formConfig.allowDocumentUpload && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Supporting Document / Evidence (Optional)</span>
                    <span className="text-[10px] text-slate-400">PDF, JPG, PNG (Max 5MB)</span>
                  </label>
                  
                  <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:border-indigo-400 transition-colors">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                    {documentName ? (
                      <span className="text-xs font-bold text-indigo-700">{documentName}</span>
                    ) : (
                      <span className="text-xs text-slate-500">
                        Click or drag to upload exam sheet copy, receipt, or screenshot
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowComplaintModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submittingComplaint || !subject || !description}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20"
                >
                  {submittingComplaint ? "Submitting..." : "Submit Complaint"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
