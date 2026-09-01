/**
 * "Take Minutes" — AI meeting transcription & summarization.
 *
 * Transcription uses OpenRouter's dedicated STT endpoint
 * (POST /api/v1/audio/transcriptions) which returns a plain text transcript
 * or — when `response_format: "verbose_json"` is used on OpenAI-compatible
 * providers — segment-level timestamps (and, on some providers, diarization
 * speaker indices). We post-process the raw transcript into timestamped
 * segments, cluster them by speaker, and then produce a structured summary.
 */

import { getOpenRouterKey } from "./openrouter";

export interface TranscriptSegment {
  start: number; // seconds
  end: number; // seconds
  speaker: string; // e.g. "Speaker 1"
  text: string;
}

export interface MeetingSpeaker {
  id: string; // e.g. "speaker-1"
  label: string; // e.g. "Speaker 1"
  renamedTo: string | null; // user-replaced real name
  clipStart: number; // seconds — used to play a ~10-15s audio clip for ID
  utteranceCount: number;
}

export interface MeetingSummary {
  title: string;
  date: string;
  durationMinutes: number;
  speakers: string[]; // display labels
  overview: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: { task: string; owner: string | null }[];
}

const MAX_AUDIO_FILE_BYTES = 15 * 1024 * 1024; // 15MB safety cap (Blob/transcription)
const GEMINI_MODEL = "gemini-3.7-flash";
const GEMINI_INLINE_AUDIO_BYTES = 14 * 1024 * 1024; // keep base64 under Gemini's ~20MB inline limit

function getGeminiKey(): string {
  return (process.env.GEMINI_API_KEY || "").trim();
}

function toSpeakerLabel(value: any): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return `Speaker ${Math.max(1, Math.round(value))}`;
  const s = String(value).trim();
  const m = s.match(/(\d+)/);
  if (m) return `Speaker ${parseInt(m[1], 10)}`;
  if (/speaker/i.test(s)) return "Speaker 1";
  return null;
}

/**
 * Transcribe via Gemini 3.7 Flash (native Google API) with speaker
 * diarization and segment timestamps. Returns null when Gemini can't be used.
 */
