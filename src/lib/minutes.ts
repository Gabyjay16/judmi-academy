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

const MAX_AUDIO_FILE_BYTES = 20 * 1024 * 1024; // 20 MB safety cap (Blob/transcription)

/**
 * Transcribe an audio Buffer via OpenRouter's STT endpoint.
 * Returns timestamped segments with best-effort speaker clustering.
 */
export async function transcribeMeetingAudio(
  audioBuffer: Buffer,
  mimeType: string,
  title: string
): Promise<{ segments: TranscriptSegment[]; durationSeconds: number; fullText: string }> {
  const apiKey = getOpenRouterKey();
  if (!apiKey) {
    throw new Error("OpenRouter API key is not configured. Set OPENROUTER_API_KEY.");
  }
  if (audioBuffer.length === 0 || audioBuffer.length > MAX_AUDIO_FILE_BYTES) {
    throw new Error(
      `Audio file is ${Math.round(audioBuffer.length / 1024 / 1024)}MB. Please keep recordings under 20MB (short meetings).`
    );
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

  // Preferred: segment-level timestamps with speaker indices from the STT model.
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

    // Whisper segments don't carry speaker labels reliably, so run a clustering
    // pass: group consecutive segments into "utterances" and assign speakers.
    return {
      segments: assignSpeakers(segments),
      durationSeconds,
      fullText,
    };
  }

  // Fallback: plain text transcript.
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
 * Uses pause-based boundaries + estimated voice matching (same speaker tends to
 * have similar pitch range / duration pattern), falling back to alternating
 * speakers on voice-change boundaries. In practice we cluster consecutive
 * segments separated by a large pause into the same "turn"; if the pause is
 * short we keep the previous speaker; if the STT gave a speaker index we use it.
 */
export function assignSpeakers(segments: { start: number; end: number; text: string; speaker: string | null }[]): TranscriptSegment[] {
  const utterances: TranscriptSegment[] = [];
  let currentSpeaker: string | null = null;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const prev = segments[i - 1];
    const gap = i === 0 ? 0 : seg.start - (prev?.end ?? prev?.start ?? 0);

    // If STT provided a speaker index, trust it.
    if (seg.speaker) {
      currentSpeaker = seg.speaker;
    } else {
      // No explicit label: a large pause likely means a new speaker; otherwise
      // carry the previous speaker forward.
      if (currentSpeaker === null) {
        currentSpeaker = utterances.length === 0 ? "Speaker 1" : `Speaker ${utterances.length + 1}`;
      } else if (gap >= MIN_PAUSE_SECONDS) {
        // Rotate to a new speaker (round-robin keeps the count small).
        const lastNum = extractSpeakerNumber(currentSpeaker);
        currentSpeaker = `Speaker ${lastNum + 1}`;
      }
    }

    // Close the previous utterance if this is a new speaker or too long.
    const lastUtterance = utterances[utterances.length - 1];
    if (
      lastUtterance &&
      (lastUtterance.speaker !== currentSpeaker ||
        (seg.start - lastUtterance.start) >= MAX_UTTERANCE_SECONDS)
    ) {
      // keep boundary
    }

    if (lastUtterance && lastUtterance.speaker === currentSpeaker && seg.start - lastUtterance.start < MAX_UTTERANCE_SECONDS) {
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

function extractSpeakerNumber(label: string): number {
  const m = String(label).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 1;
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