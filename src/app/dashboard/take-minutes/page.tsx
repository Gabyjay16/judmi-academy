"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mic,
  StopCircle,
  Trash2,
  FileText,
  ArrowLeft,
  Clock,
  User,
  Users,
  Sparkles,
  Loader2,
  Play,
  Pause,
  Download,
  Check,
  AlertCircle,
  Music4,
  Plus,
  Building2,
} from "lucide-react";
import { formatTime } from "@/lib/utils";
import { upload } from "@vercel/blob/client";

interface LiveSegment {
  id: string;
  start: number;
  end: number;
  speaker: string;
}

interface MeetingListItem {
  id: string;
  title: string;
  meetingDate: string | null;
  status: string;
  error: string | null;
  audioDurationSeconds: number | null;
  segmentCount: number;
  speakerCount: number;
  createdAt: string;
}

interface ProcessedResult {
  id: string;
  title: string;
  meetingDate: string | null;
  audioUrl: string | null;
  audioDurationSeconds: number;
  transcript: { start: number; end: number; speaker: string; text: string }[];
  speakers: { id: string; label: string; renamedTo: string | null; clipStart: number; utteranceCount: number }[];
  summary: {
    title: string;
    date: string;
    durationMinutes: number;
    speakers: string[];
    overview: string;
    keyPoints: string[];
    decisions: string[];
    actionItems: { task: string; owner: string | null }[];
  } | null;
}

const MAX_RECORD_MS = 20 * 60 * 1000; // 20 minute cap to stay under transcription limits

