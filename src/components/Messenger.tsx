"use client";

import { useEffect, useState, useCallback } from "react";
import { MessageSquare, Mail, MailOpen, Send, Trash2, X, Inbox, SendHorizonal, ChevronDown } from "lucide-react";

interface Msg { id: string; senderId: string; senderName: string; recipientId: string; subject: string | null; body: string; isRead: boolean; createdAt: string; }
interface Recipient { id: string; name: string; label: string; role: string; }

export default function Messenger({ portal }: { portal: "staff" | "student" | "parent" }) {
  const [msgBox, setMsgBox] = useState<"inbox" | "outbox">("inbox");
  const [inbox, setInbox] = useState<Msg[]>([]);
  const [outbox, setOutbox] = useState<Msg[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [recipientId, setRecipientId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [search, setSearch] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [inRes, outRes, recRes] = await Promise.all([
        fetch("/api/messages?box=inbox"),
        fetch("/api/messages?box=outbox"),
        fetch("/api/messages/recipients"),
      ]);
      const inData = await inRes.json();
      const outData = await outRes.json();
      const recData = await recRes.json();
      setInbox((inData.inbox || []).sort((a: Msg, b: Msg) => b.createdAt.localeCompare(a.createdAt)));
      setOutbox((outData.outbox || []).sort((a: Msg, b: Msg) => b.createdAt.localeCompare(a.createdAt)));
      setRecipients(recData.recipients || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientId || !body.trim()) return;
    setSending(true);
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId, subject, body }),
      });
      setComposeOpen(false); setRecipientId(""); setSubject(""); setBody("");
      await fetchAll();
    } finally { setSending(false); }
  };

  const handleMarkRead = async (id: string) => {
    await fetch("/api/messages", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setInbox((prev) => prev.map((m) => (m.id === id ? { ...m, isRead: true } : m)));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this message?")) return;
    const box = msgBox;
    await fetch("/api/messages", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (box === "inbox") setInbox((prev) => prev.filter((m) => m.id !== id));
    else setOutbox((prev) => prev.filter((m) => m.id !== id));
  };

  const list = msgBox === "inbox" ? inbox : outbox;
  const filtered = list.filter((m) => {
    const other = msgBox === "inbox" ? m.senderName : "";
    return !search || other.toLowerCase().includes(search.toLowerCase());
  });
  const unreadCount = inbox.filter((m) => !m.isRead).length;

  const fmt = (iso: string) => new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const filteredRecipients = recipients.filter((r) => !search || r.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">
            {portal === "staff" ? "Staff Portal" : portal === "parent" ? "Parent Portal" : "Student Portal"}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-navy-700" /> My Messages
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? "s" : ""}` : "No unread messages"} · {recipients.length} contacts
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-52">
            <Inbox className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="input-field pl-9 py-2 text-sm" />
          </div>
          <button type="button" onClick={() => setComposeOpen(true)} className="btn-primary text-xs px-3 py-2.5 rounded-xl flex items-center gap-1.5 shrink-0">
            <Send className="w-4 h-4" /> Compose
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button type="button" onClick={() => setMsgBox("inbox")} className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition ${msgBox === "inbox" ? "border-navy-800 text-navy-800" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
          <Mail className="w-4 h-4" /> Inbox {unreadCount > 0 && <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
        </button>
        <button type="button" onClick={() => setMsgBox("outbox")} className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition ${msgBox === "outbox" ? "border-navy-800 text-navy-800" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
          <SendHorizonal className="w-4 h-4" /> Sent
        </button>
      </div>

      {/* Message list */}
      {loading ? (
        <div className="surface-elevated rounded-2xl p-10 text-center animate-pulse"><MessageSquare className="w-8 h-8 text-navy-200 mx-auto" /><p className="text-sm text-slate-500 font-semibold mt-2">Loading messages…</p></div>
      ) : filtered.length === 0 ? (
        <div className="surface-elevated rounded-2xl p-10 text-center">
          <Mail className="w-8 h-8 text-navy-200 mx-auto" />
          <p className="text-sm text-slate-500 font-semibold mt-2">{msgBox === "inbox" ? "Your inbox is empty." : "No sent messages."}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => {
            const otherName = msgBox === "inbox" ? m.senderName : recipients.find((r) => r.id === m.recipientId)?.name || "Unknown";
            return (
              <button key={m.id} type="button" onClick={() => msgBox === "inbox" && !m.isRead && handleMarkRead(m.id)}
                className={`w-full text-left surface-elevated rounded-2xl px-4 py-3 flex items-start gap-3 hover:border-navy-200 transition ${!m.isRead && msgBox === "inbox" ? "border-navy-200 bg-navy-50/50" : ""}`}>
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${!m.isRead && msgBox === "inbox" ? "bg-navy-900 text-white" : "bg-slate-100 text-slate-500"}`}>
                  {!m.isRead && msgBox === "inbox" ? <MailOpen className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900 truncate">{otherName}</span>
                    <span className="text-[10px] text-slate-400 font-semibold shrink-0">{fmt(m.createdAt)}</span>
                  </div>
                  {(m.subject || "") && <div className="text-xs font-bold text-navy-700 mt-0.5">{m.subject}</div>}
                  <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{m.body}</div>
                </div>
                <span title="Delete" onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }} className="text-slate-300 hover:text-rose-500 shrink-0 p-1"><Trash2 className="w-4 h-4" /></span>
              </button>
            );
          })}
        </div>
      )}

      {/* Compose modal */}
      {composeOpen && (
        <div className="modal-overlay" onClick={() => setComposeOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2"><Send className="w-5 h-5 text-navy-700" /> New Message</h2>
              <button type="button" onClick={() => setComposeOpen(false)} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSend} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Recipient <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <select required value={recipientId} onChange={(e) => setRecipientId(e.target.value)} className="input-field py-2.5 text-sm appearance-none">
                    <option value="">Select a contact…</option>
                    {recipients.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subject</label>
                <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="input-field py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Message <span className="text-rose-500">*</span></label>
                <textarea required value={body} onChange={(e) => setBody(e.target.value)} rows={4} className="input-field py-2.5 text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setComposeOpen(false)} className="btn-outline text-xs flex-1">Cancel</button>
                <button type="submit" disabled={sending || !recipientId || !body.trim()} className="btn-primary text-xs flex-1">{sending ? "Sending…" : "Send Message"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
