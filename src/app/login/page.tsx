"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Sparkles, 
  Lock, 
  Mail, 
  ArrowRight, 
  GraduationCap, 
  BookOpen, 
  Building2, 
  CheckCircle2, 
  AlertCircle
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<"student" | "teacher" | "org_admin" | "admin">("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email, password }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch (parseErr) {
        console.error("Login response parse error:", parseErr);
      }

      if (!res.ok || !data?.success) {
        setError(data?.error || "Login failed. Please verify your credentials and try again.");
        setLoading(false);
        return;
      }

      // Store token & user in localStorage for resilient session persistence
      if (typeof window !== "undefined") {
        if (data.token) localStorage.setItem("judmi_session", data.token);
        if (data.user) localStorage.setItem("judmi_user", JSON.stringify(data.user));
      }

      // Redirect based on user role
      const user = data.user;
      if (user.role === "admin") {
        router.push("/admin");
      } else if (user.role === "org_admin") {
        router.push("/org/dashboard");
      } else if (user.role === "student") {
        router.push("/student/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Network error. Please try again.");
      setLoading(false);
    }
  };

  // Role selector: highlights the chosen account type without filling the form.
  // Fields stay empty so the user types their own credentials.
  const handleSelectRole = (role: "student" | "teacher" | "org_admin") => {
    setSelectedRole(role);
    setEmail("");
    setPassword("");
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        
        {/* Logo & Title */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white mx-auto shadow-md shadow-indigo-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Sign In to Judmi Academy
          </h1>
          <p className="text-xs text-slate-500">
            Access your tests, AI grading studio, and academic transcripts.
          </p>
        </div>

        {/* Role Selector (no autofill — fields stay empty) */}
        <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 p-4 rounded-2xl border border-indigo-100/80 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
            <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
            <span>Who are you signing in as?</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => handleSelectRole("student")}
              className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-colors shadow-xs text-center ${selectedRole === "student" ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-indigo-200/80 text-indigo-700 hover:bg-indigo-50"}`}
            >
              <GraduationCap className="w-4 h-4 shrink-0" />
              <span>Student</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectRole("teacher")}
              className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-colors shadow-xs text-center ${selectedRole === "teacher" ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-indigo-200/80 text-indigo-700 hover:bg-indigo-50"}`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>Teacher</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectRole("org_admin")}
              className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-colors shadow-xs text-center ${selectedRole === "org_admin" ? "bg-purple-600 border-purple-600 text-white" : "bg-white border-indigo-200/80 text-purple-700 hover:bg-indigo-50"}`}
            >
              <Building2 className="w-4 h-4 shrink-0" />
              <span>School / Org</span>
            </button>
          </div>
          <p className="text-[10px] text-slate-500 leading-snug">
            Just pick your account type — your login fields stay empty for you to fill in.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl shadow-slate-200/50 space-y-6">
          
          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Phone Number or Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. 670000000 or user@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-semibold text-indigo-600 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
              >
                <span>{loading ? "Signing in..." : "Sign In to Account"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Footer Navigation */}
          <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500 space-y-2">
            <div>
              Don't have an account yet?{" "}
              <Link href="/signup" className="text-indigo-600 font-bold hover:underline">
                Create an Account
              </Link>
            </div>
            <div>
              Are you an educational institution?{" "}
              <Link href="/pricing" className="text-slate-700 font-semibold hover:underline">
                View School & Org Plans
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
