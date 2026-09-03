"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Bell,
  MessageSquare,
  Send,
  Image as ImageIcon,
  Mic,
  X,
  Play,
  Pause,
  Trash2,
  Reply,
  Users,
  GraduationCap,
  Camera,
  CheckCheck,
  Shield,
  Settings,
} from "lucide-react";
import { upload } from "@vercel/blob/client";

interface Channel {
  id: string;
  type: "general" | "department";
  name: string;
  departmentId: string | null;
  departmentName: string | null;
  memberCount: number;
}

interface Member {
  id: string;
  name: string;
  studentId: string | null;
  departmentName: string | null;
  avatarUrl: string | null;
}

interface Message {
  id: string;
  channelId: string;
  authorUserId: string | null;
  authorName: string;
  authorAvatarUrl: string | null;
  type: "text" | "image" | "voice";
  content: string | null;
  mediaUrl: string | null;
  mediaDurationSeconds: number | null;
  replyToId: string | null;
  replyPreview: string | null;
  replyAuthorName: string | null;
  createdAt: string;
}

interface Notification {
  id: string;
  userId: string;
  messageId: string | null;
  senderUserId: string | null;
  senderName: string;
  channelId: string | null;
  channelLabel: string;
  replyContent: string | null;
  replyType: string;
  isRead: number;
  createdAt: string;
}

