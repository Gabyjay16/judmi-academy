"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Lock, Mail, ArrowRight, GraduationCap, BookOpen, Sparkles, AlertCircle, UserPlus, Building2 } from "lucide-react";

type Mode = "login" | "signup";
type Role = "student" | "teacher";

interface Branding {
  brandName: string;
  logoData: string | null;
  brandColor: string;
}

export default function SchoolBrandedPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const slug = params?.slug || "";

  const [branding, setBranding] = useState<Branding | null>(null);
  const [org, setOrg] = useState<{ id: string; name: string } | null>(null);
  const [loadingBrand, setLoadingBrand] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<Role>("teacher");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [year, setYear] = useState("");
  const [departments, setDepartments] = useState<{ id: string; name: string; code: string | null }[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const brandColor = branding?.brandColor || "#4f46e5";
  const useLight = useMemo(() => {
    if (!brandColor) return false;
    const hex = brandColor.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance > 186;
  }, [brandColor]);

  // Resolve branding using the private access key from the URL.
  useEffect(() => {
    if (!slug) return;
    const key = searchParams.get("key") || "";
    if (!key) {
      setNotFound(true);
      setLoadingBrand(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/school/${encodeURIComponent(slug)}?key=${encodeURIComponent(key)}`);
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        if (!data?.success) {
          setNotFound(true);
          return;
        }
        setBranding(data.branding);
        setOrg({ id: data.organization.id, name: data.organization.name });
        setError(null);
      } catch {
        setNotFound(true);
      } finally {
        setLoadingBrand(false);
      }
    })();
  }, [slug, searchParams]);

  // Load the school's added departments so students can pick one at signup.
  useEffect(() => {
    if (!org?.id) return;
    (async () => {
      try {
        const res = await fetch(`/api/org/departments?orgId=${encodeURIComponent(org.id)}`);
        const data = await res.json();
        if (data?.departments) {
          setDepartments(data.departments);
        }
      } catch {}
    })();
  }, [org?.id]);

  const displayName = branding?.brandName || org?.name || "School";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return;
    setError(null);
    setLoading(true);
    try {
      const body: any = {
        action: mode,
        orgId: org.id,
        orgSlug: slug,
        password,
        role,
      };
      if (mode === "login") {
        body.email = email;
        body.phone = email;
      } else {
        body.name = name;
        if (role === "student") {
          body.studentId = studentId;
          body.departmentId = departmentId || null;
          body.year = year;
        }
        body.email = email;
        body.phone = email;
      }

      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {}

      if (!res.ok || !data?.success) {
        setError(data?.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      if (data.token && typeof window !== "undefined") {
        localStorage.setItem("judmi_session", data.token);
        if (data.user) localStorage.setItem("judmi_user", JSON.stringify(data.user));
      }

      const user = data.user;
      if (user.role === "org_admin") router.push("/org/dashboard");
      else if (user.role === "student") router.push("/student/dashboard");
      else router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Network error. Please try again.");
      setLoading(false);
    }
  };

  if (loadingBrand) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white mx-auto shadow-md animate-pulse">
            <Sparkles className="w-6 h-6" />
          </div>
          <p className="text-xs text-slate-500">Loading school portal...</p>
        </div>
      </div>
    );
  }

  // Invalid / missing access key => indistinguishable "not found" (isolation).
  if (notFound || !branding) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-slate-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Page not found</h1>
          <p className="text-sm text-slate-500">
            The link you followed is invalid or no longer available. Please contact your school administrator
            for the correct access link.
          </p>
          <a href="/" className="mt-2 inline-block text-sm font-bold text-indigo-600 hover:underline">
            Go to Judmi Academy
          </a>
        </div>
      </div>
    );
  }

  const txt = useLight ? "#1e293b" : "#ffffff";
  const muted = useLight ? "#475569" : "#e2e8f0";

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12" style={{ backgroundColor: brandColor }}>
      <div className="max-w-md w-full space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg overflow-hidden ring-4"
            style={{ background: useLight ? "#ffffff" : "rgba(255,255,255,0.15)", borderColor: txt }}
          >
            {branding.logoData ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoData} alt={displayName} className="w-full h-full object-contain" />
            ) : (
              <GraduationCap className="w-8 h-8" style={{ color: txt }} />
            )}
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: txt }}>
            {displayName}
          </h1>
          <p className="text-xs font-medium" style={{ color: muted }}>
            Sign in to access your tests, AI grading studio, and more.
          </p>
        </div>

        {/* Main card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-5">
          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => { setMode("login"); setError(null); }}
              className={`py-2 rounded-xl transition-all ${mode === "login" ? "bg-white shadow-sm" : "text-slate-500"}`}
              style={{ color: mode === "login" ? brandColor : undefined, fontWeight: mode === "login" ? 800 : 700 }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode("signup"); setRole("student"); setError(null); }}
              className={`py-2 rounded-xl transition-all ${mode === "signup" ? "bg-white shadow-sm" : "text-slate-500"}`}
              style={{ color: mode === "signup" ? brandColor : undefined, fontWeight: mode === "signup" ? 800 : 700 }}
            >
              Create Account / Student Register
            </button>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => { setRole("teacher"); setError(null); }}
              className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${role === "teacher" ? "bg-white shadow-sm" : "text-slate-500"} ${mode === "signup" ? "opacity-40 pointer-events-none" : ""}`}
              style={{ color: role === "teacher" ? brandColor : undefined }}
              title={mode === "signup" ? "Teacher accounts are created by your school administrator only." : undefined}
            >
              <BookOpen className="w-3.5 h-3.5" /> Teacher / Staff
            </button>
            <button
              type="button"
              onClick={() => { setRole("student"); setError(null); }}
              className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${role === "student" ? "bg-white shadow-sm" : "text-slate-500"}`}
              style={{ color: role === "student" ? brandColor : undefined }}
            >
              <GraduationCap className="w-3.5 h-3.5" /> Student
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 text-slate-900"
                  style={{ ["--tw-ring-color" as any]: brandColor }}
                />
              </div>
            )}

            {mode === "signup" && role === "student" && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Matricule / Student ID</label>
                  <input
                    type="text"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g. FE20-1234"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 text-slate-900"
                  />
                </div>

                {departments.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Department</label>
                    <select
                      required
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 text-slate-900 bg-white"
                    >
                      <option value="">Select your department...</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}{d.code ? ` (${d.code})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Year / Level</label>
                  <select
                    required
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 text-slate-900 bg-white"
                  >
                    <option value="">Select your year / level...</option>
                    {["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Phone Number or Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. 670000000 or user@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 text-slate-900"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: brandColor }}
              >
                <span>
                  {loading
                    ? "Please wait..."
                    : mode === "login"
                    ? "Sign In"
                    : "Create Account"}
                </span>
                {mode === "login" ? <ArrowRight className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
