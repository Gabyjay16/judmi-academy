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
  AlertCircle 
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
          schoolCode: role === "teacher" && schoolCode.trim() ? schoolCode.trim() : undefined,
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

      // Store token & user in localStorage for resilient session persistence
      if (typeof window !== "undefined") {
        if (data.token) localStorage.setItem("judmi_session", data.token);
        if (data.user) localStorage.setItem("judmi_user", JSON.stringify(data.user));
      }

      if (role === "org_admin") {
        router.push("/org/dashboard");
      } else if (role === "student") {
        router.push("/student/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Signup failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white mx-auto shadow-md shadow-indigo-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Create Your Account
          </h1>
          <p className="text-xs text-slate-500">
            Choose your account type below.
          </p>
        </div>

        {/* Role Picker Card */}
        <div className="grid grid-cols-3 gap-2.5 p-1.5 bg-slate-100/90 rounded-2xl">
          <button
            type="button"
            onClick={() => setRole("teacher")}
            className={`p-3 rounded-xl flex flex-col items-center gap-1.5 text-center transition-all ${
              role === "teacher"
                ? "bg-white text-indigo-700 shadow-sm font-bold ring-1 ring-slate-200"
                : "text-slate-600 hover:text-slate-900 font-medium"
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-xs">Solo Teacher</span>
          </button>

          <button
            type="button"
            onClick={() => setRole("org_admin")}
            className={`p-3 rounded-xl flex flex-col items-center gap-1.5 text-center transition-all ${
              role === "org_admin"
                ? "bg-white text-indigo-700 shadow-sm font-bold ring-1 ring-slate-200"
                : "text-slate-600 hover:text-slate-900 font-medium"
            }`}
          >
            <Building2 className="w-5 h-5" />
            <span className="text-xs">School / Org</span>
          </button>

          <button
            type="button"
            onClick={() => setRole("student")}
            className={`p-3 rounded-xl flex flex-col items-center gap-1.5 text-center transition-all ${
              role === "student"
                ? "bg-white text-indigo-700 shadow-sm font-bold ring-1 ring-slate-200"
                : "text-slate-600 hover:text-slate-900 font-medium"
            }`}
          >
            <GraduationCap className="w-5 h-5" />
            <span className="text-xs">Student (Free)</span>
          </button>
        </div>

        {/* Signup Form */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl shadow-slate-200/50 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {role !== "student" && (
            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-xs text-indigo-900 flex items-center justify-between">
              <span>Looking for paid subscription plans?</span>
              <Link href="/pricing" className="font-bold text-indigo-700 underline">
                View Pricing & Checkout
              </Link>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            {role === "org_admin" && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  School / Organization Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="e.g. St. Jude International School"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Doe"
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

            {role === "teacher" && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>School Organization Code (Optional)</span>
                  <span className="text-[11px] font-normal text-indigo-600 font-semibold">Belong to a school?</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={schoolCode}
                    onChange={(e) => setSchoolCode(e.target.value)}
                    placeholder="e.g. st-jude-academy (or leave blank if independent)"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  * Enter your school's code to automatically link your account and get full school-sponsored Pro access.
                </p>
              </div>
            )}

            {role === "student" && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Student Matricule (Optional)
                </label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g. MAT-2026-104"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
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
                  placeholder="Retype your password"
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
                <span>{loading ? "Creating account..." : "Complete Free Registration"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-600 font-bold hover:underline">
              Log In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
