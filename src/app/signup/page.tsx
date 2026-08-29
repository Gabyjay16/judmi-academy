"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Sparkles, 
  Lock, 
  Phone, 
  User, 
  ArrowRight, 
  GraduationCap, 
  BookOpen, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  Network
} from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [role, setRole] = useState<"student" | "teacher" | "org_admin">("teacher");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const roleParam = params.get("role");
      const planParam = params.get("plan");
      const schoolParam = params.get("school") || params.get("org");

      if (schoolParam) setSchoolCode(schoolParam);

      if (planParam === "individual") {
        router.push("/checkout?plan=individual");
      } else if (planParam === "school_pro" || planParam === "school" || planParam === "org") {
        router.push("/checkout?plan=school_pro");
      } else if (roleParam === "student") {
        setRole("student");
      } else if (roleParam === "org_admin") {
        setRole("org_admin");
      } else {
        setRole("teacher");
      }
    }
  }, [router]);

  // Fetch departments whenever schoolCode changes
  useEffect(() => {
    if (role === "student" && schoolCode.trim().length >= 3) {
      const fetchDepts = async () => {
        try {
          const res = await fetch(`/api/org/departments?schoolCode=${encodeURIComponent(schoolCode.trim())}`);
          const data = await res.json();
          if (data?.departments) {
            setDepartments(data.departments);
          } else {
            setDepartments([]);
          }
        } catch {
          setDepartments([]);
        }
      };
      fetchDepts();
    } else {
      setDepartments([]);
      setDepartmentId("");
    }
  }, [schoolCode, role]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate password confirmation
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please retype your password correctly.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    // Validate student matricule if school code is provided
    if (role === "student" && schoolCode.trim() && !studentId.trim()) {
      setError("Student Matricule is strictly required when linking your registration to a school organization.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "signup",
          name,
          phone,
          email: phone, // Pass phone as primary user identifier
          password,
          role,
          schoolCode: role === "student" && schoolCode.trim() ? schoolCode.trim() : undefined,
          departmentId: role === "student" && departmentId ? departmentId : undefined,
          organizationName: role === "org_admin" ? organizationName : undefined,
          studentId: role === "student" ? studentId : undefined,
        }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch (parseErr) {
        console.error("Response JSON parse error:", parseErr);
      }

      if (!res.ok || !data?.success) {
        setError(data?.error || "Registration failed. Please verify your details and try again.");
        setLoading(false);
        return;
      }

      // Store token in localStorage for session resilience
      if (data.token && typeof window !== "undefined") {
        localStorage.setItem("judmi_session", data.token);
        if (data.user) {
          localStorage.setItem("judmi_user", JSON.stringify(data.user));
        }
      }

      if (role === "student") {
        router.push("/student/dashboard");
      } else if (role === "org_admin") {
        router.push("/org/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during registration.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 space-y-6">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Academic Portal</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Create Your Account
        </h1>
        <p className="text-xs text-slate-500">
          Engineered for modern classrooms across West & Central Africa
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl shadow-slate-200/50 space-y-6">
        
        {/* Role Selector Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100/80 rounded-2xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setRole("teacher")}
            className={`py-2 px-1 rounded-xl flex items-center justify-center gap-1 transition-all ${
              role === "teacher"
                ? "bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200 font-extrabold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Solo Teacher</span>
          </button>

          <button
            type="button"
            onClick={() => setRole("student")}
            className={`py-2 px-1 rounded-xl flex items-center justify-center gap-1 transition-all ${
              role === "student"
                ? "bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200 font-extrabold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Student</span>
          </button>

          <button
            type="button"
            onClick={() => setRole("org_admin")}
            className={`py-2 px-1 rounded-xl flex items-center justify-center gap-1 transition-all ${
              role === "org_admin"
                ? "bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200 font-extrabold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>School / Org</span>
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          
          {/* Organization Name (For School Owner) */}
          {role === "org_admin" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                School / Institution Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="e.g. St. Jude International Academy"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            </div>
          )}

          {/* User Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {role === "org_admin" ? "Administrator Name" : "Full Name"} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={role === "student" ? "e.g. Jane Doe" : "e.g. Dr. Eleanor Vance"}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Phone Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 670000000 or +237..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Student Fields: School Code, Matricule, and Department Dropdown */}
          {role === "student" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>School Organization Code (Optional)</span>
                  <span className="text-[11px] font-normal text-indigo-600 font-semibold">Enrolled in a school?</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={schoolCode}
                    onChange={(e) => setSchoolCode(e.target.value)}
                    placeholder="e.g. springfield-academy (or leave blank if independent)"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  * If your school gave you a School Code, enter it here to link your tests and academic complaints.
                </p>
              </div>

              {departments.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Department / Faculty (Optional)</span>
                    <span className="text-[11px] font-normal text-indigo-600 font-semibold">{departments.length} Available</span>
                  </label>
                  <div className="relative">
                    <Network className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <select
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
                    >
                      <option value="">Select your department (Optional)...</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name} {dept.code ? `(${dept.code})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Student Matricule {schoolCode.trim() ? <span className="text-rose-500">* Required with School Code</span> : "(Optional)"}</span>
                </label>
                <input
                  type="text"
                  required={Boolean(schoolCode.trim())}
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g. MAT-2026-104"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Retype Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Retype password"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !name || !phone || !password || !confirmPassword}
              className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
            >
              <span>{loading ? "Creating Account..." : "Create Account"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </form>

        <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="text-indigo-600 font-bold hover:underline">
            Sign In
          </Link>
        </div>

      </div>

    </div>
  );
}
