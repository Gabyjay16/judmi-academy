"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  KeyRound, 
  Building2, 
  Users, 
  BookOpen, 
  Check, 
  X, 
  Copy, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ExternalLink, 
  CreditCard, 
  Sparkles, 
  ArrowRight,
  Zap,
  RotateCcw,
  Search,
  Crown,
  Smartphone
} from "lucide-react";

export default function AdminPanelPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allOrgs, setAllOrgs] = useState<any[]>([]);
  const [systemSettings, setSystemSettings] = useState<{ freeAllTeachers: boolean; freeAllOrganizations: boolean }>({
    freeAllTeachers: false,
    freeAllOrganizations: false,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"resets" | "subscriptions" | "organizations">("subscriptions");

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch password reset requests
      const resetRes = await fetch("/api/auth/reset-password");
      if (resetRes.status === 403 || resetRes.status === 401) {
        router.push("/login");
        return;
      }
      const resetData = await resetRes.json();
      if (resetData.requests) setRequests(resetData.requests);

      // 2. Fetch users and subscriptions
      const subRes = await fetch("/api/admin/subscriptions");
      const subData = await subRes.json();
      if (subData.users) setAllUsers(subData.users);
      if (subData.organizations) setAllOrgs(subData.organizations);
      if (subData.systemSettings) setSystemSettings(subData.systemSettings);
    } catch (e) {
      console.error("Failed to load admin data:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSystemSetting = async (key: "free_all_teachers" | "free_all_organizations", currentValue: boolean) => {
    const newValue = !currentValue;
    try {
      setActionLoading(key);
      const res = await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_system_setting",
          settingKey: key,
          settingValue: newValue,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSystemSettings((prev) => ({
          ...prev,
          [key === "free_all_teachers" ? "freeAllTeachers" : "freeAllOrganizations"]: newValue,
        }));
        fetchAdminData();
      } else {
        alert(data.error || "Failed to update global switch");
      }
    } catch (e) {
      console.error("Toggle system setting error:", e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveReset = async (requestId: string) => {
    try {
      setActionLoading(requestId);
      const res = await fetch("/api/auth/reset-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action: "approve" }),
      });

      const data = await res.json();
      if (data.success) {
        fetchAdminData();
      } else {
        alert(data.error || "Approval failed");
      }
    } catch (e) {
      console.error("Approve error:", e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectReset = async (requestId: string) => {
    if (!confirm("Are you sure you want to reject this password reset request?")) return;
    try {
      setActionLoading(requestId);
      const res = await fetch("/api/auth/reset-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action: "reject" }),
      });

      const data = await res.json();
      if (data.success) {
        fetchAdminData();
      } else {
        alert(data.error || "Reject failed");
      }
    } catch (e) {
      console.error("Reject error:", e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateUserPlan = async (userId: string, planType: "individual" | "school_pro" | "free") => {
    try {
      setActionLoading(userId);
      const res = await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_user_plan",
          targetId: userId,
          planType,
        }),
      });

      const data = await res.json();
      if (data.success) {
        fetchAdminData();
      } else {
        alert(data.error || "Failed to update plan");
      }
    } catch (e) {
      console.error("Update plan error:", e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateOrgPlan = async (orgId: string, planType: "school_pro" | "free") => {
    try {
      setActionLoading(orgId);
      const res = await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_org_plan",
          targetId: orgId,
          planType,
        }),
      });

      const data = await res.json();
      if (data.success) {
        fetchAdminData();
      } else {
        alert(data.error || "Failed to update organization plan");
      }
    } catch (e) {
      console.error("Update org plan error:", e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetUserQuota = async (userId: string) => {
    try {
      setActionLoading(userId);
      const res = await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_user_quota",
          targetId: userId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        fetchAdminData();
      } else {
        alert(data.error || "Failed to reset quota");
      }
    } catch (e) {
      console.error("Reset quota error:", e);
    } finally {
      setActionLoading(null);
    }
  };

  const copyResetUrl = (token: string) => {
    const url = `${window.location.origin}/reset-password?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center text-slate-500 space-y-3">
        <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold">Loading Judmi Academy administrator panel...</p>
      </div>
    );
  }

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const filteredUsers = allUsers.filter((u) => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>Judmi Academy • Super Administrator Control</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Admin Panel & Access Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Grant full Pro access to teachers & organizations, approve password resets, and manage Mobile Money subscriptions.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab("subscriptions")}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === "subscriptions" ? "bg-white text-indigo-700 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-500" />
            <span>Grant Full Pro Access</span>
          </button>

          <button
            onClick={() => setActiveTab("resets")}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === "resets" ? "bg-white text-indigo-700 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Password Resets ({pendingRequests.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("organizations")}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === "organizations" ? "bg-white text-indigo-700 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>School Hub</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Grant Full Access & Manage Subscriptions */}
      {activeTab === "subscriptions" && (
        <div className="space-y-6">
          
          {/* Top Banner */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-indigo-900 via-purple-950 to-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold uppercase tracking-wider">
                Admin Sovereignty
              </span>
              <h3 className="text-lg font-bold text-white">Full Access & Subscription Controller</h3>
              <p className="text-xs text-indigo-200 max-w-lg">
                As Super Admin, you can toggle platform-wide free access or grant unlimited full access to individual teachers and school organizations with 1 click.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="p-3 rounded-2xl bg-white/10 text-center">
                <span className="text-[10px] text-slate-300 block">Total Users</span>
                <span className="text-base font-extrabold text-white">{allUsers.length}</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/10 text-center">
                <span className="text-[10px] text-slate-300 block">Schools</span>
                <span className="text-base font-extrabold text-white">{allOrgs.length}</span>
              </div>
            </div>
          </div>

          {/* GLOBAL PLATFORM MASTER SWITCHES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Master Switch 1: Free for All Teachers */}
            <div className={`p-5 rounded-3xl border-2 transition-all flex flex-col justify-between space-y-4 ${
              systemSettings.freeAllTeachers 
                ? "border-emerald-500 bg-emerald-50/60 shadow-md shadow-emerald-500/10" 
                : "border-slate-200 bg-white shadow-xs"
            }`}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                      systemSettings.freeAllTeachers ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
                    }`}>
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">
                        Free Pro for ALL Teachers
                      </h4>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        systemSettings.freeAllTeachers ? "text-emerald-700" : "text-slate-400"
                      }`}>
                        {systemSettings.freeAllTeachers ? "● Active: 100% Free Unlocked" : "○ Inactive: Standard Paid Tier (Default)"}
                      </span>
                    </div>
                  </div>

                  {/* Toggle Button */}
                  <button
                    type="button"
                    disabled={actionLoading === "free_all_teachers"}
                    onClick={() => handleToggleSystemSetting("free_all_teachers", systemSettings.freeAllTeachers)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      systemSettings.freeAllTeachers ? "bg-emerald-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        systemSettings.freeAllTeachers ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  When enabled, all teacher limitations and quotas are bypassed. Every teacher on Judmi Academy gets unlimited AI exam creation, unlimited script marking, and anti-cheating shuffled pools for free.
                </p>
              </div>

              {systemSettings.freeAllTeachers && (
                <div className="p-2.5 rounded-xl bg-emerald-100/70 text-emerald-900 text-[11px] font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>Platform-wide Free Full Pro is active for all teachers.</span>
                </div>
              )}
            </div>

            {/* Master Switch 2: Free for All Organizations */}
            <div className={`p-5 rounded-3xl border-2 transition-all flex flex-col justify-between space-y-4 ${
              systemSettings.freeAllOrganizations 
                ? "border-purple-500 bg-purple-50/60 shadow-md shadow-purple-500/10" 
                : "border-slate-200 bg-white shadow-xs"
            }`}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                      systemSettings.freeAllOrganizations ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-600"
                    }`}>
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">
                        Free Pro for ALL School Orgs
                      </h4>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        systemSettings.freeAllOrganizations ? "text-purple-700" : "text-slate-400"
                      }`}>
                        {systemSettings.freeAllOrganizations ? "● Active: 100% Free Unlocked" : "○ Inactive: Standard Paid Tier (Default)"}
                      </span>
                    </div>
                  </div>

                  {/* Toggle Button */}
                  <button
                    type="button"
                    disabled={actionLoading === "free_all_organizations"}
                    onClick={() => handleToggleSystemSetting("free_all_organizations", systemSettings.freeAllOrganizations)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      systemSettings.freeAllOrganizations ? "bg-purple-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        systemSettings.freeAllOrganizations ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  When enabled, all registered schools and institutions receive 100 sub-accounts and full organizational features for free without paying.
                </p>
              </div>

              {systemSettings.freeAllOrganizations && (
                <div className="p-2.5 rounded-xl bg-purple-100/70 text-purple-900 text-[11px] font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                  <span>Platform-wide Free School Pro is active for all organizations.</span>
                </div>
              )}
            </div>
          </div>

          {/* School Organizations Access Section */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Registered School Organizations ({allOrgs.length})</span>
              </h3>
              <span className="text-xs text-slate-500">100 sub-accounts per school</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allOrgs.map((org) => {
                const isPro = org.planType === "school_pro";
                return (
                  <div key={org.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-slate-900 text-sm">{org.name}</h4>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          isPro ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                        }`}>
                          {isPro ? "★ School Pro" : "Free Plan"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Owner: {org.ownerEmail} • Capacity: {org.seatLimit} seats
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                      {!isPro ? (
                        <button
                          type="button"
                          disabled={actionLoading === org.id}
                          onClick={() => handleUpdateOrgPlan(org.id, "school_pro")}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Grant Full School Pro</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={actionLoading === org.id}
                          onClick={() => handleUpdateOrgPlan(org.id, "free")}
                          className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-700 font-semibold text-xs transition-colors"
                        >
                          Downgrade to Free
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Teacher & User Access Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>Educators, Teachers & User Directory</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  View usage quotas and grant unlimited Pro access to any teacher.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3">Educator Details</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Current Plan</th>
                    <th className="px-4 py-3">Usage Meters</th>
                    <th className="px-5 py-3 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => {
                    const isPaid = u.planType === "individual" || u.planType === "school_pro" || u.role === "admin";
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900">{u.name}</div>
                          <div className="text-slate-500 font-mono">{u.email}</div>
                        </td>

                        <td className="px-4 py-4">
                          <span className="capitalize px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                            {u.role.replace("_", " ")}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isPaid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          }`}>
                            {isPaid ? (u.planType === "school_pro" ? "★ School Pro" : "★ Individual Pro") : "Free Starter"}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-slate-600">
                          <div>Exams: <strong className="text-slate-900">{u.examGenerationsUsed || 0}</strong>/3</div>
                          <div>Scans: <strong className="text-slate-900">{u.scriptScansUsed || 0}</strong>/3</div>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!isPaid ? (
                              <button
                                type="button"
                                disabled={actionLoading === u.id}
                                onClick={() => handleUpdateUserPlan(u.id, "individual")}
                                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1"
                              >
                                <Zap className="w-3.5 h-3.5" />
                                <span>Grant Full Pro</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={actionLoading === u.id}
                                onClick={() => handleUpdateUserPlan(u.id, "free")}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-semibold text-xs transition-colors"
                              >
                                Set to Free
                              </button>
                            )}

                            <button
                              type="button"
                              title="Reset Quotas to 0"
                              disabled={actionLoading === u.id}
                              onClick={() => handleResetUserQuota(u.id)}
                              className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Password Reset Approvals */}
      {activeTab === "resets" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-indigo-600" />
                  <span>Password Reset Request Approvals</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Teachers and students who forget their passwords appear here for admin authorization.
                </p>
              </div>

              {pendingRequests.length > 0 && (
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold animate-pulse">
                  {pendingRequests.length} Pending Approval
                </span>
              )}
            </div>

            {requests.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                No password reset requests submitted.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50/75 text-slate-500 font-semibold border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-3.5">User Details</th>
                      <th className="px-4 py-3.5">Role</th>
                      <th className="px-4 py-3.5">Reason / Note</th>
                      <th className="px-4 py-3.5">Requested Date</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {requests.map((req) => {
                      const isPending = req.status === "pending";
                      const isApproved = req.status === "approved";

                      return (
                        <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-4">
                            <div className="font-bold text-slate-900">{req.userName || "User"}</div>
                            <div className="text-xs text-slate-500 font-mono">{req.email}</div>
                          </td>

                          <td className="px-4 py-4">
                            <span className="capitalize px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                              {req.role.replace("_", " ")}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-xs text-slate-600 max-w-xs">
                            {req.reason || "Forgot password"}
                          </td>

                          <td className="px-4 py-4 text-xs text-slate-400">
                            {new Date(req.requestedAt).toLocaleString()}
                          </td>

                          <td className="px-4 py-4">
                            {isPending ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                                <Clock className="w-3 text-amber-500" /> Pending
                              </span>
                            ) : isApproved ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                                <CheckCircle2 className="w-3 text-emerald-500" /> Approved
                              </span>
                            ) : req.status === "used" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px]">
                                Password Changed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">
                                Rejected
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-right">
                            {isPending ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  disabled={actionLoading === req.id}
                                  onClick={() => handleApproveReset(req.id)}
                                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Approve Reset</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={actionLoading === req.id}
                                  onClick={() => handleRejectReset(req.id)}
                                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 font-semibold text-xs transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : isApproved && req.resetToken ? (
                              <button
                                type="button"
                                onClick={() => copyResetUrl(req.resetToken)}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors"
                              >
                                {copiedToken === req.resetToken ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copiedToken === req.resetToken ? "Copied Link!" : "Copy Reset Link"}</span>
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: School Organizations Hub */}
      {activeTab === "organizations" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <span>Multi-Tenant School & Institutional Organizations</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Schools create and manage sub-accounts for their teachers and enrolled students.
              </p>
            </div>

            <Link
              href="/org/dashboard"
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
            >
              <span>Open Org Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900">Judmi Academy Institutional Hub</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                  School Pro Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Centralized sub-account allocation, teacher management, and school transcripts.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/org/dashboard"
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
              >
                Open Org Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
