"use client";

import { useState } from "react";
import { ShieldCheck, X, Loader2, KeyRound, Lock } from "lucide-react";

interface AdminLoginModalProps {
  open: boolean;
  onClose: () => void;
  orgId: string | null | undefined;
}

export default function AdminLoginModal({ open, onClose, orgId }: AdminLoginModalProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError("Please enter your email or username and password.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          email: identifier.trim(),
          username: identifier.trim(),
          password,
          adminLogin: true,
          requireOrgId: orgId ? String(orgId) : null,
        }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json?.user) {
        setError(json?.error || "Sign-in failed. Please check your details.");
        return;
      }
      // Session switched successfully — point storage at the admin session and go to the School Hub.
      if (typeof window !== "undefined") {
        if (json.token) localStorage.setItem("judmi_session", json.token);
        localStorage.setItem("judmi_user", JSON.stringify(json.user));
      }
      window.location.href = "/org/dashboard";
    } catch {
      setError("Sign-in failed. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="School admin sign in"
    >
      <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-fade-in">
        {/* Thin accent line */}
        <div className="h-[3px] w-full bg-gradient-to-r from-navy-900 via-gold-400 to-navy-900" />

        <div className="relative p-6 sm:p-8">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-navy-900 text-gold-400 flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>

          <h2 className="text-2xl font-extrabold text-navy-900 tracking-tight">School Admin Sign-in</h2>
          <p className="mt-1.5 text-[15px] text-slate-600">
            Enter the school administrator credentials to open the School Admin dashboard.
          </p>

          {error && (
            <div className="mt-4 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-sm font-medium text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="admin-identifier" className="block text-[13px] font-semibold text-slate-600 mb-1.5">
                Email or Username
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="admin-identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin@school.edu"
                  autoComplete="username"
                  className="w-full pl-10 pr-3 py-2.5 text-base bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-500 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-[13px] font-semibold text-slate-600 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-3 py-2.5 text-base bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-500 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-gold-400" />
                  Open School Admin
                </>
              )}
            </button>
          </form>

          <p className="mt-4 text-[13px] text-slate-400 text-center">
            Only school administrator accounts can sign in here.
          </p>
        </div>
      </div>
    </div>
  );
}