export default function StudentForumPage() {
  const [user, setUser] = useState<any | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return JSON.parse(localStorage.getItem("judmi_user") || "null");
    } catch {
      return null;
    }
  });

  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isMonitor, setIsMonitor] = useState(false);
  const [role, setRole] = useState("student");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [canPost, setCanPost] = useState(true);

  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [tagMember, setTagMember] = useState<Member | null>(null);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [profileModal, setProfileModal] = useState<Member | null>(null);
  const [notifBellOpen, setNotifBellOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Image attachment
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);

  // Voice recording
  const [recording, setRecording] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Audio playback state
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Scroll container
  const listRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Swipe-to-reply + long-press-to-delete gestures
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const longPressTimer = useRef<any>(null);
  const longPressed = useRef(false);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth");
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        localStorage.setItem("judmi_user", JSON.stringify(data.user));
      }
    } catch {}
  }, []);

  const fetchChannels = useCallback(async () => {
    const res = await fetch("/api/forum/channels");
    const data = await res.json();
    if (data?.channels?.length) {
      setChannels(data.channels);
      setIsMonitor(!!data.isMonitor);
      setRole(data.role || "student");
      setOrgId(data.orgId || null);
      // org_admin monitors silently (cannot reply). Everyone else (students,
      // teachers, super admin) can post.
      setCanPost(data.role !== "org_admin");
      setActiveChannelId((prev) => prev && data.channels.some((c: Channel) => c.id === prev) ? prev : data.channels[0].id);
    } else {
      setChannels([]);
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (channelId: string) => {
    const res = await fetch(`/api/forum/messages?channel=${channelId}`);
    const data = await res.json();
    if (data?.messages) setMessages(data.messages);
  }, []);

  const fetchMembers = useCallback(async (channelId: string) => {
    try {
      const res = await fetch(`/api/forum/members?channel=${channelId}`);
      const data = await res.json();
      if (data?.members) setMembers(data.members);
    } catch {}
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/forum/notifications");
      const data = await res.json();
      if (data?.notifications) setNotifications(data.notifications);
    } catch {}
  }, []);

  useEffect(() => {
    Promise.all([fetchSession(), fetchChannels()]);
  }, [fetchSession, fetchChannels]);

  useEffect(() => {
    fetchNotifications();
    const iv = setInterval(fetchNotifications, 15000);
    return () => clearInterval(iv);
  }, [fetchNotifications]);

  useEffect(() => {
    if (activeChannelId) {
      fetchMessages(activeChannelId);
      fetchMembers(activeChannelId);
      const iv = setInterval(() => fetchMessages(activeChannelId), 4000);
      return () => clearInterval(iv);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannelId]);

  useEffect(() => {
    setMessages([]);
    setReplyTo(null);
  }, [activeChannelId]);

  useEffect(() => {
    if (loading && channels.length > 0) setLoading(false);
  }, [channels, loading]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const activeChannel = channels.find((c) => c.id === activeChannelId) || null;

  // ---------- SEND ----------
  const submitMessage = async (type: "text" | "image" | "voice", content: string | null, mediaUrl: string | null, duration: number | null) => {
    if (!activeChannelId || !canPost) return;
    setSending(true);
    try {
      const payload: any = {
        channelId: activeChannelId,
        type,
        content,
        mediaUrl,
        mediaDurationSeconds: duration,
        replyToId: replyTo?.id || null,
        taggedUserId: tagMember?.id || null,
      };
      const res = await fetch("/api/forum/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to send");
      } else {
        setDraft("");
        setReplyTo(null);
        setTagMember(null);
        setAttachedImage(null);
        await fetchMessages(activeChannelId);
      }
    } catch (e: any) {
      alert(e.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handleSendText = () => {
    if (!draft.trim()) return;
    submitMessage("text", draft.trim(), null, null);
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 1200;
          let { width, height } = img;
          if (width > max) {
            height = Math.round((height * max) / width);
            width = max;
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.65));
        };
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image too large (max 5MB).");
      return;
    }
    try {
      const dataUrl = await compressImage(file);
      setAttachedImage(dataUrl);
    } catch {
      alert("Could not read image.");
    }
    e.target.value = "";
  };

  const handleSendImage = () => {
    if (!attachedImage) return;
    submitMessage("image", null, attachedImage, null);
  };

  // ---------- VOICE RECORDING ----------
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {};
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setRecTime(0);
      recTimerRef.current = setInterval(() => setRecTime((t) => t + 1), 1000);
    } catch {
      alert("Microphone access is required to record a voice note.");
    }
  };

  const stopRecording = async () => {
    const recorder = recorderRef.current;
    const stream = streamRef.current;
    if (!recorder) return;
    if (recTimerRef.current) clearInterval(recTimerRef.current);

    const duration = recTime;
    const blobPromise: Promise<Blob> = new Promise((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        resolve(blob);
      };
      recorder.stop();
    });
    stream?.getTracks().forEach((t) => t.stop());

    setRecording(false);
    try {
      const blob = await blobPromise;
      if (blob.size < 1000) return;
      const pathname = `forum/voice/${Date.now()}.webm`;
      const blobResult = await upload(pathname, blob, {
        access: "public",
        handleUploadUrl: "/api/forum/upload",
        contentType: blob.type || "audio/webm",
      });
      await submitMessage("voice", null, blobResult.url, duration);
    } catch (e: any) {
      alert(e?.message || "Voice note upload failed.");
    }
  };

  const cancelRecording = () => {
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setRecording(false);
    setRecTime(0);
  };

  // ---------- AUDIO PLAYBACK ----------
  const togglePlay = (msg: Message) => {
    if (!msg.mediaUrl) return;
    if (playingId === msg.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(msg.mediaUrl);
    audioRef.current = audio;
    setPlayingId(msg.id);
    audio.play().catch(() => {});
    audio.onended = () => setPlayingId(null);
  };

  // ---------- DELETE ----------
  const deleteMessage = async (msg: Message) => {
    if (!confirm("Delete this message?")) return;
    await fetch(`/api/forum/messages/${msg.id}`, { method: "DELETE" });
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
  };

  // ---------- NOTIFICATIONS ----------
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const openNotification = async (n: Notification) => {
    if (n.channelId) {
      setActiveChannelId(n.channelId);
      setNotifBellOpen(false);
      await fetch(`/api/forum/notifications`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: n.id }) });
      fetchNotifications();
    }
  };

  // ---------- PROFILE PICTURE ----------
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setUploadingAvatar(true);
      const dataUrl = await compressImage(file);
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: dataUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchSession();
        alert("Profile picture updated!");
      } else {
        alert(data.error || "Failed to update picture");
      }
    } catch {
      alert("Failed to update picture");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ---------- HELPERS ----------
  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };
  const fmtDay = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    return sameDay ? "Today" : d.toLocaleDateString([], { month: "short", day: "numeric" });
  };
  const fmtDuration = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

  // Handle touch to slide a message and reply to it.
  const onSwipeStart = (e: React.TouchEvent, msg: Message) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    longPressed.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressed.current = true;
    }, 600);
  };
  const onSwipeEnd = (e: React.TouchEvent, msg: Message) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (longPressed.current) {
      // Long-press → open reply composer for this message.
      setReplyTo(msg);
      setShowTagPicker(false);
      return;
    }
    if (touchStartX.current == null || touchStartY.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // Horizontal slide (ignore vertical scroll) → slide to reply.
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) {
      setReplyTo(msg);
      setShowTagPicker(false);
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const Avatar = ({ member, size = 40 }: { member: { name: string; avatarUrl: string | null } | null; size?: number }) => {
    const fallback = (member?.name || "?").trim().charAt(0).toUpperCase();
    return (
      <div
        className="shrink-0 rounded-full flex items-center justify-center font-bold text-white overflow-hidden"
        style={{ width: size, height: size, fontSize: size * 0.4, backgroundColor: "#1a2c47", cursor: "pointer" }}
        onClick={() => member && setProfileModal({ id: member.name, name: member.name, studentId: null, departmentName: null, avatarUrl: member.avatarUrl } as Member)}
      >
        {member?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
        ) : (
          fallback
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-16 flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-700 border border-navy-100 flex items-center justify-center animate-pulse">
          <MessageSquare className="w-6 h-6" />
        </div>
        <p className="text-sm text-slate-500 font-semibold">Loading chat forum…</p>
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-navy-900 text-amber-500 flex items-center justify-center mx-auto">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">Chat Forum</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          To use the forum you need to belong to a school. Link your school account or ask your school to add you, then come back here.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4 animate-fade-in">
      {/* Notification bell */}
      <div className="flex items-center justify-between">
        <div>
          <span className="inline-block text-[12px] sm:text-sm font-bold uppercase tracking-[0.22em] text-amber-600">
            Student Hub
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">Chat Forum</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="relative w-11 h-11 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:border-navy-200 transition-colors"
            aria-label="Settings"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>

          <div className="relative">
          <button
            type="button"
            onClick={() => { setNotifBellOpen(!notifBellOpen); if (!notifBellOpen) fetchNotifications(); }}
            className="relative w-11 h-11 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:border-navy-200 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {notifBellOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[70vh] overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 animate-fade-in">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="text-[11px] font-bold text-navy-700 hover:underline"
                    onClick={async () => {
                      await fetch("/api/forum/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
                      fetchNotifications();
                    }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <Bell className="w-6 h-6 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-400 font-semibold">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => openNotification(n)}
                      className={`w-full text-left p-3.5 hover:bg-slate-50 transition-colors flex items-start gap-3 ${!n.isRead ? "bg-navy-50/50" : ""}`}
                    >
                      <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${!n.isRead ? "bg-navy-900 text-amber-400" : "bg-slate-100 text-slate-400"}`}>
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900">
                          {n.senderName}
                          <span className="text-slate-400 font-medium"> replied in {n.channelLabel}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {n.replyContent || ""}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{fmtTime(n.createdAt)}</p>
                      </div>
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-navy-700 mt-1.5 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Forum switcher */}
      <div className="grid grid-cols-2 gap-3">
        {channels.map((ch) => {
          const active = ch.id === activeChannelId;
          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => setActiveChannelId(ch.id)}
              className={`rounded-2xl border p-3.5 sm:p-4 text-left transition-all ${active ? "bg-navy-900 border-navy-900 text-white shadow-lg" : "bg-white border-slate-200 hover:border-navy-300"}`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${active ? "bg-white/10 text-amber-400" : "bg-navy-50 text-navy-700"}`}>
                  {ch.type === "general" ? <Users className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
                </span>
                <div className="min-w-0">
                  <div className={`text-sm font-bold truncate ${active ? "text-white" : "text-slate-900"}`}>
                    {ch.type === "general" ? "General Forum" : "Department Forum"}
                  </div>
                  <div className={`text-[11px] truncate ${active ? "text-navy-200/80" : "text-slate-500"}`}>
                    {ch.type === "general" ? "All students in your school" : ch.name.replace("Department Forum · ", "") || "Your department"}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Monitor notice (only visible to admins) — hidden from students */}
      {isMonitor && activeChannel && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 text-slate-500 text-xs font-semibold">
          <Shield className="w-4 h-4" />
          <span>Viewing {role === "admin" ? "as Super Admin" : "as School Admin"} — {role === "org_admin" ? "read only" : "full access"}</span>
        </div>
      )}

      {/* Messages */}
      <div className="surface-elevated overflow-hidden rounded-2xl flex flex-col" style={{ height: "min(62vh, 640px)" }}>
        <div ref={listRef} className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 space-y-3 bg-slate-50/60">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-2 py-16">
              <MessageSquare className="w-8 h-8 text-slate-300" />
              <p className="text-sm font-bold text-slate-500">No messages yet</p>
              <p className="text-xs text-slate-400">Be the first to say something in {activeChannel?.type === "general" ? "the General Forum" : "your Department Forum"}!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const mine = msg.authorUserId === user?.id;
              const isPlaying = playingId === msg.id;
              const avatarMember = { name: msg.authorName, avatarUrl: msg.authorAvatarUrl };
              return (
                <div
                  key={msg.id}
                  onTouchStart={(e) => canPost && onSwipeStart(e, msg)}
                  onTouchEnd={(e) => canPost && onSwipeEnd(e, msg)}
                  className={`group flex items-end gap-2 ${mine ? "justify-end flex-row-reverse" : ""} animate-fade-in`}
                >
                  {!mine && <Avatar member={avatarMember} size={34} />}
                  <div className={`max-w-[88%] sm:max-w-[78%] min-w-0 ${mine ? "items-end" : ""} flex flex-col`}>
                    {msg.replyPreview && (
                      <div className={`mb-0.5 text-[11px] rounded-xl px-3 py-1.5 max-w-[220px] truncate ${mine ? "bg-white/30 text-white/90" : "bg-slate-100 text-slate-500"} border ${mine ? "border-white/20" : "border-slate-200"}`}>
                        Replying to <b>{msg.replyAuthorName}</b>: {msg.replyPreview}
                      </div>
                    )}
                    <div
                      className={`max-w-full min-w-0 rounded-2xl px-3.5 py-2.5 shadow-sm ${mine ? "bg-navy-900 text-white rounded-tr-sm" : "bg-white text-slate-800 border border-slate-200 rounded-tl-sm"}`}
                    >
                      {!mine && <div className="text-[11px] font-bold text-navy-700 mb-0.5">{msg.authorName}</div>}

                      {msg.type === "text" && (
                        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{msg.content}</p>
                      )}

                      {msg.type === "image" && (
                        <button type="button" onClick={() => setProfileModal({ id: msg.id, name: msg.authorName, studentId: null, departmentName: null, avatarUrl: msg.mediaUrl } as any)} className="block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={msg.mediaUrl!} alt="uploaded" className="max-w-[220px] w-full max-h-56 object-cover rounded-xl" />
                        </button>
                      )}

                      {msg.type === "voice" && (
                        <div className="flex items-center gap-2 min-w-[150px]">
                          <button
                            type="button"
                            onClick={() => togglePlay(msg)}
                            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${mine ? "bg-amber-400 text-navy-900" : "bg-navy-900 text-white"}`}
                          >
                            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </button>
                          <span className={`text-xs font-bold ${mine ? "text-white/90" : "text-slate-700"}`}>
                            🎤 {fmtDuration(msg.mediaDurationSeconds || 0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className={`mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-400 ${mine ? "justify-end" : ""}`}>
                      <span>{fmtDay(msg.createdAt)} · {fmtTime(msg.createdAt)}</span>
                      {mine && <CheckCheck className="w-3 h-3 text-navy-400" />}
                    </div>

                    {/* Actions: reply + delete (own) — visible on touch, on hover for desktop */}
                    <div className={`mt-0.5 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity ${mine ? "justify-end" : ""}`}>
                      <button type="button" onClick={() => { setReplyTo(msg); setShowTagPicker(false); }} className="text-[10px] font-bold text-navy-600 hover:underline flex items-center gap-0.5">
                        <Reply className="w-3 h-3" /> Reply
                      </button>
                      {mine && (
                        <button type="button" onClick={() => deleteMessage(msg)} className="text-[10px] font-bold text-rose-500 hover:underline flex items-center gap-0.5">
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
        <div className="border-t border-slate-200 bg-white p-3">
          {replyTo && (
            <div className="mb-2 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-navy-50 border border-navy-100">
              <div className="min-w-0 truncate">
                <span className="text-[11px] font-bold text-navy-800 block">Replying to {replyTo.authorName}</span>
                <span className="text-[11px] text-slate-500 block truncate">
                  {replyTo.type === "text" ? replyTo.content : replyTo.type === "voice" ? "🎤 Voice note" : "📷 Image"}
                </span>
              </div>
              <button type="button" onClick={() => setReplyTo(null)} className="text-slate-400 hover:text-rose-500 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {attachedImage && (
            <div className={`mb-2 rounded-xl overflow-hidden border border-navy-200 relative w-40 ${!canPost ? "opacity-40" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={attachedImage} alt="attachment" className="w-full h-28 object-cover" />
              <button type="button" onClick={() => setAttachedImage(null)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {!canPost ? (
            <div className="py-3 text-center text-xs font-semibold text-slate-400">
              You are viewing this forum in read-only mode.
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
              <button type="button" onClick={() => imageInputRef.current?.click()} className="w-10 h-10 shrink-0 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-navy-50 hover:text-navy-700 transition-colors" title="Send image">
                <ImageIcon className="w-5 h-5" />
              </button>

              {recording ? (
                <div className="flex-1 min-w-0 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200">
                  <div className="flex items-center gap-2 text-rose-600 text-sm font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                    Recording {recTime}s
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={cancelRecording} className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-600 text-xs font-bold">
                      Cancel
                    </button>
                    <button type="button" onClick={stopRecording} className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold flex items-center gap-1">
                      <Send className="w-3.5 h-3.5" /> Send
                    </button>
                  </div>
                </div>
              ) : attachedImage ? (
                <button type="button" onClick={handleSendImage} disabled={sending} className="flex-1 min-w-0 h-10 rounded-xl bg-navy-900 text-white text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50">
                  <Send className="w-4 h-4" /> Send Photo
                </button>
              ) : (
                <>
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSendText(); }}
                    placeholder={replyTo ? `Reply to ${replyTo.authorName}…` : "Write a message… (or record a voice note)"}
                    className="flex-1 min-w-0 h-10 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-400 bg-slate-50"
                  />
                  <button type="button" onClick={startRecording} className="w-10 h-10 shrink-0 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-colors" title="Record voice note">
                    <Mic className="w-5 h-5" />
                  </button>
                  <button type="button" onClick={handleSendText} disabled={!draft.trim() || sending} className="w-10 h-10 shrink-0 rounded-xl bg-navy-900 text-white flex items-center justify-center disabled:opacity-40 hover:bg-navy-800 transition-colors" title="Send">
                    <Send className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          )}

          {/* Tag picker */}
          {showTagPicker && canPost && (
            <div className="mt-2 border border-slate-200 rounded-xl bg-white max-h-48 overflow-y-auto divide-y divide-slate-100">
              <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Tag a student (select to notify them)
              </div>
              {members.length === 0 ? (
                <div className="p-3 text-xs text-slate-400">No members found.</div>
              ) : (
                members.filter((m) => m.id !== user?.id).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => { setTagMember(m); setShowTagPicker(false); }}
                    className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-navy-50 transition-colors"
                  >
                    {m.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.avatarUrl} className="w-7 h-7 rounded-full object-cover" alt="" />
                    ) : (
                      <span className="w-7 h-7 rounded-full bg-navy-100 text-navy-800 flex items-center justify-center text-[11px] font-bold">{m.name.charAt(0)}</span>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">{m.name}</div>
                      {m.departmentName && <div className="text-[10px] text-slate-400">{m.departmentName}{m.studentId ? ` · ${m.studentId}` : ""}</div>}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tag/reply chip */}
      {(replyTo || tagMember) && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {tagMember && (
            <button type="button" onClick={() => setShowTagPicker(true)} className="px-2.5 py-1 rounded-lg bg-navy-50 text-navy-700 border border-navy-100 font-semibold">
              @{tagMember.name} ✕ <span onClick={(e) => { e.stopPropagation(); setTagMember(null); }} className="text-rose-500 cursor-pointer">remove</span>
            </button>
          )}
        </div>
      )}

      {/* Profile / zoom modal */}
      {profileModal && (
        <div className="modal-overlay" onClick={() => setProfileModal(null)}>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            {profileModal.avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profileModal.avatarUrl} alt="avatar" className="max-w-[70vw] max-h-[60vh] rounded-3xl shadow-2xl" />
            )}
            {profileModal.name && (
              <div className="mt-3 text-center text-slate-100 font-bold">{profileModal.name}</div>
            )}
          </div>
        </div>
      )}

      {/* Settings modal */}
      {settingsOpen && (
        <div className="modal-overlay" onClick={() => setSettingsOpen(false)}>
          <div className="surface-elevated w-full max-w-sm rounded-2xl overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-navy-700" /> Settings
              </h3>
              <button type="button" onClick={() => setSettingsOpen(false)} className="text-slate-400 hover:text-rose-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Profile */}
              <div className="flex items-center gap-3">
                <Avatar member={user} size={56} />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate">{user?.name || "Student"}</div>
                  <div className="text-xs text-slate-500">
                    {user?.departmentId ? "Department member" : "School member"} · {orgId ? "Linked to school" : "Unlinked"}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Profile Photo</div>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar} className="btn-primary w-full text-sm px-3 py-2.5 rounded-xl flex items-center justify-center gap-1.5">
                  <Camera className="w-4 h-4" /> {uploadingAvatar ? "Uploading…" : "Set Profile Photo"}
                </button>
              </div>

              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Actions</div>
                <button type="button" onClick={() => { setSettingsOpen(false); setShowTagPicker(true); }} className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 text-slate-700 flex items-center justify-center gap-1.5 hover:border-navy-300 hover:bg-navy-50 transition-colors">
                  <Users className="w-4 h-4" /> Tag a student
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
