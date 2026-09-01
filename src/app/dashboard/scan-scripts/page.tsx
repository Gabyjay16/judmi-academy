"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { 
  Camera, 
  Upload, 
  Sparkles, 
  Plus, 
  Trash2, 
  Check, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  RefreshCw, 
  ArrowRight, 
  ArrowLeft, 
  Layers, 
  Users, 
  Download, 
  Image as ImageIcon,
  HelpCircle,
  Eye,
  AlertCircle,
  Maximize2
} from "lucide-react";
import { exportClassResultsPDF } from "@/lib/pdf-export";
import { UpgradeModal } from "@/components/UpgradeModal";
import { isPdfFile, pdfFileToImages } from "@/lib/pdf-images";

const MAX_PAGES_PER_STUDENT = 5;
const MAX_STUDENTS_PER_BATCH = 20;

interface StudentScriptGroup {
  id: string;
  studentName: string;
  studentId: string;
  pages: string[]; // Base64 image strings (1 to 5 pages)
}

export default function ScanScriptsPage() {
  const [user, setUser] = useState<any | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Step state: 1: Marking Guide Setup, 2: Script Snapping & Twin Grid, 3: Graded Results
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Marking Guide state
  const [guideImage, setGuideImage] = useState<string | null>(null);
  const [guideText, setGuideText] = useState("");
  const [assessmentType, setAssessmentType] = useState<"mcq" | "essay" | "mixed">("mcq");

  // Student Script Groups (Max 20 students per intake, up to 5 pages each)
  const [students, setStudents] = useState<StudentScriptGroup[]>([
    {
      id: "student-group-1",
      studentName: "Student 1",
      studentId: "",
      pages: [],
    },
  ]);

  // Grading state
  const [isGrading, setIsGrading] = useState(false);
  const [isConvertingPdf, setIsConvertingPdf] = useState(false);
  const [gradedResults, setGradedResults] = useState<any[]>([]);
  const [activeReviewIdx, setActiveReviewIdx] = useState<number | null>(null);

  // File input refs
  const guideCameraRef = useRef<HTMLInputElement>(null);
  const guideFileRef = useRef<HTMLInputElement>(null);
  const pageCameraRef = useRef<HTMLInputElement>(null);
  const pageFileRef = useRef<HTMLInputElement>(null);

  const [activeTargetStudentId, setActiveTargetStudentId] = useState<string | null>(null);

  useEffect(() => {
    fetchSession();
  }, []);

  const fetchSession = async () => {
    try {
      const storedToken = typeof window !== "undefined" ? localStorage.getItem("judmi_session") || "" : "";
      const headers: Record<string, string> = {};
      if (storedToken) headers["x-session-token"] = storedToken;

      const res = await fetch("/api/auth", { headers });
      const data = await res.json();
      if (data.user) setUser(data.user);
    } catch {}
  };

  // Convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle Marking Guide Upload / Snap
  const handleGuideUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (isPdfFile(file)) {
        setIsConvertingPdf(true);
        try {
          const images = await pdfFileToImages(file, 1);
          if (images.length > 0) {
            setGuideImage(images[0]);
          } else {
            alert("Could not read the first page of that PDF. Please upload the marking guide as an image.");
          }
        } catch {
          alert("Could not read that PDF. Please upload the marking guide as an image instead.");
        } finally {
          setIsConvertingPdf(false);
        }
      } else {
        const base64 = await fileToBase64(file);
        setGuideImage(base64);
      }
    }
    // reset input so same file can be chosen again if needed
    e.target.value = "";
  };

  // Handle snapping or selecting a page for a specific student
  const handleAddPageToStudent = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeTargetStudentId) return;

    setIsConvertingPdf(true);
    try {
      const base64List: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (isPdfFile(f)) {
          const pages = await pdfFileToImages(f, MAX_PAGES_PER_STUDENT);
          base64List.push(...pages);
        } else {
          base64List.push(await fileToBase64(f));
        }
      }

      setStudents((prev) =>
        prev.map((s) => {
          if (s.id === activeTargetStudentId) {
            const combined = [...s.pages, ...base64List].slice(0, MAX_PAGES_PER_STUDENT);
            return { ...s, pages: combined };
          }
          return s;
        })
      );
    } finally {
      setIsConvertingPdf(false);
      e.target.value = "";
    }
  };

  // Remove a page from a student
  const removePageFromStudent = (studentId: string, pageIndex: number) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === studentId) {
          const updated = [...s.pages];
          updated.splice(pageIndex, 1);
          return { ...s, pages: updated };
        }
        return s;
      })
    );
  };

  // Add new student card (enforcing 20 max limit per batch)
  const handleAddStudentCard = () => {
    if (students.length >= MAX_STUDENTS_PER_BATCH) {
      alert(`Maximum intake reached: You can snap up to ${MAX_STUDENTS_PER_BATCH} students per batch. Please grade these first.`);
      return;
    }

    setStudents((prev) => [
      ...prev,
      {
        id: `student-group-${Date.now()}-${prev.length}`,
        studentName: `Student ${prev.length + 1}`,
        studentId: "",
        pages: [],
      },
    ]);
  };

  // Quick Camera Snap for Next Student
  const handleSnapNextStudent = () => {
    if (students.length >= MAX_STUDENTS_PER_BATCH) {
      alert(`Maximum intake reached: You can snap up to ${MAX_STUDENTS_PER_BATCH} students per batch. Please grade these first.`);
      return;
    }

    const newId = `student-group-${Date.now()}-${students.length}`;
    setStudents((prev) => [
      ...prev,
      {
        id: newId,
        studentName: `Student ${prev.length + 1}`,
        studentId: "",
        pages: [],
      },
    ]);

    // Open camera immediately for this new student
    setActiveTargetStudentId(newId);
    setTimeout(() => {
      pageCameraRef.current?.click();
    }, 100);
  };

  // Delete student card
  const handleDeleteStudentCard = (studentId: string) => {
    if (students.length === 1) {
      setStudents([
        {
          id: `student-group-${Date.now()}`,
          studentName: "Student 1",
          studentId: "",
          pages: [],
        },
      ]);
      return;
    }
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
  };

  const triggerCameraForStudent = (studentId: string) => {
    setActiveTargetStudentId(studentId);
    pageCameraRef.current?.click();
  };

  const triggerGalleryForStudent = (studentId: string) => {
    setActiveTargetStudentId(studentId);
    pageFileRef.current?.click();
  };

  // Run AI Script Grading
  const handleRunGrading = async () => {
    const validStudents = students.filter((s) => s.pages.length > 0);
    if (validStudents.length === 0) {
      alert("Please snap or upload at least one student script page with your camera.");
      return;
    }

    try {
      setIsGrading(true);
      const res = await fetch("/api/grade-scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentType,
          guideImageBase64: guideImage,
          guideText,
          students: validStudents,
        }),
      });

      const data = await res.json();

      if (res.status === 403 || data.quotaReached) {
        setShowUpgradeModal(true);
        return;
      }

      if (data.results && data.results.length > 0) {
        setGradedResults(data.results);
        setStep(3);
      } else {
        alert(data.error || "Failed to grade scripts. Please check your photos.");
      }
    } catch (err: any) {
      console.error("Grading error:", err);
      alert("Failed to grade scripts. Please try again.");
    } finally {
      setIsGrading(false);
    }
  };

  // Reset or Start Next Batch / Script Snapping
  const handleStartNextBatch = () => {
    setStudents([
      {
        id: `student-group-${Date.now()}`,
        studentName: "Student 1",
        studentId: "",
        pages: [],
      },
    ]);
    setGradedResults([]);
    setStep(2);
  };

  // Download Graded Batch PDF
  const handleDownloadBatchPDF = () => {
    if (gradedResults.length === 0) return;
    const avgScore = Math.round(
      gradedResults.reduce((acc, curr) => acc + curr.percentage, 0) / gradedResults.length
    );
    const passCount = gradedResults.filter((r) => r.passed).length;

    exportClassResultsPDF({
      test: {
        title: "Judmi Academy Script Evaluation",
        code: "SCN-AI",
        subject: assessmentType.toUpperCase(),
        durationMinutes: 0,
        passScorePercentage: 50,
      },
      stats: {
        totalSubmissions: gradedResults.length,
        avgPercentage: avgScore,
        passRate: Math.round((passCount / gradedResults.length) * 100),
      },
      submissions: gradedResults.map((r, i) => ({
        id: r.id,
        studentName: r.studentName,
        studentId: r.studentId,
        score: r.score,
        maxScore: r.maxScore,
        percentage: r.percentage,
        passed: r.passed ? 1 : 0,
        timeSpentSeconds: 0,
        submittedAt: new Date().toISOString(),
      })),
    });
  };

  const isPro = user?.isPro || user?.planType === "individual" || user?.planType === "school_pro" || user?.role === "admin";
  const validSnappedCount = students.filter((s) => s.pages.length > 0).length;
  const totalPagesSnapped = students.reduce((acc, s) => acc + s.pages.length, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      
      {/* Hidden Native File Inputs for Live Camera and Gallery */}
      <input
        type="file"
        ref={guideCameraRef}
        accept="image/*"
        capture="environment"
        onChange={handleGuideUpload}
        className="hidden"
      />
      <input
        type="file"
        ref={guideFileRef}
        accept="image/*,.pdf"
        onChange={handleGuideUpload}
        className="hidden"
      />
      <input
        type="file"
        ref={pageCameraRef}
        accept="image/*"
        capture="environment"
        onChange={handleAddPageToStudent}
        className="hidden"
      />
      <input
        type="file"
        ref={pageFileRef}
        accept="image/*,application/pdf"
        multiple
        onChange={handleAddPageToStudent}
        className="hidden"
      />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-1">
            <Camera className="w-3.5 h-3.5 text-indigo-600" />
            <span>Judmi Academy • Mobile Camera Script Marker</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Mark Scripts (MCQs & Essays)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Snap marking guide and student written papers with camera (up to 5 pages per student, max 20 students per batch intake).
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className={`px-3 py-1.5 rounded-xl transition-all ${step === 1 ? "bg-indigo-600 text-white shadow-xs" : "bg-slate-100 text-slate-600"}`}>
            1. Marking Guide
          </span>
          <span className="text-slate-300">→</span>
          <span className={`px-3 py-1.5 rounded-xl transition-all ${step === 2 ? "bg-indigo-600 text-white shadow-xs" : "bg-slate-100 text-slate-600"}`}>
            2. Snap Scripts ({validSnappedCount}/20)
          </span>
          <span className="text-slate-300">→</span>
          <span className={`px-3 py-1.5 rounded-xl transition-all ${step === 3 ? "bg-emerald-600 text-white shadow-xs" : "bg-slate-100 text-slate-400"}`}>
            3. Results
          </span>
        </div>
      </div>

      {/* Quota Notice Banner */}
      {!isPro && (
        <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold px-2 py-0.5 rounded-md bg-amber-200/60 text-amber-950 text-[11px]">
              Free Starter Plan
            </span>
            <span>
              <strong>{Math.max(0, 3 - (user?.scriptScansUsed || 0))} of 3</strong> free paper script scans remaining.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowUpgradeModal(true)}
            className="text-indigo-700 font-bold hover:underline self-start sm:self-auto text-xs"
          >
            Upgrade to Pro ($15/mo / 10,000 XAF) for Unlimited Scans →
          </button>
        </div>
      )}

      {/* STEP 1: Upload or Snap Marking Guide */}
      {step === 1 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <span>Step 1: Marking Guide / Answer Key Setup</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Snap a photo of the marking guide using your device camera or upload an image/rubric.
            </p>
          </div>

          {/* Assessment Type Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              Assessment Type:
            </label>
            <div className="grid grid-cols-3 gap-2.5 max-w-md">
              <button
                type="button"
                onClick={() => setAssessmentType("mcq")}
                className={`p-3 rounded-2xl border-2 text-xs font-bold transition-all ${
                  assessmentType === "mcq"
                    ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-xs"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                MCQ / Bubble Key
              </button>

              <button
                type="button"
                onClick={() => setAssessmentType("essay")}
                className={`p-3 rounded-2xl border-2 text-xs font-bold transition-all ${
                  assessmentType === "essay"
                    ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-xs"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Written Essay Rubric
              </button>

              <button
                type="button"
                onClick={() => setAssessmentType("mixed")}
                className={`p-3 rounded-2xl border-2 text-xs font-bold transition-all ${
                  assessmentType === "mixed"
                    ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-xs"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Mixed Paper
              </button>
            </div>
          </div>

          {/* Camera Snap or File Upload for Marking Guide */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-800">
              Marking Guide Photo / Answer Key:
            </label>

            {guideImage ? (
              <div className="relative max-w-sm rounded-2xl border-2 border-indigo-200 overflow-hidden bg-slate-50 p-2 space-y-2">
                <img
                  src={guideImage}
                  alt="Marking guide preview"
                  className="w-full h-48 object-cover rounded-xl border border-slate-200"
                />
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Marking Guide Attached
                  </span>
                  <button
                    type="button"
                    onClick={() => setGuideImage(null)}
                    className="text-xs font-bold text-rose-600 hover:underline"
                  >
                    Change / Retake
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                {/* Dedicated Camera Snap Button */}
                <button
                  type="button"
                  onClick={() => guideCameraRef.current?.click()}
                  className="p-6 rounded-3xl border-2 border-indigo-500 bg-indigo-600 hover:bg-indigo-700 text-white flex flex-col items-center justify-center gap-2.5 shadow-md shadow-indigo-500/20 transition-transform active:scale-95 group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-extrabold">📸 Snap Guide with Camera</span>
                  <span className="text-[11px] text-indigo-100 text-center font-medium">
                    Point camera at marking guide or answer key
                  </span>
                </button>

                {/* Gallery Upload */}
                <button
                  type="button"
                  onClick={() => guideFileRef.current?.click()}
                  className="p-6 rounded-3xl border-2 border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-white text-slate-700 flex flex-col items-center justify-center gap-2.5 shadow-xs transition-colors group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-slate-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6 text-slate-700" />
                  </div>
                  <span className="text-sm font-extrabold">🖼️ Upload Guide from Gallery</span>
                  <span className="text-[11px] text-slate-400 text-center font-medium">
                    Select JPEG, PNG, or PDF file
                  </span>
                  {isConvertingPdf && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Converting PDF…
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Optional Text Answer Key Input */}
          <div className="space-y-1.5 pt-2">
            <label className="block text-xs font-semibold text-slate-700">
              Or Type / Paste Answer Key / Rubric (Optional):
            </label>
            <textarea
              rows={3}
              value={guideText}
              onChange={(e) => setGuideText(e.target.value)}
              placeholder="e.g. 1: B, 2: A, 3: C, 4: D, 5: A... Or essay rubric: 20 marks for thesis, 30 marks for arguments."
              className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 font-sans"
            />
          </div>

          {/* Proceed Button */}
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2"
            >
              <span>Next: Snap Student Scripts</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Twin Grid Student Scripts Snapping & Grouping (Max 20 Students, up to 5 pages each) */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Camera className="w-5 h-5 text-indigo-600" />
                    <span>Camera Script Snapper (Twin Grid)</span>
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-extrabold border border-indigo-200">
                    Intake: {students.length} / {MAX_STUDENTS_PER_BATCH} Max
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Snap up to 5 pages per candidate. Snap scripts one by one with camera, then AI marks all {students.length} students simultaneously.
                </p>
              </div>

              {/* Fast Camera Next Student & Card Addition */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSnapNextStudent}
                  disabled={students.length >= MAX_STUDENTS_PER_BATCH}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-extrabold transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>📸 Snap Next Student</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddStudentCard}
                  disabled={students.length >= MAX_STUDENTS_PER_BATCH}
                  className="px-3.5 py-2.5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-xs font-bold transition-colors flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Card</span>
                </button>
              </div>
            </div>

            {/* List of Student Script Cards with Twin Grid */}
            <div className="space-y-6">
              {students.map((student, sIdx) => (
                <div
                  key={student.id}
                  className={`p-5 sm:p-6 rounded-3xl border-2 transition-all space-y-4 ${
                    student.pages.length > 0
                      ? "border-indigo-200 bg-indigo-50/20 shadow-xs"
                      : "border-slate-200 bg-slate-50/40"
                  }`}
                >
                  {/* Student Header Info */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                        #{sIdx + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={student.studentName}
                          onChange={(e) => {
                            const updated = [...students];
                            updated[sIdx].studentName = e.target.value;
                            setStudents(updated);
                          }}
                          placeholder={`Candidate ${sIdx + 1}`}
                          className="font-bold text-sm text-slate-900 bg-transparent border-b border-dashed border-slate-300 focus:border-indigo-600 focus:outline-none px-1 py-0.5"
                        />
                        <input
                          type="text"
                          value={student.studentId}
                          onChange={(e) => {
                            const updated = [...students];
                            updated[sIdx].studentId = e.target.value;
                            setStudents(updated);
                          }}
                          placeholder="ID / Roll No (Optional)"
                          className="text-xs text-slate-500 bg-transparent border-b border-dashed border-slate-200 focus:border-indigo-600 focus:outline-none px-1 py-0.5 w-32"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 justify-between sm:justify-end">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        student.pages.length > 0
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-600"
                      }`}>
                        {student.pages.length} of {MAX_PAGES_PER_STUDENT} Pages Snapped
                      </span>

                      <button
                        type="button"
                        onClick={() => handleDeleteStudentCard(student.id)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Remove candidate"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Twin Grid of Pages (Page 1 to 5) */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                    {/* Existing Snapped Pages */}
                    {student.pages.map((pageB64, pIdx) => (
                      <div
                        key={pIdx}
                        className="relative rounded-2xl overflow-hidden border-2 border-indigo-200 bg-white shadow-xs group aspect-[3/4] flex flex-col"
                      >
                        <img
                          src={pageB64}
                          alt={`Page ${pIdx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end justify-between p-2">
                          <span className="text-[11px] font-bold text-white">
                            Page {pIdx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removePageFromStudent(student.id, pIdx)}
                            className="p-1.5 rounded-full bg-rose-600 text-white hover:bg-rose-700 text-xs shadow-xs"
                            title="Delete page"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Camera Snap Card for this student */}
                    {student.pages.length < MAX_PAGES_PER_STUDENT && (
                      <div className="rounded-2xl border-2 border-dashed border-indigo-400/80 bg-indigo-50/70 hover:bg-indigo-100/70 aspect-[3/4] flex flex-col items-center justify-center p-3 text-center gap-2 transition-all group">
                        <button
                          type="button"
                          onClick={() => triggerCameraForStudent(student.id)}
                          className="w-12 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-500/30 transition-transform active:scale-95 group-hover:scale-105"
                          title="Snap with camera"
                        >
                          <Camera className="w-6 h-6" />
                        </button>
                        <div className="text-xs font-extrabold text-indigo-950">
                          📸 Snap Page {student.pages.length + 1}
                        </div>
                        <button
                          type="button"
                          onClick={() => triggerGalleryForStudent(student.id)}
                          className="text-[10px] text-indigo-700 hover:underline font-bold"
                        >
                          or pick from gallery
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Add More Candidates Bar */}
            {students.length < MAX_STUDENTS_PER_BATCH && (
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 gap-3">
                <span className="text-xs text-slate-600 font-medium">
                  Have more student papers in this batch? (Up to {MAX_STUDENTS_PER_BATCH} students per intake)
                </span>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleSnapNextStudent}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>📸 Snap Next Student with Camera</span>
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Actions Banner */}
            <div className="p-5 sm:p-6 bg-slate-900 text-white rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <div>
                <h4 className="text-sm font-bold">Ready to Mark All Scripts with AI?</h4>
                <p className="text-xs text-slate-400">
                  {validSnappedCount} student(s) • {totalPagesSnapped} total page(s) ready for Gemini AI handwriting analysis.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-bold text-slate-300 transition-colors"
                >
                  ← Edit Guide
                </button>

                <button
                  type="button"
                  disabled={isGrading || validSnappedCount === 0}
                  onClick={handleRunGrading}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
                >
                  {isGrading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>AI Reading Handwriting & Marking...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>✨ Mark All ({validSnappedCount} Students) with AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Batch Graded Results & Review Studio */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            
            {/* Top Results Header & Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Evaluation Completed</span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  AI Marked Gradebook ({gradedResults.length} Candidate Scripts)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Handwriting recognized, answers scored against marking guide, and wrong answers corrected.
                </p>
              </div>

              {/* Action Buttons: Next Script / Next Batch + Download PDF */}
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                {/* Upload / Snap Next Script Button */}
                <button
                  type="button"
                  onClick={handleStartNextBatch}
                  className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>📸 Snap / Upload Next Script</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadBatchPDF}
                  className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4 text-slate-300" />
                  <span>Download PDF Gradebook</span>
                </button>
              </div>
            </div>

            {/* Graded Students Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gradedResults.map((result, rIdx) => (
                <div
                  key={result.id || rIdx}
                  className="p-5 sm:p-6 rounded-3xl border-2 border-slate-200 bg-white hover:border-indigo-300 shadow-xs space-y-4 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900">
                        {result.studentName}
                      </h3>
                      <div className="text-xs text-slate-400 font-mono">
                        {result.studentId || `Candidate #${rIdx + 1}`} • {result.totalPages || 1} page(s) evaluated
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-extrabold text-indigo-600">
                        {result.score} <span className="text-sm font-normal text-slate-400">/ {result.maxScore}</span>
                      </div>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        result.passed ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}>
                        {result.percentage}% • {result.passed ? "PASSED" : "FAILED"}
                      </span>
                    </div>
                  </div>

                  {/* Essay / Theory Feedback */}
                  {result.essayFeedback?.summaryFeedback && (
                    <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs text-slate-700 space-y-1.5">
                      <div className="font-bold text-indigo-950 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>AI Marking Breakdown:</span>
                      </div>
                      <p className="leading-relaxed text-slate-600">{result.essayFeedback.summaryFeedback}</p>
                    </div>
                  )}

                  {/* Strengths & Weaknesses */}
                  {result.essayFeedback?.strengths && result.essayFeedback.strengths.length > 0 && (
                    <div className="text-xs space-y-1">
                      <span className="font-bold text-emerald-800">Key Strengths:</span>
                      <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                        {result.essayFeedback.strengths.map((st: string, sIdx: number) => (
                          <li key={sIdx}>{st}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Itemized Question Breakdown for MCQ & Objectives */}
                  {result.questionBreakdown && result.questionBreakdown.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="text-xs font-bold text-slate-800">
                        Question Breakdown & Corrections:
                      </div>
                      <div className="grid grid-cols-5 gap-1.5 text-center text-xs">
                        {result.questionBreakdown.map((q: any, qIdx: number) => (
                          <div
                            key={qIdx}
                            className={`p-1.5 rounded-xl border ${
                              q.isCorrect
                                ? "border-emerald-200 bg-emerald-50/70 text-emerald-800 font-bold"
                                : "border-rose-200 bg-rose-50/70 text-rose-800"
                            }`}
                            title={`Q${q.questionNumber}: Student chose ${q.studentAnswer}, Correct is ${q.correctAnswer}`}
                          >
                            <div className="text-[10px] text-slate-500">Q{q.questionNumber}</div>
                            <div className="font-bold">{q.studentAnswer || "-"}</div>
                            {!q.isCorrect && (
                              <div className="text-[9px] text-emerald-700 font-bold">✓ {q.correctAnswer}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Bottom Next Batch Action Button */}
            <div className="p-5 sm:p-6 bg-slate-50 rounded-3xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-600">
                Want to mark more student scripts or continue with another batch?
              </div>
              <button
                type="button"
                onClick={handleStartNextBatch}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>📸 Snap / Upload Next Script</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          feature="scriptScans"
        />
      )}
    </div>
  );
}
