"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  Users, 
  BookOpen, 
  GraduationCap, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  UserPlus, 
  Mail, 
  Lock, 
  ArrowRight, 
  Sparkles, 
  BarChart3, 
  CreditCard,
  Zap,
  Smartphone,
  Check,
  MessageSquare,
  Network,
  Settings2,
  Trash2,
  Filter,
  FileText,
  ShieldCheck,
  ExternalLink,
  Search,
  ScanLine,
  Palette,
  Link2
} from "lucide-react";
import ExtractInfoWorkbench from "@/components/ExtractInfoWorkbench";
import SchoolBrandingPanel from "@/components/SchoolBrandingPanel";

export default function OrgDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Navigation Tabs: "teachers" | "students" | "departments" | "complaints" | "tests" | "extract" | "branding"
  const [activeTab, setActiveTab] = useState<"teachers" | "students" | "departments" | "complaints" | "tests" | "extract" | "branding">("teachers");
  const [copiedCode, setCopiedCode] = useState(false);

  // Departments State
  const [departments, setDepartments] = useState<any[]>([]);
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [deptName, setDeptName] = useState("");
  const [deptCode, setDeptCode] = useState("");
  const [deptSubmitting, setDeptSubmitting] = useState(false);

  // Complaint Form Builder State
  const [showFormBuilderModal, setShowFormBuilderModal] = useState(false);
  const [formStatus, setFormStatus] = useState<"active" | "inactive">("active");
  const [formCategories, setFormCategories] = useState<string[]>([
    "Grade Discrepancy / Incorrect Calculation",
    "Missing Continuous Assessment (CA) Mark",
    "Missing Final Exam Mark",
    "Course Registration / Portal Enrollment Error",
    "Lecturer Conduct / Class Attendance Issue",
    "Timetable & Exam Scheduling Clash",
    "Other Academic Grievance",
  ]);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [formLevels, setFormLevels] = useState<string[]>([
    "Year 1",
    "Year 2",
    "Year 3",
    "Year 4",
    "Year 5",
    "Year 6",
    "Year 7",
    "Year 8",
  ]);
  const [newLevelInput, setNewLevelInput] = useState("");
  const [allowDocUpload, setAllowDocUpload] = useState(true);
  const [formInstructions, setFormInstructions] = useState("Please provide clear and accurate details regarding your academic petition.");
  const [savingFormConfig, setSavingFormConfig] = useState(false);

  // Complaints Inbox State
  const [complaints, setComplaints] = useState<any[]>([]);
  const [complaintStats, setComplaintStats] = useState({ total: 0, pending: 0, underReview: 0, resolved: 0, rejected: 0 });
  const [complaintsLoading, setComplaintsLoading] = useState(false);

  // Multi-field Filters for Complaints
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterNature, setFilterNature] = useState("all");
  const [filterCourse, setFilterCourse] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Complaint Resolution Modal
  const [selectedComplaint, setSelectedComplaint] = useState<any | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<"pending" | "under_review" | "resolved" | "rejected">("resolved");
  const [resolutionNote, setResolutionNote] = useState("");
  const [resolving, setResolving] = useState(false);

  // Modals & Member Creation
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [memberDeptId, setMemberDeptId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Seat Expansion State
  const [showExpandModal, setShowExpandModal] = useState(false);
  const [extraSeats, setExtraSeats] = useState(10);
  const [expandOperator, setExpandOperator] = useState<"mtn" | "orange">("mtn");
  const [expandPhone, setExpandPhone] = useState("");
  const [expanding, setExpanding] = useState(false);
  const [expandSuccess, setExpandSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchOrg();
    fetchDepartments();
    fetchFormConfig();
    fetchComplaints();
  }, []);

  const fetchOrg = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/org");
      if (res.status === 403 || res.status === 401) {
        router.push("/login");
        return;
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error("Failed to load org data:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch("/api/org/departments");
      const json = await res.json();
      if (json?.departments) setDepartments(json.departments);
    } catch {}
  };

  const fetchFormConfig = async () => {
    try {
      const res = await fetch("/api/org/complaint-form");
      const json = await res.json();
      if (json?.form) {
        setFormStatus(json.form.status || "active");
        if (json.form.categories) setFormCategories(json.form.categories);
        if (json.form.levels) setFormLevels(json.form.levels);
        setAllowDocUpload(json.form.allowDocumentUpload === true || json.form.allowDocumentUpload === 1);
        if (json.form.instructions) setFormInstructions(json.form.instructions);
      }
    } catch {}
  };

  const fetchComplaints = async () => {
    try {
      setComplaintsLoading(true);
      const params = new URLSearchParams();
      if (filterDepartment !== "all") params.set("department", filterDepartment);
      if (filterNature !== "all") params.set("nature", filterNature);
      if (filterCourse !== "all") params.set("course", filterCourse);
      if (filterLevel !== "all") params.set("level", filterLevel);
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/complaints?${params.toString()}`);
      const json = await res.json();
      if (json?.complaints) {
        setComplaints(json.complaints);
        if (json.stats) setComplaintStats(json.stats);
      }
    } catch (e) {
      console.error("Failed to load complaints:", e);
    } finally {
      setComplaintsLoading(false);
    }
  };

  // Re-fetch complaints when filters change
  useEffect(() => {
    fetchComplaints();
  }, [filterDepartment, filterNature, filterCourse, filterLevel, filterStatus, searchQuery]);

  // Create Teacher Sub-account (students register themselves via the enrolment link)
  const handleCreateSubAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          role: "teacher",
          departmentId: memberDeptId || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || "Failed to create teacher account");
      } else {
        setShowAddModal(false);
        setName("");
        setEmail("");
        setMemberDeptId("");
        fetchOrg();
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to create teacher account");
    } finally {
      setSubmitting(false);
    }
  };

  // Create Department
  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeptSubmitting(true);
    try {
      const res = await fetch("/api/org/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: deptName, code: deptCode }),
      });
      if (res.ok) {
        setDeptName("");
        setDeptCode("");
        setShowAddDeptModal(false);
        fetchDepartments();
      }
    } catch {}
    setDeptSubmitting(false);
  };

  // Delete Department
  const handleDeleteDepartment = async (id: string) => {
    if (!confirm("Are you sure you want to delete this department?")) return;
    try {
      await fetch(`/api/org/departments?id=${id}`, { method: "DELETE" });
      fetchDepartments();
    } catch {}
  };

  // Save Complaint Form Configuration
  const handleSaveFormConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingFormConfig(true);
    try {
      await fetch("/api/org/complaint-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: formStatus,
          categories: formCategories,
          levels: formLevels,
          allowDocumentUpload: allowDocUpload,
          instructions: formInstructions,
        }),
      });
      setShowFormBuilderModal(false);
      fetchFormConfig();
      fetchComplaints();
    } catch {}
    setSavingFormConfig(false);
  };

  // Toggle Member Complaint Management Permission
  const handleToggleComplaintPermission = async (userId: string, currentVal: number) => {
    try {
      const nextVal = currentVal === 1 ? 0 : 1;
      await fetch("/api/org/members/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          canManageComplaints: nextVal,
        }),
      });
      fetchOrg();
    } catch {}
  };

  // Resolve Complaint
  const handleResolveComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setResolving(true);

    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resolve",
          complaintId: selectedComplaint.id,
          status: resolutionStatus,
          resolutionNote,
        }),
      });
      if (res.ok) {
        setSelectedComplaint(null);
        setResolutionNote("");
        fetchComplaints();
      }
    } catch {}
    setResolving(false);
  };

  // Expand Member Seats
  const handleExpandSeats = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpanding(true);
    setFormError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const res = await fetch("/api/org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "expand_seats",
          additionalSeats: extraSeats,
          phone: expandPhone,
          operator: expandOperator,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || "Failed to expand seats");
      } else {
        setExpandSuccess(json.message || `Added +${extraSeats} seats successfully!`);
        setTimeout(() => {
          setShowExpandModal(false);
          setExpandSuccess(null);
          fetchOrg();
        }, 1500);
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to expand seats");
    } finally {
      setExpanding(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center text-slate-500 space-y-3">
        <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold">Loading organization sub-accounts & school hub...</p>
      </div>
    );
  }

  const organization = data?.organization || { name: "Organization", seatLimit: 50, planType: "school_pro" };
  const seats = data?.seats || { total: 50, used: 0, available: 50 };
  const orgSlug = organization.slug || organization.id || "";
  const enrolmentLink =
    orgSlug && organization.accessKey
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/school/${orgSlug}?key=${organization.accessKey}`
      : "";
  const teachers = data?.teachers || [];
  const students = data?.students || [];
  const tests = data?.tests || [];

  const unitPrice = extraSeats >= 10 ? 1500 : 2000;
  const totalCost = extraSeats * unitPrice;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* School Org Header */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: organization.brandColor || "#a5b4fc" }}>
            <Building2 className="w-4 h-4" />
            <span>School / Institutional Organization</span>
          </div>
          <div className="flex items-center gap-3">
            {organization.logoData && (
              <div className="w-11 h-11 rounded-xl overflow-hidden bg-white/15 ring-2 ring-white/15 flex items-center justify-center shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={organization.logoData} alt={organization.name} className="w-full h-full object-contain" />
              </div>
            )}
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {organization.brandName || organization.name}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            Manage departments, faculty teachers, enrolled students, and academic grievance petitions.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {enrolmentLink ? (
            <div className="bg-white/10 px-3.5 py-2.5 rounded-2xl border border-white/15 backdrop-blur-xs flex items-center gap-3 text-xs w-full sm:w-auto sm:max-w-[480px]">
              <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider shrink-0">Student Enrolment Link</span>
              <span className="font-mono font-bold text-white tracking-wide truncate flex-1" title={enrolmentLink}>{enrolmentLink}</span>
              <button
                onClick={() => {
                  if (typeof navigator !== "undefined") {
                    navigator.clipboard.writeText(enrolmentLink);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }
                }}
                className="px-2.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold transition-colors shrink-0"
              >
                {copiedCode ? "✓ Copied!" : "Copy"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setActiveTab("branding")}
              className="px-3.5 py-2.5 rounded-2xl bg-white/10 border border-white/15 text-white text-[11px] font-bold hover:bg-white/20 transition-colors flex items-center gap-1.5"
            >
              <Link2 className="w-3.5 h-3.5 text-indigo-300" />
              Set up your Student Enrolment Link
            </button>
          )}

          <button
            onClick={() => setShowFormBuilderModal(true)}
            className="px-3.5 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Settings2 className="w-4 h-4 text-indigo-300" />
            <span>Form Settings</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/30 transition-all flex items-center gap-1.5 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add Member</span>
          </button>
        </div>
      </div>

      {/* Seat Utilization Bar */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-bold text-slate-900 text-sm">Organization Member Capacity: </span>
            <span className="text-indigo-700 font-bold">{seats.used}</span> of <span className="font-bold text-slate-700">{seats.total}</span> sub-accounts active
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-medium">{seats.available} seats available</span>
            <button
              onClick={() => setShowExpandModal(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition-colors flex items-center gap-1"
            >
              <Zap className="w-3.5 h-3.5 fill-slate-950" />
              <span>+ Increase Sub-Members</span>
            </button>
          </div>
        </div>

        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
          <div 
            className="bg-gradient-to-r from-indigo-600 to-indigo-500 h-full rounded-full transition-all duration-500" 
            style={{ width: `${Math.min(100, Math.round((seats.used / (seats.total || 1)) * 100))}%` }} 
          />
        </div>
      </div>

      {/* Main Hub Tabs */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        
        {/* Navigation Tab Buttons */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl overflow-x-auto text-xs">
            <button
              onClick={() => setActiveTab("teachers")}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === "teachers" ? "bg-white text-indigo-700 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Faculty Teachers ({teachers.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("students")}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === "students" ? "bg-white text-indigo-700 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Enrolled Students ({students.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("departments")}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === "departments" ? "bg-white text-indigo-700 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Departments ({departments.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("complaints")}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === "complaints" ? "bg-white text-indigo-700 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Complaints Inbox ({complaintStats.total})</span>
            </button>

            <button
              onClick={() => setActiveTab("tests")}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === "tests" ? "bg-white text-indigo-700 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>School Tests ({tests.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("extract")}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === "extract" ? "bg-white text-teal-700 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ScanLine className="w-3.5 h-3.5" />
              <span>Extract Info</span>
            </button>
            <button
              onClick={() => setActiveTab("branding")}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === "branding" ? "bg-white text-indigo-700 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Link &amp; Branding</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === "departments" ? (
              <button
                onClick={() => setShowAddDeptModal(true)}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Department</span>
              </button>
            ) : (
              <button
                onClick={() => setShowAddModal(true)}
                className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Teacher</span>
              </button>
            )}
          </div>
        </div>

        {/* 1. TEACHERS TAB (With Complaint Access Delegation) */}
        {activeTab === "teachers" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/75 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">Teacher Name</th>
                  <th className="px-4 py-3.5">Phone / Email</th>
                  <th className="px-4 py-3.5">Complaint Permissions</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Added Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachers.map((t: any) => (
                  <tr key={t.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-4 font-bold text-slate-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center">
                        {t.name[0]}
                      </div>
                      <span>{t.name}</span>
                    </td>
                    <td className="px-4 py-4 font-mono text-slate-600 text-xs">{t.email}</td>
                    
                    {/* Delegation of Complaint Access */}
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleToggleComplaintPermission(t.id, t.canManageComplaints || 0)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                          t.canManageComplaints === 1
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-700"
                        }`}
                        title="Click to grant or revoke complaint review permissions"
                      >
                        <ShieldCheck className={`w-3.5 h-3.5 ${t.canManageComplaints === 1 ? "text-emerald-600" : "text-slate-400"}`} />
                        <span>{t.canManageComplaints === 1 ? "✓ Complaint Reviewer" : "Grant Complaint Access"}</span>
                      </button>
                    </td>

                    <td className="px-4 py-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                        Active Teacher
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-400 text-xs">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 2. STUDENTS TAB */}
        {activeTab === "students" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/75 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">Student Name</th>
                  <th className="px-4 py-3.5">Matricule</th>
                  <th className="px-4 py-3.5">Phone / Email</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Enrolled Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50 text-indigo-500 mb-2">
                        <Link2 className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-bold text-slate-700">No enrolled students yet.</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        Share your <strong>Student Enrolment Link</strong> (Link &amp; Branding tab) so students can
                        log in or register under your school. New registrations appear here automatically.
                      </p>
                      <button
                        onClick={() => { setActiveTab("branding"); }}
                        className="mt-3 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                      >
                        Get My Enrolment Link
                      </button>
                    </td>
                  </tr>
                )}
                {students.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-4 font-bold text-slate-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-purple-50 text-purple-700 font-bold text-xs flex items-center justify-center">
                        {s.name[0]}
                      </div>
                      <span>{s.name}</span>
                    </td>
                    <td className="px-4 py-4 font-mono text-slate-600 font-bold">{s.studentId || "—"}</td>
                    <td className="px-4 py-4 font-mono text-slate-600 text-xs">{s.email}</td>
                    <td className="px-4 py-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                        Enrolled
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-400 text-xs">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. DEPARTMENTS TAB */}
        {activeTab === "departments" && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">School Departments & Faculties</h3>
                <p className="text-xs text-slate-500">Students select their department upon registration to submit course-specific complaints.</p>
              </div>
              <button
                onClick={() => setShowAddDeptModal(true)}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Department</span>
              </button>
            </div>

            {departments.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs space-y-2 border-2 border-dashed border-slate-200 rounded-3xl p-6">
                <Network className="w-8 h-8 mx-auto text-slate-300" />
                <p className="font-bold text-slate-700">No departments created yet.</p>
                <p>Add departments (e.g. Computer Science, Law, Accounting) so students can select them.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {departments.map((d: any) => (
                  <div key={d.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm">{d.name}</div>
                      {d.code && (
                        <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {d.code}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteDepartment(d.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Delete Department"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. COMPLAINTS INBOX TAB (With Comprehensive Sorting & Filtering) */}
        {activeTab === "complaints" && (
          <div className="p-4 sm:p-6 space-y-6">
            
            {/* Header & Stats Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-500 font-medium">Total Complaints</span>
                <div className="text-xl font-extrabold text-slate-900 mt-0.5">{complaintStats.total}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
                <span className="text-[11px] text-amber-700 font-medium">Pending Review</span>
                <div className="text-xl font-extrabold text-amber-900 mt-0.5">{complaintStats.pending}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200">
                <span className="text-[11px] text-indigo-700 font-medium">Under Review</span>
                <div className="text-xl font-extrabold text-indigo-900 mt-0.5">{complaintStats.underReview}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                <span className="text-[11px] text-emerald-700 font-medium">Resolved</span>
                <div className="text-xl font-extrabold text-emerald-900 mt-0.5">{complaintStats.resolved}</div>
              </div>
            </div>

            {/* Comprehensive Sorting & Filtering Bar */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Filter className="w-3.5 h-3.5 text-indigo-600" />
                <span>Filter & Sort Complaints Per Field</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                {/* Filter per Department */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Department
                  </label>
                  <select
                    value={filterDepartment}
                    onChange={(e) => setFilterDepartment(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                  >
                    <option value="all">All Departments</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                {/* Filter per Nature */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Nature / Category
                  </label>
                  <select
                    value={filterNature}
                    onChange={(e) => setFilterNature(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                  >
                    <option value="all">All Natures</option>
                    {formCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Filter per Student Level */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Student Level / Year
                  </label>
                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                  >
                    <option value="all">All Levels</option>
                    {formLevels.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                {/* Filter per Status */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="under_review">Under Review</option>
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Search Bar & Course Code Filter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by student name, matricule, or subject..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Filter by Course Code (e.g. CSC401)..."
                    value={filterCourse === "all" ? "" : filterCourse}
                    onChange={(e) => setFilterCourse(e.target.value ? e.target.value.toUpperCase() : "all")}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Complaints List Cards */}
            {complaints.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs space-y-2 border border-slate-100 rounded-3xl p-6">
                <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
                <p className="font-bold text-slate-700">No complaints matching filter criteria.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {complaints.map((comp: any) => (
                  <div key={comp.id} className="p-5 rounded-3xl border border-slate-200 bg-white shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-extrabold text-slate-900">{comp.subject}</span>
                          {comp.courseCode && (
                            <span className="font-mono text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                              {comp.courseCode}
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {comp.nature}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          <strong>{comp.studentName}</strong> (Matricule: <span className="font-mono font-bold text-slate-700">{comp.studentMatricule}</span>) • {comp.studentLevel} • {comp.departmentName || "General Department"}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {comp.status === "pending" && (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                            ⏳ Pending
                          </span>
                        )}
                        {comp.status === "under_review" && (
                          <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-bold">
                            🔍 Under Review
                          </span>
                        )}
                        {comp.status === "resolved" && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                            ✓ Resolved
                          </span>
                        )}
                        {comp.status === "rejected" && (
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-bold">
                            ✕ Rejected
                          </span>
                        )}

                        <button
                          onClick={() => {
                            setSelectedComplaint(comp);
                            setResolutionStatus(comp.status || "resolved");
                            setResolutionNote(comp.resolutionNote || "");
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
                        >
                          Review & Resolve
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      {comp.description}
                    </p>

                    {comp.documentUrl && (
                      <div className="flex items-center gap-2 text-xs">
                        <FileText className="w-4 h-4 text-indigo-600" />
                        <span className="text-slate-500 font-semibold">Student Attachment:</span>
                        <a
                          href={comp.documentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 font-bold hover:underline truncate max-w-xs flex items-center gap-1"
                        >
                          <span>{comp.documentName || "View Evidence Document"}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {comp.resolutionNote && (
                      <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-xs space-y-0.5">
                        <div className="font-bold text-emerald-950 flex items-center justify-between">
                          <span>Decision Note:</span>
                          <span className="text-[10px] text-slate-400">By {comp.assignedReviewerName || "Reviewer"}</span>
                        </div>
                        <p className="text-emerald-900 leading-relaxed">{comp.resolutionNote}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. TESTS TAB */}
        {activeTab === "tests" && (
          <div className="p-4 sm:p-6 space-y-3">
            {tests.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                No active exams created by school faculty teachers yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tests.map((test: any) => (
                  <div key={test.id} className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 transition-colors space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                        Code: {test.code}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {test.durationMinutes} mins • {test.questionsPerStudent} Qs
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">{test.title}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2">{test.description || "No description."}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 6. EXTRACT INFO TAB */}
        {activeTab === "extract" && (
          <div className="p-0">
            <ExtractInfoWorkbench />
          </div>
        )}

        {/* 7. SCHOOL LINK & BRANDING TAB */}
        {activeTab === "branding" && (
          <SchoolBrandingPanel />
        )}

      </div>

      {/* MODAL 1: ADD TEACHER SUB-ACCOUNT */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 border border-slate-200">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Add Teacher Account</h3>
              <p className="text-xs text-slate-500">
                Create a faculty teacher sub-account under your school subscription. Students register themselves.
              </p>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-[11px] text-indigo-800 leading-relaxed flex items-start gap-2">
              <Link2 className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
              <span>
                <strong>Students join by themselves.</strong> Copy your <strong>Student Enrolment Link</strong> from the{" "}
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setActiveTab("branding"); }}
                  className="font-bold underline text-indigo-700 hover:text-indigo-900"
                >
                  Link &amp; Branding
                </button>{" "}
                tab and share it — anyone who opens it can log in or register as a student under your school.
              </span>
            </div>

            <form onSubmit={handleCreateSubAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Smith"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number or Email</label>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. 670000000 or john@school.edu"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {departments.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department (Optional)</label>
                  <select
                    value={memberDeptId}
                    onChange={(e) => setMemberDeptId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select department...</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} {d.code ? `(${d.code})` : ""}</option>
                    ))}
                  </select>
                </div>
              )}

              <p className="text-[11px] text-slate-400">
                * Default starter password will be set to <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-bold">password123</code>
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting || !name || !email}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  {submitting ? "Creating..." : "Create Teacher Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD DEPARTMENT */}
      {showAddDeptModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 border border-slate-200">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Add School Department</h3>
              <p className="text-xs text-slate-500">
                Create a department or faculty for students to choose when registering and petitioning.
              </p>
            </div>

            <form onSubmit={handleCreateDepartment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Department Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  placeholder="e.g. Department of Computer Science"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Department Code (Optional)
                </label>
                <input
                  type="text"
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                  placeholder="e.g. CSC, LAW, ACC"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDeptModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={deptSubmitting || !deptName.trim()}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  {deptSubmitting ? "Creating..." : "Save Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: COMPLAINT FORM BUILDER & SETTINGS */}
      {showFormBuilderModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Complaint Form Builder</h3>
              <p className="text-xs text-slate-500">
                Configure the fields, categories, and document upload permissions for student petitions.
              </p>
            </div>

            <form onSubmit={handleSaveFormConfig} className="space-y-4">
              
              {/* Form Active / Inactive Switch */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 text-xs block">Student Complaint Portal</span>
                  <span className="text-[11px] text-slate-500">
                    {formStatus === "active" ? "✓ Enabled & visible to students" : "✕ Disabled for students"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormStatus(formStatus === "active" ? "inactive" : "active")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    formStatus === "active" ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {formStatus === "active" ? "Enabled" : "Disabled"}
                </button>
              </div>

              {/* Allow Document Upload Toggle */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 text-xs block">Document / Evidence Upload</span>
                  <span className="text-[11px] text-slate-500">Allow students to attach photos or PDF proofs</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAllowDocUpload(!allowDocUpload)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    allowDocUpload ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {allowDocUpload ? "Allowed" : "Off"}
                </button>
              </div>

              {/* Categories / Natures */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Complaint Categories (Natures)</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {formCategories.map((cat, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 text-[11px] font-semibold border border-indigo-100">
                      <span>{cat}</span>
                      <button
                        type="button"
                        onClick={() => setFormCategories(formCategories.filter((_, i) => i !== idx))}
                        className="text-indigo-400 hover:text-rose-600"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    placeholder="Add category (e.g. Missing CA Mark)..."
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newCategoryInput.trim()) {
                        setFormCategories([...formCategories, newCategoryInput.trim()]);
                        setNewCategoryInput("");
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Student Academic Years (Year 1 to Year 8) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Student Academic Years (Levels)</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {formLevels.map((lvl, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-bold border border-slate-200">
                      <span>{lvl}</span>
                      <button
                        type="button"
                        onClick={() => setFormLevels(formLevels.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-rose-600 font-normal"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLevelInput}
                    onChange={(e) => setNewLevelInput(e.target.value)}
                    placeholder="Add academic year (e.g. Year 1)..."
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newLevelInput.trim()) {
                        setFormLevels([...formLevels, newLevelInput.trim()]);
                        setNewLevelInput("");
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Student Notice / Instructions</label>
                <textarea
                  rows={2}
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFormBuilderModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingFormConfig}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20"
                >
                  {savingFormConfig ? "Saving..." : "Save Configuration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: REVIEW & RESOLVE COMPLAINT */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="space-y-1 border-b border-slate-100 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Review Petition</span>
              <h3 className="text-base font-extrabold text-slate-900">{selectedComplaint.subject}</h3>
              <p className="text-xs text-slate-500">
                Student: <strong>{selectedComplaint.studentName}</strong> (Matricule: {selectedComplaint.studentMatricule}) • {selectedComplaint.courseCode || "General Course"}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700 space-y-1">
              <span className="font-bold text-slate-900 block">Student Statement:</span>
              <p className="leading-relaxed">{selectedComplaint.description}</p>
            </div>

            {selectedComplaint.documentUrl && (
              <div className="flex items-center gap-2 text-xs p-2.5 rounded-xl bg-indigo-50 border border-indigo-100">
                <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="text-slate-600 font-semibold">Evidence:</span>
                <a
                  href={selectedComplaint.documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-700 font-bold hover:underline truncate max-w-xs"
                >
                  {selectedComplaint.documentName || "Open Evidence Document"}
                </a>
              </div>
            )}

            <form onSubmit={handleResolveComplaint} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Set Resolution Status</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {(["pending", "under_review", "resolved", "rejected"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setResolutionStatus(st)}
                      className={`py-2 rounded-xl text-xs font-bold capitalize border transition-all ${
                        resolutionStatus === st
                          ? st === "resolved" ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : st === "rejected" ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                          : st === "under_review" ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-amber-500 text-white border-amber-500 shadow-xs"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {st.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Official Decision & Feedback Note (Visible to Student)
                </label>
                <textarea
                  rows={3}
                  required
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="e.g. Verified with Department Chair. Continuous assessment grade updated to 18/20 on the official portal."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={resolving || !resolutionNote.trim()}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  {resolving ? "Saving..." : "Save Resolution"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: EXPAND MEMBER SEATS */}
      {showExpandModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 border border-slate-200">
            <div className="space-y-1 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                <Zap className="w-6 h-6 fill-amber-500" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">Increase Member Capacity</h3>
              <p className="text-xs text-slate-500">
                Add extra teacher or student seats to your school with instant Mobile Money payment.
              </p>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {expandSuccess ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-900 text-base">{expandSuccess}</h4>
                <p className="text-xs text-slate-500">Updating organization capacity...</p>
              </div>
            ) : (
              <form onSubmit={handleExpandSeats} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    How many member seats do you want to add?
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 mb-2">
                    {[5, 10, 20, 50].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setExtraSeats(num)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                          extraSeats === num
                            ? "border-amber-500 bg-amber-50 text-amber-950 ring-1 ring-amber-400"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        +{num} Seats
                      </button>
                    ))}
                  </div>

                  <input
                    type="number"
                    min={1}
                    max={500}
                    required
                    value={extraSeats}
                    onChange={(e) => setExtraSeats(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Rate:</span>
                    <span className="font-bold text-slate-900">
                      {unitPrice.toLocaleString()} FCFA / member
                      {extraSeats >= 10 && (
                        <span className="ml-1 text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-extrabold">
                          -25% Bulk Rate
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-extrabold text-slate-900 pt-1 border-t border-slate-200">
                    <span>Total Payment:</span>
                    <span className="text-amber-700 text-base">{totalCost.toLocaleString()} FCFA</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Select Mobile Money Operator
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandOperator("mtn")}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        expandOperator === "mtn"
                          ? "border-amber-500 bg-amber-50 text-amber-950 ring-1 ring-amber-400"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span>MTN MoMo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandOperator("orange")}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        expandOperator === "orange"
                          ? "border-orange-500 bg-orange-50 text-orange-950 ring-1 ring-orange-400"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                      <span>Orange Money</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mobile Money Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={expandPhone}
                    onChange={(e) => setExpandPhone(e.target.value)}
                    placeholder="e.g. 670000000"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowExpandModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={expanding || !expandPhone || extraSeats < 1}
                    className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-amber-600/20"
                  >
                    {expanding ? "Sending Prompt..." : `Pay ${totalCost.toLocaleString()} FCFA`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