export async function transcribeWithGemini(
  audioBuffer: Buffer,
  mimeType: string
): Promise<{ segments: TranscriptSegment[]; durationSeconds: number; fullText: string } | null> {
  const apiKey = getGeminiKey();
  if (!apiKey) return null;
  if (audioBuffer.length === 0 || audioBuffer.length > GEMINI_INLINE_AUDIO_BYTES) return null;

  const format = mimeToFormat(mimeType);
  const geminiMime: Record<string, string> = {
    mp3: "audio/mp3",
    m4a: "audio/mp4",
    mp4: "audio/mp4",
    wav: "audio/wav",
    ogg: "audio/ogg",
    flac: "audio/flac",
    aac: "audio/aac",
    webm: "audio/webm",
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Transcribe the speech in this audio file. For every speaker turn output one JSON object with the fields start (seconds, number, from the start of the file), end (seconds, number), speaker (an integer index; use the SAME index whenever the same person is speaking, and 0 if there is a single speaker), and text (the verbatim words). Include only real speech, no description or recap, no timestamps inside the text.`,
              },
              {
                inlineData: {
                  mimeType: geminiMime[format] || "audio/webm",
                  data: audioBuffer.toString("base64"),
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                start: { type: "NUMBER" },
                end: { type: "NUMBER" },
                speaker: { type: "NUMBER" },
                text: { type: "STRING" },
              },
              required: ["start", "end", "speaker", "text"],
            },
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    let message = `Gemini transcription returned status ${response.status}`;
    try {
      const parsed = JSON.parse(errorText);
      message = parsed?.error?.message || message;
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  let parsed: any[];
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Gemini returned an invalid transcript JSON.");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Gemini returned an empty transcript. Please try again.");
  }

  const segments: { start: number; end: number; text: string; speaker: string | null }[] = parsed
    .map((s: any) => ({
      start: Number(s?.start) || 0,
      end: Number(s?.end) || (Number(s?.start) || 0) + 3,
      speaker: toSpeakerLabel(s?.speaker),
      text: String(s?.text || "").trim(),
    }))
    .filter((s) => s.text.length > 0);

  const durationSeconds = segments[segments.length - 1]?.end || 0;
  const fullText = segments.map((s) => s.text).join(" ");

  return {
    segments: assignSpeakers(segments),
    durationSeconds,
    fullText,
  };
}

/**
 * Transcribe an audio Buffer. Primary path is Gemini 3.7 Flash with real
 * speaker diarization; fallback is OpenRouter's STT endpoint (whisper).
 * Returns timestamped segments with best-effort speaker clustering.
 */
export async function transcribeMeetingAudio(
  audioBuffer: Buffer,
  mimeType: string,
  title: string
): Promise<{ segments: TranscriptSegment[]; durationSeconds: number; fullText: string }> {
  if (audioBuffer.length === 0 || audioBuffer.length > MAX_AUDIO_FILE_BYTES) {
    throw new Error(
      `Audio file is ${Math.round(audioBuffer.length / 1024 / 1024)}MB. Please keep recordings under 15MB (~15-20 minutes).`
    );
  }

  // Try Gemini first for top-notch diarized transcription.
  if (getGeminiKey()) {
    try {
      const geminiResult = await transcribeWithGemini(audioBuffer, mimeType);
      if (geminiResult) {
        return geminiResult;
      }
    } catch (error: any) {
      console.error("Gemini transcription failed, falling back to whisper:", error?.message || error);
    }
  }

  return transcribeWithWhisper(audioBuffer, mimeType);
}

async function transcribeWithWhisper(
  audioBuffer: Buffer,
  mimeType: string
): Promise<{ segments: TranscriptSegment[]; durationSeconds: number; fullText: string }> {
  const apiKey = getOpenRouterKey();
  if (!apiKey) {
    throw new Error("No AI key is configured. Set GEMINI_API_KEY or OPENROUTER_API_KEY.");
  }

  const format = mimeToFormat(mimeType);

  const response = await fetch("https://openrouter.ai/api/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "openai/whisper-large-v3",
      input_audio: {
        data: audioBuffer.toString("base64"),
        format,
      },
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    let message = `OpenRouter transcription returned status ${response.status}`;
    try {
      const parsed = JSON.parse(errorText);
      message = parsed?.error?.message || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const data = await response.json();

  // Segment-level timestamps from the STT model (rarely includes speakers).
  if (Array.isArray(data?.segments) && data.segments.length > 0) {
    const segments = data.segments
      .map((s: any, i: number) => {
        const speakerIdx =
          s.speaker !== undefined && s.speaker !== null
            ? Number(s.speaker)
            : Number.isInteger(s.speakerIndex)
              ? Number(s.speakerIndex)
              : null;
        const speaker = speakerIdx !== null ? `Speaker ${speakerIdx + 1}` : null;
        return {
          start: Number(s.start) || 0,
          end: Number(s.end) || (Number(s.start) || 0) + 3,
          speaker,
          text: (s.text || "").trim(),
        };
      })
      .filter((s: { text: string }) => s.text.length > 0);

    const durationSeconds = Number(data?.duration) || segments[segments.length - 1]?.end || 0;
    const fullText = segments.map((s: { text: string }) => s.text).join(" ");

    return {
      segments: assignSpeakers(segments),
      durationSeconds,
      fullText,
    };
  }

  // Plain text transcript fallback.
  const fullText = String(data?.text || "").trim();
  if (!fullText) {
    throw new Error("The transcriber returned an empty transcript. Please try again.");
  }
  return {
    segments: [{ start: 0, end: 3, speaker: "Speaker 1", text: fullText }],
    durationSeconds: 3,
    fullText,
  };
}

function mimeToFormat(mime: string): string {
  const m = (mime || "").toLowerCase();
  if (m.includes("mp3")) return "mp3";
  if (m.includes("mp4") || m.includes("m4a")) return "m4a";
  if (m.includes("wav")) return "wav";
  if (m.includes("ogg") || m.includes("opus")) return "ogg";
  if (m.includes("flac")) return "flac";
  if (m.includes("aac")) return "aac";
  return "webm"; // MediaRecorder default
}

const MIN_PAUSE_SECONDS = 0.6; // gap between segments that counts as a speaker change
const MAX_UTTERANCE_SECONDS = 90; // force a boundary so a speaker doesn't monopolize forever

/**
 * Cluster Whisper segments into utterances and assign consistent Speaker labels.
 * When the STT gave a speaker index (Gemini diarization) we trust it. When it
 * did not (plain whisper), every segment belongs to the same single speaker
 * ("Speaker 1") — we NEVER invent extra speakers from pauses alone.
 */
export function assignSpeakers(segments: { start: number; end: number; text: string; speaker: string | null }[]): TranscriptSegment[] {
  const utterances: TranscriptSegment[] = [];
  let currentSpeaker: string | null = null;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const prev = segments[i - 1];
    const gap = i === 0 ? 0 : seg.start - (prev?.end ?? prev?.start ?? 0);

    // If the model supplied a speaker label, trust it; otherwise this whole
    // transcript is a single speaker.
    if (seg.speaker) {
      currentSpeaker = seg.speaker;
    } else if (currentSpeaker === null) {
      currentSpeaker = "Speaker 1";
    }

    const lastUtterance = utterances[utterances.length - 1];
    const extendable =
      lastUtterance &&
      lastUtterance.speaker === currentSpeaker &&
      seg.start - lastUtterance.start < MAX_UTTERANCE_SECONDS &&
      gap < MIN_PAUSE_SECONDS;

    if (extendable && lastUtterance) {
      lastUtterance.end = seg.end;
      lastUtterance.text = `${lastUtterance.text} ${seg.text}`.trim();
    } else {
      utterances.push({
        start: seg.start,
        end: seg.end,
        speaker: currentSpeaker,
        text: seg.text,
      });
    }
  }

  // Normalize speaker numbering to 1..N in order of first appearance.
  const seenOrder: string[] = [];
  const normalized = utterances.map((u) => {
    if (!seenOrder.includes(u.speaker)) seenOrder.push(u.speaker);
    return { ...u, speaker: `Speaker ${seenOrder.indexOf(u.speaker) + 1}` };
  });

  return normalized;
}

/**
 * Build the speaker list (one entry per distinct speaker) with a clipStart
 * pointing at their first utterance so the UI can play a sample for ID.
 */
export function buildSpeakers(segments: TranscriptSegment[]): MeetingSpeaker[] {
  const map = new Map<string, MeetingSpeaker>();
  for (const seg of segments) {
    const existing = map.get(seg.speaker);
    if (existing) {
      existing.utteranceCount += 1;
    } else {
      map.set(seg.speaker, {
        id: `speaker-${map.size + 1}`,
        label: seg.speaker,
        renamedTo: null,
        clipStart: seg.start,
        utteranceCount: 1,
      });
    }
  }
  return Array.from(map.values());
}

/**
 * Produce a structured meeting summary from the transcript via the LLM.
 */
export async function summarizeMeeting(
  title: string,
  meetingDate: string | null,
  segments: TranscriptSegment[],
  durationSeconds: number
): Promise<MeetingSummary> {
  const transcript = segments
    .map((s) => `${s.speaker}: ${s.text}`)
    .join("\n");

  const prompt = `You are an expert meeting-minutes assistant. Below is an AI-transcribed, speaker-labeled transcript of a meeting.

Meeting title: ${title || "Untitled meeting"}
Date: ${meetingDate || "Not specified"}
Duration: ${Math.round(durationSeconds / 60)} minutes

Transcript:
"""
${transcript}
"""

Create professional meeting minutes. Respond with ONLY valid JSON (no markdown fences, no extra text) with this exact shape:
{
  "title": "A cleaned, professional meeting title derived from the discussion",
  "date": "${meetingDate || new Date().toISOString().slice(0, 10)}",
  "durationMinutes": ${Math.max(1, Math.round(durationSeconds / 60))},
  "speakers": ["Speaker 1", "Speaker 2", ...],
  "overview": "2-4 sentence neutral summary of the whole meeting",
  "keyPoints": ["bullet", "bullet", ...],
  "decisions": ["bullet", ...],
  "actionItems": [{"task": "description", "owner": "Speaker X or null"}]
}

Rules:
- Keep speaker labels exactly as given (Speaker 1, Speaker 2, ...). Do NOT invent real names.
- keyPoints: 3-8 distinct, factual points raised.
- decisions: only list clear decisions; empty array if none were made.
- actionItems: only where an explicit follow-up or task was stated; empty array if none.
- Do not fabricate content not present in the transcript.`;

  const { callOpenRouter } = await import("./openrouter");
  const raw = await callOpenRouter(prompt, {
    model: "google/gemini-2.5-flash",
    temperature: 0.3,
    responseFormat: "json",
  });

  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const parsed = JSON.parse(cleaned) as MeetingSummary;

  if (!parsed || !Array.isArray(parsed.keyPoints)) {
    throw new Error("The AI did not return a valid meeting summary.");
  }

  return {
    title: parsed.title || title || "Meeting Minutes",
    date: parsed.date || (meetingDate || new Date().toISOString().slice(0, 10)),
    durationMinutes: Number(parsed.durationMinutes) || Math.max(1, Math.round(durationSeconds / 60)),
    speakers: Array.isArray(parsed.speakers) ? parsed.speakers : [],
    overview: parsed.overview || "",
    keyPoints: (parsed.keyPoints || []).map((k) => String(k)),
    decisions: (parsed.decisions || []).map((d) => String(d)),
    actionItems: (parsed.actionItems || []).map((a) => ({
      task: String(a?.task || ""),
      owner: a?.owner ? String(a.owner) : null,
    })),
  };
}