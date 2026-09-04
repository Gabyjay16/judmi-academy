"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UserCircle, School, Calendar, Hash, Save, ArrowRight, Link2, Pencil } from "lucide-react";

export default function StudentProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [year, setYear] = useState("");
  const [studentId, setStudentId] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [linking, setLinking] = useState(false);

  const years = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"];

  const load = useCallback(async () => {
    try {
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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const incomplete = user && (!user.departmentId || !user.year);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, departmentId, year, studentId }),
      });
      const updated = { ...user, name, departmentId, year, studentId };
      setUser(updated);
      localStorage.setItem("judmi_user", JSON.stringify(updated));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleLinkSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolCode.trim()) return;
    setLinking(true);
    try {
      await fetch("/api/student/link-school", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolCode: schoolCode.trim() }),
      });
      await load();
      setSchoolCode("");
    } finally {
      setLinking(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-5 py-20 flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center animate-pulse">
          <UserCircle className="w-6 h-6" />
        </div>
        <p className="text-sm text-slate-500 font-semibold">Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-6 space-y-5 animate-fade-in">
      <div>
        <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">Student Profile</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
          <UserCircle className="w-7 h-7 text-navy-700" /> My Profile
        </h1>
      </div>

      {incomplete && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Pencil className="w-4 h-4" />
          </span>
          <div className="flex-1">
            <div className="text-sm font-bold text-amber-800">Profile incomplete</div>
            <div className="text-xs text-amber-700">Please set your department and level below.</div>
          </div>
          <button type="button" onClick={() => router.push("/student/profile/setup")} className="text-[11px] font-bold text-amber-700 hover:underline flex items-center gap-0.5 shrink-0">
            Setup <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* School link */}
      {!user?.orgId && (
        <form onSubmit={handleLinkSchool} className="surface-elevated rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <Link2 className="w-4 h-4 text-navy-700" /> Join a School
          </div>
          <p className="text-xs text-slate-500">Enter your school's link code to connect your account.</p>
          <div className="flex gap-2">
            <input type="text" value={schoolCode} onChange={(e) => setSchoolCode(e.target.value)} placeholder="e.g. abc123" className="input-field py-2 text-sm flex-1" />
            <button type="submit" disabled={linking || !schoolCode.trim()} className="btn-primary text-xs px-4 py-2 rounded-xl disabled:opacity-50 shrink-0">
              {linking ? "Joining…" : "Join"}
            </button>
          </div>
        </form>
      )}

      <form onSubmit={handleSave} className="surface-elevated rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="text-sm font-extrabold text-slate-900 flex items-center gap-2 mb-1">
          <Pencil className="w-4 h-4 text-navy-700" /> Edit Profile
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Your Name</label>
          <div className="relative">
            <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="input-field py-2.5 text-sm pl-9" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Department</label>
          <div className="relative">
            <School className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="input-field py-2.5 text-sm pl-9">
              <option value="">Select your department…</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Level / Year</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select value={year} onChange={(e) => setYear(e.target.value)} className="input-field py-2.5 text-sm pl-9">
              <option value="">Select your level…</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Matric / Student ID</label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="e.g. UGR/2023/001" className="input-field py-2.5 text-sm pl-9" />
          </div>
        </div>

        <div className="text-[11px] text-slate-400 font-semibold">
          {user?.orgId ? `School: ${user.organizationName || user.orgId}` : "Not linked to any school yet."}
        </div>

        <button type="submit" disabled={saving} className="btn-primary text-xs py-2.5 rounded-xl w-full flex items-center justify-center gap-1.5 disabled:opacity-50 mt-2">
          {saving ? "Saving…" : <>
            <Save className="w-3.5 h-3.5" /> Save Changes
          </>}
        </button>

        {success && (
          <div className="text-xs text-emerald-600 font-bold text-center">Profile updated successfully!</div>
        )}
      </form>
    </div>
  );
}