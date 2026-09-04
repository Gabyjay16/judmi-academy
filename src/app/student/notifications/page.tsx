"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, Megaphone, GraduationCap, ClipboardList, CheckCircle2, CheckCheck } from "lucide-react";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: number;
  createdAt: string;
}

function typeIcon(type: string) {
  switch (type) {
    case "announcement": return <Megaphone className="w-4 h-4" />;
    case "grade": return <GraduationCap className="w-4 h-4" />;
    case "assignment": return <ClipboardList className="w-4 h-4" />;
    default: return <Bell className="w-4 h-4" />;
  }
}

function typeColor(type: string) {
  switch (type) {
    case "announcement": return "bg-indigo-50 text-indigo-600 border-indigo-100";
    case "grade": return "bg-emerald-50 text-emerald-600 border-emerald-100";
    case "assignment": return "bg-amber-50 text-amber-600 border-amber-100";
    default: return "bg-navy-50 text-navy-600 border-navy-100";
  }
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    const res = await fetch("/api/notifications");
    const data = await res.json();
    setItems(data.notifications || []);
  }, []);

  useEffect(() => {
    fetchNotifications().finally(() => setLoading(false));
  }, [fetchNotifications]);

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    setItems((prev) => prev.map((n) => ({ ...n, isRead: 1 })));
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16 flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center animate-pulse">
          <Bell className="w-6 h-6" />
        </div>
        <p className="text-sm text-slate-500 font-semibold">Loading notifications…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16 text-center space-y-4 animate-fade-in">
        <div className="w-16 h-16 rounded-3xl bg-navy-900 text-amber-500 flex items-center justify-center mx-auto">
          <Bell className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">Notifications</h1>
        <p className="text-sm text-slate-500">No notifications yet. We'll let you know when something happens.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
          <Bell className="w-7 h-7 text-navy-700" /> Notifications
        </h1>
        <button type="button" onClick={markAllRead} className="text-xs font-bold text-navy-700 hover:underline flex items-center gap-1">
          <CheckCheck className="w-4 h-4" /> Mark all read
        </button>
      </div>

      <div className="space-y-2">
        {items.map((n) => {
          const content = (
            <>
              <span className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${typeColor(n.type)}`}>
                {typeIcon(n.type)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-slate-900">{n.title}</div>
                {n.body && <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</div>}
                <div className="text-[10px] text-slate-400 font-semibold mt-1">{timeAgo(n.createdAt)}</div>
              </div>
              {!n.isRead && <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 mt-1" />}
            </>
          );
          return n.link ? (
            <Link key={n.id} href={n.link} className={`surface-elevated rounded-2xl px-4 py-3.5 flex items-start gap-3 animate-slide-up cursor-pointer transition-all hover:shadow-md ${!n.isRead ? "ring-2 ring-amber-200 bg-amber-50/30" : ""}`}>
              {content}
            </Link>
          ) : (
            <div key={n.id} className={`surface-elevated rounded-2xl px-4 py-3.5 flex items-start gap-3 animate-slide-up ${!n.isRead ? "ring-2 ring-amber-200 bg-amber-50/30" : ""}`}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}