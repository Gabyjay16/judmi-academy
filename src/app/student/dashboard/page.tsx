"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ArrowRight,
  KeyRound,
  MessageSquare,
  AlertCircle,
  Upload,
  FileText,
  ShieldCheck,
  ChevronDown,
  GraduationCap,
} from "lucide-react";

export default function StudentDashboardPage() {
  const router = useRouter();
  const [examCode, setExamCode] = useState("");
  const [showExamCode, setShowExamCode] = useState(false);
  const [user, setUser] = useState<any | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("judmi_user");
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });

  // Complaints State
  const [complaintsData, setComplaintsData] = useState<any | null>(null);
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  const [showComplaints, setShowComplaints] = useState(true);
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

  useEffect(() => {
    fetchUser();
    fetchComplaints();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth");
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
      }
    } catch {}
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
      setShowComplaints(true);
      fetchComplaints();
    } catch (err: any) {
      setComplaintError(err.message || "Failed to submit complaint.");
    } finally {
      setSubmittingComplaint(false);
    }
  };

  const complaintsList = complaintsData?.complaints || [];
  const formAvailable = complaintsData?.formAvailable === true;
  const formConfig = complaintsData?.formConfig;
  const firstName = user?.name?.split(" ")[0] || "there";

  const statusBadge = (status: string) => {
    if (status === "pending") return <span className="badge badge-warning">Pending Review</span>;
    if (status === "under_review") return <span className="badge badge-primary">Under Review</span>;
    if (status === "resolved") return <span className="badge badge-success">Resolved</span>;
    if (status === "rejected") return <span className="badge badge-danger">Rejected</span>;
    return <span className="badge badge-neutral">{status}</span>;
  };

  const quickActions = [
    {
      href: "/student/plagiarism",
      icon: ShieldCheck,
      title: "Plagiarism Checker",
      desc: "Check your work for copied or AI-sounding content, get a verification code to share with your teacher",
      color: "emerald",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      iconColor: "text-emerald-600",
    },
    {
      href: "#complaints",
      onClick: () => {
        setShowComplaints(true);
        setShowComplaintModal(formAvailable);
      },
      icon: MessageSquare,
      title: "Academic Complaints",
      desc: "Submit formal requests about missing marks, grade discrepancies, or course records",
      color: "amber",
      bg: "bg-amber-50",
      border: "border-amber-200",
      iconColor: "text-amber-600",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 sm:space-y-10 animate-fade-in">

      {/* Welcome Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 shadow-xl shadow-navy-900/5 animate-slide-up">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-800 to-indigo-900" />
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-amber-500/25 blur-3xl" />
        <div className="absolute -bottom-28 -left-20 w-80 h-80 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="absolute top-8 right-10 opacity-10 rotate-12 select-none pointer-events-none">
          <GraduationCap className="w-40 h-40 text-white/40" strokeWidth={1} />
        </div>
        <div className="relative px-6 sm:px-10 py-8 sm:py-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
              Student Portal
            </span>
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
            Hello {firstName}
          </h1>
          <p className="mt-3 max-w-2xl text-sm sm:text-base text-navy-100/90 leading-relaxed">
            {user?.studentId ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-amber-300 mr-2">
                <FileText className="w-4 h-4" />
                Matricule: {user.studentId}
              </span>
            ) : null}
            Start an assessment with your teacher&apos;s access code, check your work for authenticity, and manage academic requests.
          </p>

          <div className="mt-7 grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl">
            <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm">
              <GraduationCap className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <div className="text-sm font-bold text-white">Assessments</div>
                <div className="text-[11px] text-navy-200/80">Join by code</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm">
              <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <div className="text-sm font-bold text-white">Authenticity</div>
                <div className="text-[11px] text-navy-200/80">Plagiarism check</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm">
              <MessageSquare className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <div className="text-sm font-bold text-white">Petitions</div>
                <div className="text-[11px] text-navy-200/80">Grade requests</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Start an Assessment (exam access code) accordion */}
      <section className="animate-slide-up" style={{ animationDelay: "60ms" }}>
        <button
          type="button"
          onClick={() => setShowExamCode(!showExamCode)}
          className="w-full surface card-hover p-5 sm:p-6 flex items-center justify-between gap-4 transition-all text-left"
        >
          <span className="flex items-center gap-3 sm:gap-4 min-w-0">
            <span className="w-12 h-12 shrink-0 rounded-xl bg-navy-900 text-amber-500 border border-navy-800 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-base sm:text-lg font-bold text-slate-900 leading-tight">Start an Assessment</span>
              <span className="block mt-1 text-[13px] sm:text-sm text-slate-500">Enter the exam access code your teacher gave you</span>
            </span>
          </span>
          <ChevronDown className={`w-5 h-5 text-amber-500 shrink-0 transition-transform ${showExamCode ? "rotate-180" : ""}`} />
        </button>

        {showExamCode && (
          <div className="surface-elevated mt-4 p-5 sm:p-6 rounded-2xl animate-fade-in">
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-600" />
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
                className="w-full px-4 py-3 bg-white text-slate-900 rounded-xl border border-slate-200 text-sm font-mono font-extrabold tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!examCode.trim()}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-1.5 shrink-0"
              >
                <span>Start Assessment</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </section>

      {/* Quick Actions Grid */}
      <section className="animate-slide-up" style={{ animationDelay: "120ms" }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href || "#complaints"}
              onClick={action.onClick}
              className="group surface card-hover p-4 sm:p-5 flex items-center gap-3 sm:gap-4 transition-all"
            >
              <span className={`w-11 h-11 shrink-0 rounded-xl border flex items-center justify-center group-hover:scale-105 transition-transform ${action.bg} ${action.border} ${action.iconColor}`}>
                <action.icon className="w-5 h-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-base sm:text-lg font-bold text-slate-900 leading-tight">{action.title}</span>
                <span className="block mt-0.5 text-[13px] leading-snug text-slate-500">{action.desc}</span>
              </span>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 transition-colors shrink-0 ml-auto" />
            </Link>
          ))}
        </div>
      </section>

      {/* Academic Complaints */}
      <section className="animate-slide-up" style={{ animationDelay: "180ms" }} id="complaints">
        <button
          type="button"
          onClick={() => setShowComplaints(!showComplaints)}
          className="w-full surface card-hover p-5 sm:p-6 flex items-center justify-between gap-4 transition-all text-left"
        >
          <span className="flex items-center gap-3 sm:gap-4 min-w-0">
            <span className="w-12 h-12 shrink-0 rounded-xl bg-navy-50 text-amber-600 border border-navy-100 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {showComplaints ? "Hide Academic Complaints" : "Academic Complaints & Petitions"}
              </span>
              <span className="block mt-1 text-[13px] sm:text-sm text-slate-500">
                {complaintsList.length} submitted petition{complaintsList.length === 1 ? "" : "s"}
              </span>
            </span>
          </span>
          <ChevronDown className={`w-5 h-5 text-amber-500 shrink-0 transition-transform ${showComplaints ? "rotate-180" : ""}`} />
        </button>

        {showComplaints && (
          <div className="mt-4 space-y-6 animate-fade-in">

            {complaintSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between animate-fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{complaintSuccess}</span>
                </div>
                <button onClick={() => setComplaintSuccess(null)} className="text-emerald-600 hover:text-emerald-800">✕</button>
              </div>
            )}

            <div className="surface-elevated overflow-hidden">
              <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
                <div className="space-y-1">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-navy-700" />
                    <span>Academic Complaints & Petitions</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Submit formal requests about missing marks, grade discrepancies, or course record issues.
                  </p>
                </div>

                {formAvailable ? (
                  <button
                    onClick={() => setShowComplaintModal(true)}
                    className="btn-primary w-full sm:w-auto text-xs shrink-0"
                  >
                    <span>+ Submit Complaint</span>
                  </button>
                ) : (
                  <div className="px-3.5 py-2 rounded-xl bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200 inline-flex items-center gap-1.5 shrink-0">
                    <AlertCircle className="w-4 h-4" />
                    <span>Submission Disabled by Admin</span>
                  </div>
                )}
              </div>

              <div className="px-4 sm:px-6 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Your Submitted Petitions</span>
                <span className="text-xs text-slate-500 font-semibold">{complaintsList.length} Total</span>
              </div>

              {complaintsList.length === 0 ? (
                <div className="p-8 sm:p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center mx-auto">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">No complaints filed yet</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    If you notice an error with your Continuous Assessment or Final Exam mark, click &quot;+ Submit Complaint&quot; above.
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
                              <span className="font-mono text-[10px] font-extrabold text-navy-800 bg-navy-50 px-2 py-0.5 rounded border border-navy-100">
                                {comp.courseCode}
                              </span>
                            )}
                            <span className="badge badge-neutral">
                              {comp.nature}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {comp.studentLevel} • {comp.departmentName || "General Faculty"} • Submitted {new Date(comp.createdAt).toLocaleDateString()}
                          </div>
                        </div>

                        <div>{statusBadge(comp.status)}</div>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        {comp.description}
                      </p>

                      {comp.documentUrl && (
                        <div className="flex items-center gap-2 text-xs">
                          <FileText className="w-4 h-4 text-navy-700" />
                          <span className="text-slate-500">Attachment:</span>
                          <a
                            href={comp.documentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-navy-700 font-bold hover:underline truncate max-w-xs"
                          >
                            {comp.documentName || "View Evidence Document"}
                          </a>
                        </div>
                      )}

                      {comp.resolutionNote && (
                        <div className="p-3.5 rounded-2xl bg-navy-50 border border-navy-100 text-xs space-y-1">
                          <div className="font-bold text-navy-950 flex items-center justify-between">
                            <span>Official Administrative Decision:</span>
                            <span className="text-[10px] text-slate-400">
                              Reviewed by {comp.assignedReviewerName || "School Administration"}
                            </span>
                          </div>
                          <p className="text-navy-900 leading-relaxed font-medium">
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
      </section>

      {/* COMPLAINT MODAL */}
      {showComplaintModal && formConfig && (
        <div className="modal-overlay">
          <div className="modal-content">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Student Level / Year <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={studentLevel}
                    onChange={(e) => setStudentLevel(e.target.value)}
                    className="input-field py-2.5 text-xs font-bold"
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
                      className="input-field py-2.5 text-xs font-bold"
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
                    className="input-field py-2.5 text-xs font-mono font-bold"
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
                    className="input-field py-2.5 text-xs font-bold"
                  >
                    {formConfig.categories?.map((cat: string) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

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
                  className="input-field py-2.5 text-xs font-bold"
                />
              </div>

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
                  className="input-field text-xs leading-relaxed"
                />
              </div>

              {formConfig.allowDocumentUpload && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Supporting Document / Evidence (Optional)</span>
                    <span className="text-[10px] text-slate-400">PDF, JPG, PNG (Max 5MB)</span>
                  </label>

                  <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:border-navy-400 transition-colors">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                    {documentName ? (
                      <span className="text-xs font-bold text-navy-800">{documentName}</span>
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
                  className="btn-outline text-xs"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submittingComplaint || !subject || !description}
                  className="btn-primary text-xs disabled:opacity-50"
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