export default function TakeMinutesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRecorder, setShowRecorder] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [segments, setSegments] = useState<LiveSegment[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessedResult | null>(null);
  const [playingClip, setPlayingClip] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastVoiceRef = useRef<number>(0);
  const voiceActiveRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth");
      const data = await res.json();
      setUser(data.user || null);
    } catch {}
  }, []);

  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/meetings");
      const data = await res.json();
      setMeetings(data.meetings || []);
    } catch {
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
    fetchMeetings();
  }, [fetchUser, fetchMeetings]);

  if (!loading && user && !user.orgId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
          <Building2 className="w-7 h-7 text-slate-400" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">Take Minutes</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          This feature is only available to teachers registered under a school or institution.
          Ask your school administrator for the enrolment link to join your school.
        </p>
        <Link href="/dashboard" className="inline-block mt-2 text-sm font-bold text-indigo-600 hover:underline">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  const startRecording = async () => {
    setError(null);
    setResult(null);
    setSegments([]);
    setElapsed(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      // Set up analyser for voice-change detection.
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.start();

      startRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const e = Date.now() - startRef.current;
        setElapsed(e);
        if (e >= MAX_RECORD_MS) {
          stopRecording();
        }
      }, 500);

      setRecording(true);
      setShowRecorder(true);
      lastVoiceRef.current = 0;
      voiceActiveRef.current = false;
      runVoiceDetection();
    } catch {
      setError("Microphone access was denied. Please allow microphone access to record the meeting.");
    }
  };

  const runVoiceDetection = () => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const buf = new Uint8Array(analyser.fftSize);
    const loop = () => {
      analyser.getByteFrequencyData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i];
      const avg = sum / buf.length;
      const active = avg > 6;

      const now = (Date.now() - startRef.current) / 1000;

      if (active && !voiceActiveRef.current) {
        // voice started
        voiceActiveRef.current = true;
        if (lastVoiceRef.current === 0) {
          // start of speech — first segment
          lastVoiceRef.current = now;
        }
      } else if (!active && voiceActiveRef.current) {
        // voice ended
        voiceActiveRef.current = false;
        const segStart = Math.max(0, lastVoiceRef.current);
        const segEnd = now;
        if (segEnd - segStart > 0.5) {
          const speakerCount = segmentsRef.current.length;
          const speaker = `Speaker ${Math.max(1, speakerCount + 1)}`;
          const seg: LiveSegment = { id: `s-${Date.now()}-${segStart}`, start: segStart, end: segEnd, speaker };
          segmentsRef.current = [...segmentsRef.current, seg];
          setSegments(segmentsRef.current);
          lastVoiceRef.current = 0;
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  const segmentsRef = useRef<LiveSegment[]>([]);

  const stopRecording = async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      cleanupMedia();
      return;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    await new Promise<void>((resolve) => {
      recorder.addEventListener("stop", () => resolve(), { once: true });
      recorder.stop();
    });
    onChangeComplete();
  };

  const onChangeComplete = async () => {
    const duration = (Date.now() - startRef.current) / 1000;
    const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    cleanupMedia();
    setRecording(false);
    setProcessing(true);
    setProgressMsg("Preparing recording…");

    try {
      // Create the meeting record first.
      const createRes = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titleRef.current?.value?.trim() || new Date().toLocaleString(),
          meetingDate: new Date().toISOString().slice(0, 10),
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        throw new Error(createData.error || "Failed to create meeting.");
      }
      const meetingId = createData.meeting.id;

      // Upload the audio directly from the browser to Vercel Blob. This
      // bypasses the 4.5MB server-function body limit for recordings.
      setProgressMsg("Uploading recording…");
      const pathname = `meetings/${meetingId}/meeting-${Date.now()}.webm`;
      const blobResult = await upload(pathname, blob, {
        access: "public",
        handleUploadUrl: `/api/meetings/${meetingId}/upload`,
        clientPayload: meetingId,
        contentType: "audio/webm",
        onUploadProgress: (e: any) => {
          const pct = e?.percentage != null ? Math.round(e.percentage) : 0;
          setProgressMsg(`Uploading recording… ${pct}%`);
        },
      });

      // Persist the blob URL so the process route can fetch it.
      const patchRes = await fetch(`/api/meetings/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioUrl: blobResult.url,
          audioName: blobResult.pathname.split("/").pop() || "meeting.webm",
          audioDurationSeconds: Math.round(duration),
        }),
      });
      if (!patchRes.ok) {
        throw new Error("Failed to save the recording details.");
      }

      setProgressMsg("Transcribing audio with AI…");
      const processRes = await fetch(`/api/meetings/${meetingId}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationSeconds: Math.round(duration) }),
      });
      const processData = await processRes.json();
      if (!processRes.ok) {
        throw new Error(processData.error || "Failed to process the meeting.");
      }

      setProgressMsg("Summarizing minutes…");
      await new Promise((r) => setTimeout(r, 400));
      setResult(processData.meeting);
      setProgressMsg("");
      setProcessing(false);
      fetchMeetings();
    } catch (e: any) {
      setProcessing(false);
      setError(e.message || "Processing failed. Please try again.");
      setProgressMsg("");
    }
  };

  const cleanupMedia = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    const stream = streamRef.current;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
    }
    audioContextRef.current = null;
    audioChunksRef.current = [];
    lastVoiceRef.current = 0;
    voiceActiveRef.current = false;
  };

  const playSpeakerClip = (speaker: any) => {
    const audio = audioRef.current;
    if (!audio || !result?.audioUrl) return;
    if (playingClip === speaker.id) {
      audio.pause();
      audio.currentTime = 0;
      setPlayingClip(null);
      return;
    }
    audio.src = result.audioUrl;
    audio.currentTime = Math.max(0, speaker.clipStart - 0.5);
    audio.play().then(() => setPlayingClip(speaker.id)).catch(() => setPlayingClip(null));
    audio.onended = () => { setPlayingClip(null); audio.currentTime = 0; };
  };

  const renameSpeaker = (index: number, name: string) => {
    if (!result) return;
    const speakers = [...result.speakers];
    speakers[index] = { ...speakers[index], renamedTo: name.trim() || null };
    setResult({ ...result, speakers });
  };

  const saveNames = async () => {
    if (!result) return;
    try {
      const res = await fetch(`/api/meetings/${result.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speakers: result.speakers, title: result.title }),
      });
      if (res.ok) {
        setError(null);
        fetchMeetings();
      }
    } catch {}
  };

  const downloadWord = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = `/api/meetings/${result.id}/export`;
    a.download = `${result.summary?.title || result.title}-minutes.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const deleteMeeting = async (m: MeetingListItem) => {
    if (!window.confirm(`Delete "${m.title}"? This removes the recording and its minutes.`)) return;
    try {
      const res = await fetch(`/api/meetings/${m.id}`, { method: "DELETE" });
      if (res.ok) {
        fetchMeetings();
      }
    } catch {}
  };

  const viewResult = (m: MeetingListItem) => {
    if (m.status !== "ready") return;
    // Load detail via GET endpoint.
    (async () => {
      const res = await fetch(`/api/meetings/${m.id}`);
      const data = await res.json();
      if (data.meeting) {
        setResult(data.meeting);
        setError(null);
      }
    })();
  };

  const closeResult = () => {
    setResult(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-xs font-semibold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Music4 className="w-7 h-7 text-indigo-600" />
            Take Minutes
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Record a meeting with your microphone. AI transcribes it, detects each speaker, and drafts professional minutes you can edit and download as Word.
          </p>
        </div>
        {!recording && !processing && (
          <button
            onClick={() => { setShowRecorder(!showRecorder); setError(null); }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            {showRecorder ? "Close Recorder" : "Record New Meeting"}
          </button>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Live recording UI */}
      {showRecorder && !processing && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <input
                ref={titleRef}
                defaultValue={new Date().toLocaleString()}
                className="w-full sm:w-80 px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Meeting title"
              />
              <p className="text-[11px] text-slate-400 mt-1">Default title = current date.</p>
            </div>
            {recording ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                  REC • {formatTime(elapsed / 1000)}
                </div>
                <button
                  onClick={stopRecording}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md shadow-rose-500/20"
                >
                  <StopCircle className="w-4 h-4" />
                  End Meeting
                </button>
              </div>
            ) : (
              <button
                onClick={startRecording}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-md"
              >
                <Mic className="w-4 h-4" />
                Start Recording
              </button>
            )}
          </div>

          {/* Live voice-change segments */}
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                Detected Changes (speaker turns)
              </h3>
              <span className="text-[11px] text-slate-400">
                {recording ? "Listening for voice changes…" : "Press Start Recording to begin."}
              </span>
            </div>
            {segments.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No speech detected yet. The app splits the recording into speaker turns automatically.
              </p>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-1.5">
                {segments.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2 text-xs rounded-lg bg-slate-50 px-3 py-2">
                    <span className="font-bold text-indigo-700 shrink-0">{s.speaker}</span>
                    <span className="text-slate-400 shrink-0">[{formatTime(s.start)} - {formatTime(s.end)}]</span>
                    <span className="text-slate-500 truncate">Turn {i + 1}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-400">
            Recording is capped at 20 minutes. AI transcription runs automatically when you tap <b>End Meeting</b>.
          </p>
        </div>
      )}

      {/* Processing state */}
      {processing && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 text-center space-y-4">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Processing your meeting…</h3>
            <p className="text-sm text-slate-500 mt-1">{progressMsg}</p>
          </div>
          <div className="w-full max-w-sm mx-auto h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 rounded-full animate-pulse" style={{ width: "60%" }} />
          </div>
        </div>
      )}

      {/* Result view */}
      {result && !recording && !processing && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">{result.summary?.title || result.title}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {result.summary?.date || result.meetingDate} • {result.audioDurationSeconds ? `${Math.round(result.audioDurationSeconds / 60)} min` : "—"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={downloadWord}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all"
              >
                <Download className="w-4 h-4" />
                Download Word
              </button>
              <button
                onClick={closeResult}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-6">
            {/* Speakers: identify + rename */}
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5 mb-3">
                <User className="w-4 h-4 text-indigo-600" />
                Speakers — tap ▶ to hear a clip and identify who it is
              </h3>
              <div className="space-y-2">
                {result.speakers.map((sp, i) => (
                  <div key={sp.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-40">
                      <button
                        onClick={() => playSpeakerClip(sp)}
                        disabled={!result.audioUrl}
                        className="w-9 h-9 shrink-0 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-colors disabled:opacity-40"
                        title={result.audioUrl ? "Play ~10-15s clip to identify this speaker" : "Audio unavailable"}
                      >
                        {playingClip === sp.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                      </button>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{sp.label}</p>
                        <p className="text-[10px] text-slate-400">{sp.utteranceCount} speaking turn{sp.utteranceCount === 1 ? "" : "s"}</p>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={sp.renamedTo || ""}
                      onChange={(e) => renameSpeaker(i, e.target.value)}
                      placeholder="Enter the real person's name"
                      className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={saveNames}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save Speaker Names
                </button>
                {result.audioUrl && (
                  <p className="text-[11px] text-slate-400">
                    Clips play ~10-15s from each speaker&apos;s first turn in the full recording.
                  </p>
                )}
              </div>
            </div>

            {/* Summary */}
            {result.summary && (
              <div className="space-y-4">
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  AI Meeting Summary
                </h3>
                <p className="text-[13px] text-slate-600 leading-relaxed">{result.summary.overview}</p>

                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-1.5">Key Points</h4>
                  <ul className="space-y-1">
                    {result.summary.keyPoints.map((k, i) => (
                      <li key={i} className="text-[13px] text-slate-600 flex items-start gap-2">
                        <span className="text-indigo-500 mt-0.5">•</span>{k}
                      </li>
                    ))}
                  </ul>
                </div>

                {result.summary.decisions.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-1.5">Decisions</h4>
                    <ul className="space-y-1">
                      {result.summary.decisions.map((d, i) => (
                        <li key={i} className="text-[13px] text-slate-600 flex items-start gap-2">
                          <span className="text-emerald-500 mt-0.5">✓</span>{d}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.summary.actionItems.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-1.5">Action Items</h4>
                    <ul className="space-y-1">
                      {result.summary.actionItems.map((a, i) => (
                        <li key={i} className="text-[13px] text-slate-600 flex items-start gap-2">
                          <Clock className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                          <span><b>{a.task}</b>{a.owner ? ` — ${a.owner}` : ""}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Transcript */}
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5 mb-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                Full Transcript ({result.transcript.length} segments)
              </h3>
              <div className="max-h-[420px] overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-2">
                {result.transcript.map((seg, i) => {
                  const speakerObj = result.speakers.find((s) => s.label === seg.speaker);
                  const name = speakerObj?.renamedTo || seg.speaker;
                  return (
                    <div key={i} className="text-[13px] leading-relaxed">
                      <span className="font-bold text-indigo-700">{name}</span>
                      <span className="text-slate-400 text-[10px] ml-1.5">[{formatTime(seg.start)}]</span>
                      <p className="text-slate-600">{seg.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recordings list */}
      {!showRecorder && !recording && !processing && !result && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>My Meeting Minutes</span>
            </h2>
            <span className="text-xs text-slate-400 font-medium">{meetings.length} record{meetings.length === 1 ? "" : "s"}</span>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto" />
            </div>
          ) : meetings.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <p className="text-sm text-slate-500">No meetings recorded yet.</p>
              <p className="text-xs text-slate-400">Tap “Record New Meeting” to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {meetings.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 px-4 sm:px-5 py-4">
                  <button
                    onClick={() => viewResult(m)}
                    className="text-left min-w-0"
                    disabled={m.status !== "ready"}
                  >
                    <p className="text-sm font-bold text-slate-800 truncate">{m.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {m.meetingDate || "—"}
                      {m.speakerCount > 0 && ` • ${m.speakerCount} speakers`}
                      {m.audioDurationSeconds ? ` • ${Math.round(m.audioDurationSeconds / 60)} min` : ""}
                    </p>
                    {m.status === "processing" && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 mt-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Processing…
                      </span>
                    )}
                    {m.status === "failed" && (
                      <span className="text-[11px] font-bold text-rose-600 mt-1">Failed: {m.error}</span>
                    )}
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    {m.status === "ready" && (
                      <button
                        onClick={() => {
                          const a = document.createElement("a");
                          a.href = `/api/meetings/${m.id}/export`;
                          a.download = `${m.title}-minutes.docx`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                        className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="Download Word"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteMeeting(m)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hidden audio element for speaker clip playback */}
      <audio ref={audioRef} preload="auto" style={{ display: "none" }} />
    </div>
  );
}