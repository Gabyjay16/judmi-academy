"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { 
  Sparkles, 
  BookOpen, 
  PenTool, 
  LayoutDashboard, 
  KeyRound, 
  ArrowRight, 
  Menu, 
  X, 
  User, 
  LogOut, 
  ShieldCheck, 
  Building2, 
  GraduationCap, 
  CreditCard, 
  Camera,
  Zap,
  Crown,
  ScanLine,
  Music4
} from "lucide-react";
import AdminLoginModal from "@/components/AdminLoginModal";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [quickCode, setQuickCode] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [schoolBranding, setSchoolBranding] = useState<any | null>(null);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const logoClickCount = useRef(0);
  const logoClickTimer = useRef<any>(null);

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    logoClickCount.current += 1;
    if (logoClickTimer.current) clearTimeout(logoClickTimer.current);
    logoClickTimer.current = setTimeout(() => {
      logoClickCount.current = 0;
    }, 600);
    if (logoClickCount.current >= 3) {
      logoClickCount.current = 0;
      setAdminLoginOpen(true);
    }
  };

  const isSchoolPage = pathname.startsWith("/school/");

  // Read stored user immediately on load to prevent flash of guest state
  const [currentUser, setCurrentUser] = useState<any | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("judmi_user");
        return cached ? JSON.parse(cached) : null;
      } catch {
        return null;
      }
    }
    return null;
  });

  const isDashboardRoute = pathname.startsWith("/dashboard") || 
                           pathname.startsWith("/org") || 
                           pathname.startsWith("/student") || 
                           pathname.startsWith("/admin");

  useEffect(() => {
    fetchSession();
  }, [pathname]);

  // On a public school-branded page, show that school's abbreviation in the
  // top header instead of the default "Judmi Academy" branding.
  useEffect(() => {
    if (!isSchoolPage) {
      setSchoolBranding(null);
      return;
    }
    const slug = pathname.split("/")[2] || "";
    const key = new URLSearchParams(window.location.search).get("key") || "";
    if (!slug || !key) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/school/${encodeURIComponent(slug)}?key=${encodeURIComponent(key)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!data?.success || cancelled) return;
        setSchoolBranding(data.branding || { name: data.organization?.name });
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [pathname, isSchoolPage]);

  const fetchSession = async () => {
    try {
      const storedToken = typeof window !== "undefined" ? localStorage.getItem("judmi_session") || "" : "";
      const headers: Record<string, string> = {};
      if (storedToken) {
        headers["x-session-token"] = storedToken;
      }

      const res = await fetch("/api/auth", { 
        headers,
        credentials: "include" 
      });
      const data = await res.json();
      if (data?.user) {
        setCurrentUser(data.user);
        if (typeof window !== "undefined") {
          if (data.token) localStorage.setItem("judmi_session", data.token);
          localStorage.setItem("judmi_user", JSON.stringify(data.user));
        }
      } else {
        // If we still hold a session token, don't wipe the user automatically —
        // treat it as an offline/transient miss and keep the cached user so the
        // navbar doesn't flash into a "logged out" state on public routes.
        if (typeof window !== "undefined" && !storedToken) {
          localStorage.removeItem("judmi_user");
          setCurrentUser(null);
        }
      }
    } catch {
      // Keep cached user on network delay
    }
  };

  const handleLogout = async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("judmi_session");
        localStorage.removeItem("judmi_user");
      }
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
        credentials: "include"
      });
      setCurrentUser(null);
      setUserDropdownOpen(false);
      setMobileMenuOpen(false);
      router.push("/login");
    } catch (e) {
      console.error("Logout error:", e);
      router.push("/login");
    }
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickCode.trim()) {
      router.push(`/test/${quickCode.trim().toUpperCase()}`);
      setQuickCode("");
      setMobileMenuOpen(false);
    }
  };

  const isUserAuthenticated = Boolean(currentUser || isDashboardRoute);
  const isSchoolManaged = Boolean(currentUser?.orgId);

  // Build an abbreviation from a school's brand name (e.g. "Springfield Academy" -> "SA").
  const schoolName = schoolBranding?.brandName || schoolBranding?.name || "";
  const schoolAbbr = schoolName
    .split(/\s+/)
    .filter(Boolean)
    .map((w: string) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase() || "SA";

  // Compute navigation links based on user role
  let navLinks: { href: string; label: string; icon: any }[] = [];

  if (!currentUser && !isDashboardRoute) {
    // Visitor on public pages
    navLinks = [
      { href: "/pricing", label: "Pricing & Plans", icon: CreditCard },
    ];
  } else if (currentUser?.role === "student" || pathname.startsWith("/student")) {
    // Student Links
    navLinks = [
      { href: "/student/dashboard", label: "Student Hub", icon: GraduationCap },
      { href: "/pricing", label: "Plans", icon: CreditCard },
    ];
  } else if (currentUser?.role === "org_admin" || pathname.startsWith("/org")) {
    // School Org Administrator
    navLinks = [
      { href: "/org/dashboard", label: "School Hub", icon: Building2 },
      { href: "/dashboard/scan-scripts", label: "Mark Scripts", icon: Camera },
      { href: "/dashboard/extract-info", label: "Extract Info", icon: ScanLine },
      { href: "/dashboard/take-minutes", label: "Take Minutes", icon: Music4 },
      { href: "/dashboard", label: "Teacher Studio", icon: LayoutDashboard },
      { href: "/dashboard/create", label: "Create Exam", icon: BookOpen },
    ];
  } else if (currentUser?.role === "admin" || pathname.startsWith("/admin")) {
    // Super Administrator
    navLinks = [
      { href: "/admin", label: "Admin Panel & Access", icon: ShieldCheck },
      { href: "/dashboard/scan-scripts", label: "Mark Scripts", icon: Camera },
      { href: "/dashboard/extract-info", label: "Extract Info", icon: ScanLine },
      { href: "/dashboard/take-minutes", label: "Take Minutes", icon: Music4 },
      { href: "/org/dashboard", label: "School Hub", icon: Building2 },
      { href: "/dashboard", label: "Exam Studio", icon: LayoutDashboard },
    ];
  } else {
    // Authenticated Teacher
    navLinks = [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/dashboard/scan-scripts", label: "Mark Scripts", icon: Camera },
      { href: "/dashboard/extract-info", label: "Extract Info", icon: ScanLine },
      { href: "/dashboard/create", label: "Create Exam", icon: BookOpen },
    ];
    // Institution teachers only
    if (currentUser?.orgId) {
      navLinks.splice(2, 0, { href: "/dashboard/take-minutes", label: "Take Minutes", icon: Music4 });
    }
    // Independent teachers (not registered under a school) keep the pricing entry.
    if (!currentUser?.orgId) {
      navLinks.push({ href: "/pricing", label: "Pricing", icon: CreditCard });
    }
  }

  const logoContent = isSchoolPage && schoolBranding ? (
    <>
      <div
        className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-xl flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform overflow-hidden"
        style={{ backgroundColor: schoolBranding.brandColor || "#1a2c47" }}
      >
        {schoolBranding.logoData ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={schoolBranding.logoData} alt={schoolName} className="w-full h-full object-contain p-1" />
        ) : (
          <span className="text-base font-black">{schoolAbbr}</span>
        )}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-lg sm:text-2xl font-extrabold tracking-tight text-navy-900 leading-snug">
          {schoolName || schoolAbbr}
        </span>
        <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold tracking-wide uppercase mt-0.5">
          Student Enrolment Portal
        </span>
      </div>
    </>
  ) : currentUser?.branding ? (
    <>
      <div
        className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-xl flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform overflow-hidden"
        style={{ backgroundColor: currentUser.branding.brandColor || "#1a2c47" }}
      >
        {currentUser.branding.logoData ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentUser.branding.logoData} alt={currentUser.branding.brandName} className="w-full h-full object-contain p-1" />
        ) : (
          <span className="text-base font-black">
            {(currentUser.branding.brandName || "S").trim().charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-lg sm:text-2xl font-extrabold tracking-tight text-navy-900 leading-snug break-words">
          {currentUser.branding.brandName || currentUser.organizationName}
        </span>
        <span className="text-[10px] sm:text-[11px] text-gold-600 font-semibold tracking-[0.18em] uppercase mt-0.5">
          School Portal
        </span>
      </div>
    </>
  ) : (
    <>
      <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-xl bg-navy-800 flex items-center justify-center text-gold-400 shadow-md group-hover:scale-105 transition-transform">
        <Sparkles className="w-5 h-5" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-lg sm:text-2xl font-extrabold tracking-tight text-navy-900 leading-snug">
          Judmi Academy
        </span>
        <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold tracking-wide uppercase mt-0.5">
          AI Exams & Academic Hub
        </span>
      </div>
    </>
  );

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-slate-200/80 shadow-[0_1px_2px_rgba(16,26,46,0.05)]">
      <div className="h-[3px] w-full bg-gradient-to-r from-navy-900 via-gold-400 to-navy-900" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-[72px]">
          
          {/* Logo — taps three times fast to open the school admin sign-in */}
          {currentUser ? (
            <button
              type="button"
              onClick={handleLogoClick}
              aria-label="School logo — tap three times to open school admin sign-in"
              title="School logo"
              className="flex items-center gap-2.5 sm:gap-3 group min-w-0 flex-1 text-left cursor-pointer"
            >
              {logoContent}
            </button>
          ) : (
            <Link href={isSchoolPage ? pathname + window.location.search : "/"} className="flex items-center gap-2.5 sm:gap-3 group min-w-0 flex-1">
              {logoContent}
            </Link>
          )}

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-navy-50 text-navy-900 font-bold"
                      : "text-slate-600 hover:text-navy-900 hover:bg-slate-100/70"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-navy-700" : "text-slate-400"}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Area: Test Code + Upgrade/Logout or Profile */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Quick Test Code Input */}
            <form onSubmit={handleJoinByCode} className="relative flex items-center">
              <div className="absolute left-3 text-slate-400">
                <KeyRound className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                placeholder="Code (e.g. BIO101)"
                value={quickCode}
                onChange={(e) => setQuickCode(e.target.value.toUpperCase())}
                maxLength={8}
                className="pl-8 pr-8 py-1.5 text-xs uppercase font-mono tracking-wider bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-500 w-36 transition-all placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!quickCode.trim()}
                className="absolute right-1.5 p-1 text-slate-400 hover:text-navy-700 disabled:opacity-30 transition-colors"
                title="Join Test"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* If Authenticated: Show Upgrade & Profile with Logout */}
            {isUserAuthenticated ? (
              <div className="flex items-center gap-2">
                {/* Upgrade Button — hidden for school-managed accounts (billing is central) */}
                {!isSchoolManaged && (
                  <Link
                    href="/checkout?plan=individual"
                    className="px-3 py-1.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-navy-950 font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5 fill-navy-950" />
                    <span>Upgrade</span>
                  </Link>
                )}

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 p-1.5 pr-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-left transition-colors shadow-xs"
                  >
                    <div className="w-7 h-7 rounded-lg bg-navy-800 text-white font-bold text-xs flex items-center justify-center">
                      {(currentUser?.name || "U")[0]}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 leading-tight">
                        {(currentUser?.name || "Account").split(" ")[0]}
                      </div>
                      <div className="text-[10px] text-slate-500 capitalize leading-tight">
                        {(currentUser?.role || "Teacher").replace("_", " ")}
                      </div>
                    </div>
                  </button>

                  {/* Dropdown menu */}
                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 space-y-1 z-50 animate-fade-in text-xs">
                      <div className="p-2.5 border-b border-slate-100">
                        <div className="font-bold text-slate-900">{currentUser?.name || "Account"}</div>
                        <div className="text-[11px] text-slate-500 truncate">{currentUser?.email || ""}</div>
                        {currentUser?.organizationName && (
                          <div className="text-[11px] text-navy-700 font-semibold mt-1">
                            🏫 {currentUser.organizationName}
                          </div>
                        )}
                      </div>

                      {/* School teacher accounts: Admin Login + Logout only */}
                      {currentUser?.role === "teacher" && (
                        <button
                          type="button"
                          onClick={() => {
                            setUserDropdownOpen(false);
                            setAdminLoginOpen(true);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-navy-900 bg-navy-50 hover:bg-navy-100 font-bold"
                        >
                          <Building2 className="w-4 h-4 text-navy-700" />
                          <span>Admin Login (School Admin)</span>
                        </button>
                      )}

                      {currentUser?.role !== "teacher" && !isSchoolManaged ? (
                        <Link
                          href="/checkout?plan=individual"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-gold-800 bg-gold-50 hover:bg-gold-100 font-bold"
                        >
                          <Zap className="w-4 h-4 text-gold-600 fill-gold-600" />
                          <span>Upgrade Account</span>
                        </Link>
                      ) : null}

                      {currentUser?.role !== "teacher" && (
                        <Link
                          href="/dashboard"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 font-medium"
                        >
                          <LayoutDashboard className="w-4 h-4 text-navy-700" />
                          <span>Teacher Dashboard</span>
                        </Link>
                      )}

                      {currentUser?.role !== "teacher" && (
                        <Link
                          href="/dashboard/scan-scripts"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 font-medium"
                        >
                          <Camera className="w-4 h-4 text-navy-700" />
                          <span>Mark Scripts Studio</span>
                        </Link>
                      )}

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-semibold"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Visitor Logged Out Buttons */
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-950 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-navy-800 hover:bg-navy-900 rounded-xl shadow-xs transition-all"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 px-4 pt-3 pb-5 space-y-3 bg-white text-xs shadow-xl animate-fade-in">
          {/* Quick Join Test Code Input */}
          <form onSubmit={handleJoinByCode} className="relative flex items-center">
            <div className="absolute left-3 text-slate-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Enter Test Code (e.g. BIO101)"
              value={quickCode}
              onChange={(e) => setQuickCode(e.target.value.toUpperCase())}
              maxLength={8}
              className="w-full pl-9 pr-10 py-2.5 text-sm uppercase font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
            <button
              type="submit"
              disabled={!quickCode.trim()}
              className="absolute right-2 p-1.5 text-navy-700 disabled:opacity-30"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          {/* Navigation Links */}
          <div className="space-y-1 pt-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-slate-700 hover:bg-navy-50 hover:text-navy-900"
              >
                <link.icon className="w-4 h-4 text-slate-400" />
                <span>{link.label}</span>
              </Link>
            ))}

            {/* Authenticated User Mobile Controls */}
            {isUserAuthenticated ? (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                {/* School teacher accounts: Admin Login (School Admin) */}
                {currentUser?.role === "teacher" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setAdminLoginOpen(true);
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2"
                  >
                    <Building2 className="w-4 h-4 text-gold-400" />
                    <span>Admin Login (School Admin)</span>
                  </button>
                )}

                {/* Upgrade Account Button — hidden for school-managed accounts */}
                {!isSchoolManaged && (
                  <Link
                    href="/checkout?plan=individual"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-3 px-4 rounded-xl bg-gold-500 hover:bg-gold-400 text-navy-950 font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4 fill-navy-950" />
                    <span>Upgrade Account</span>
                  </Link>
                )}

                {/* Logout Button */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-2.5 px-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 font-bold text-xs hover:bg-rose-100 transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout ({currentUser?.name || "Sign Out"})</span>
                </button>
              </div>
            ) : (
              /* Visitor Public Buttons */
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 text-center rounded-xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 text-center rounded-xl bg-navy-800 text-white font-bold hover:bg-navy-900 shadow-xs"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      <AdminLoginModal open={adminLoginOpen} onClose={() => setAdminLoginOpen(false)} orgId={currentUser?.orgId || null} />
    </header>
  );
}
export { Navbar };
