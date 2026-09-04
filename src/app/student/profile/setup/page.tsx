"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserCircle, School, Calendar, Hash, CheckCircle2, ArrowRight } from "lucide-react";

export default function ProfileSetupPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [year, setYear] = useState("");
  const [studentId, setStudentId] = useState("");

  const years = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"];

  useEffect(() => {
    const load = async () => {
      try {
        const raw = localStorage.getItem("judmi_user");
        const parsed = raw ? JSON.parse(raw) : null;
        if (!parsed?.id) { router.replace("/login"); return; }

        const res = await fetch("/api/auth");
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          setName(data.user.name || "");
          setDepartmentId(data.user.departmentId || "");
          setYear(data.user.year || "");
          setStudentId(data.user.studentId || "");
        }

        const deptRes = await fetch("/api/org/departments");
        const deptData = await deptRes.json();
        setDepartments(deptData.departments || []);

        // If already has department, redirect to profile page
        if (data.user?.departmentId && data.user?.year) {
          router.replace("/student/profile");
          return;
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentId || !year) return;
    setSaving(true);
    try {
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, departmentId, year, studentId }),
      });
      // Update localStorage
      const updated = { ...user, departmentId, year, name, studentId };
      localStorage.setItem("judmi_user", JSON.stringify(updated));
      router.replace("/student/dashboard");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-5 py-20 flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center animate-pulse">
          <UserCircle className="w-6 h-6" />
        </div>
        <p className="text-sm text-slate-500 font-semibold">Loading…</p>
      </div>
    );
  }

  if (departments.length === 0 && !loading) {
    return (
      <div className="max-w-lg mx-auto px-5 py-20 text-center space-y-4 animate-fade-in">
        <div className="w-16 h-16 rounded-3xl bg-navy-900 text-amber-500 flex items-center justify-center mx-auto">
          <School className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">No Departments Found</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Your school administrator needs to set up departments first. You can set your profile details once that's done.
        </p>
        <button type="button" onClick={() => router.replace("/student/dashboard")} className="btn-primary text-xs px-4 py-2.5 rounded-xl">
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-3xl bg-navy-900 text-amber-500 flex items-center justify-center mx-auto">
          <UserCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-950">Complete Your Profile</h1>
        <p className="text-sm text-slate-500">Tell us a little about yourself so your school can find you.</p>
      </div>

      <form onSubmit={handleSave} className="surface-elevated rounded-2xl p-5 sm:p-6 space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Your Name</label>
          <div className="relative">
            <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="input-field py-2.5 text-sm pl-9" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Department <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <School className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select required value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="input-field py-2.5 text-sm pl-9">
              <option value="">Select your department…</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Level / Year <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select required value={year} onChange={(e) => setYear(e.target.value)} className="input-field py-2.5 text-sm pl-9">
              <option value="">Select your level…</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Matric / Student ID (optional)</label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="e.g. UGR/2023/001" className="input-field py-2.5 text-sm pl-9" />
          </div>
        </div>

        <button type="submit" disabled={saving || !departmentId || !year} className="btn-primary text-xs py-3 rounded-xl w-full flex items-center justify-center gap-1.5 disabled:opacity-50 mt-4">
          {saving ? "Saving…" : <>
            <CheckCircle2 className="w-4 h-4" /> Complete Profile
            <ArrowRight className="w-4 h-4" />
          </>}
        </button>
      </form>
    </div>
  );
}