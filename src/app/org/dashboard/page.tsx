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
  Check
} from "lucide-react";

export default function OrgDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Seat Expansion State
  const [showExpandModal, setShowExpandModal] = useState(false);
  const [extraSeats, setExtraSeats] = useState(10);
  const [expandOperator, setExpandOperator] = useState<"mtn" | "orange">("mtn");
  const [expandPhone, setExpandPhone] = useState("");
  const [expanding, setExpanding] = useState(false);
  const [expandSuccess, setExpandSuccess] = useState<string | null>(null);

  // New sub-account form
  const [subRole, setSubRole] = useState<"teacher" | "student">("teacher");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [studentId, setStudentId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"teachers" | "students" | "tests">("teachers");
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    fetchOrg();
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
          role: subRole,
          studentId: subRole === "student" ? studentId : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || "Failed to create sub-account");
      } else {
        setShowAddModal(false);
        setName("");
        setEmail("");
        setStudentId("");
        fetchOrg();
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to create sub-account");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExpandSeats = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpanding(true);
    setFormError(null);

    try {
      // Simulate mobile money payment
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
  const teachers = data?.teachers || [];
  const students = data?.students || [];
  const tests = data?.tests || [];

  const seatPercent = Math.min(100, Math.round((seats.used / (seats.total || 1)) * 100));

  // Seat pricing calculation: 2000 FCFA for 1-9 seats, 1500 FCFA for 10+ seats
  const unitPrice = extraSeats >= 10 ? 1500 : 2000;
  const totalCost = extraSeats * unitPrice;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Org Header */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <Building2 className="w-4 h-4" />
            <span>School / Institutional Organization</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {organization.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Manage teacher and student sub-accounts under your institutional subscription.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="bg-white/10 px-3.5 py-2.5 rounded-2xl border border-white/15 backdrop-blur-xs flex items-center gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">School Invite Code:</span>
              <span className="font-mono font-bold text-white tracking-wide">{organization.slug || organization.id}</span>
            </div>
            <button
              onClick={() => {
                if (typeof navigator !== "undefined" && (organization.slug || organization.id)) {
                  navigator.clipboard.writeText(organization.slug || organization.id);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                }
              }}
              className="px-2.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold transition-colors"
            >
              {copiedCode ? "✓ Copied!" : "Copy Code"}
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/30 transition-all flex items-center gap-1.5 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Sub-Account</span>
          </button>
        </div>
      </div>

      {/* Seat Utilization Bar with Expand Option */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-bold text-slate-900 text-sm">Organization Member Capacity: </span>
            <span className="text-indigo-700 font-bold">{seats.used}</span> of <span className="font-bold text-slate-700">{seats.total}</span> sub-accounts active
          </div>
          
          <div className="flex items-center gap-3">
            <span className="font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 text-xs">
              {seats.available} seats available
            </span>

            <button
              onClick={() => {
                setFormError(null);
                setShowExpandModal(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 shrink-0"
            >
              <Zap className="w-3.5 h-3.5 fill-slate-950" />
              <span>+ Increase Sub-Members</span>
            </button>
          </div>
        </div>

        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
            style={{ width: `${seatPercent}%` }}
          />
        </div>
      </div>

      {/* Main Tabs */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab("teachers")}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === "teachers" ? "bg-white text-indigo-700 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Teachers ({teachers.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("students")}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === "students" ? "bg-white text-indigo-700 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Students ({students.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("tests")}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === "tests" ? "bg-white text-indigo-700 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Organization Tests ({tests.length})</span>
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Sub-Account</span>
          </button>
        </div>

        {/* Teachers Tab */}
        {activeTab === "teachers" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/75 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">Teacher Name</th>
                  <th className="px-4 py-3.5">Official Phone / Email</th>
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
                    <td className="px-4 py-4 font-mono text-slate-600">{t.email}</td>
                    <td className="px-4 py-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                        Active Sub-Account
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

        {/* Students Tab */}
        {activeTab === "students" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/75 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">Student Name</th>
                  <th className="px-4 py-3.5">Student Matricule</th>
                  <th className="px-4 py-3.5">Phone / Email</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Added Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-4 font-bold text-slate-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-purple-50 text-purple-700 font-bold text-xs flex items-center justify-center">
                        {s.name[0]}
                      </div>
                      <span>{s.name}</span>
                    </td>
                    <td className="px-4 py-4 font-mono text-slate-600">{s.studentId || "—"}</td>
                    <td className="px-4 py-4 font-mono text-slate-600">{s.email}</td>
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

        {/* Tests Tab */}
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

      </div>

      {/* 1. Expand Member Seats Modal */}
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
                {/* Quick Selection Buttons */}
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

                {/* Pricing Summary Box */}
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

                {/* Operator Selector */}
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

                {/* Mobile Money Phone */}
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

      {/* 2. Add Sub-Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 border border-slate-200">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Add School Sub-Account</h3>
              <p className="text-xs text-slate-500">
                Create a faculty teacher or enrolled student sub-account under your school subscription.
              </p>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setSubRole("teacher")}
                className={`py-2 rounded-lg transition-colors ${
                  subRole === "teacher" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600"
                }`}
              >
                Teacher Sub-Account
              </button>
              <button
                type="button"
                onClick={() => setSubRole("student")}
                className={`py-2 rounded-lg transition-colors ${
                  subRole === "student" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600"
                }`}
              >
                Student Sub-Account
              </button>
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

              {subRole === "student" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Student Matricule</label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g. MAT-2026-089"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
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
                  {submitting ? "Creating..." : "Save Sub-Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
