export interface Segment {
  start: number;
  end: number;
  caption: string;
  pacing_note: string;
  cut_recommended: boolean;
  cut_reason: string | null;
}

export interface Analysis {
  duration_estimate: number;
  overall_pacing: "slow" | "medium" | "fast";
  summary: string;
  segments: Segment[];
  overall_notes: string;
}

export type StreamEvent =
  | { type: "status"; message: string }
  | { type: "result"; data: Analysis }
  | { type: "error"; message: string };

const API = "https://video-agent-production-9eb9.up.railway.app";

export async function analyzeVideo(
  file: File,
  prompt: string,
  onEvent: (event: StreamEvent) => void
): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  if (prompt) form.append("prompt", prompt);

  const res = await fetch(`${API}/analyze`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Request failed");
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (raw === "[DONE]") return;
      try {
        onEvent(JSON.parse(raw));
      } catch {}
    }
  }
}

export async function trimVideo(
  file: File,
  segmentsToRemove: { start: number; end: number }[]
): Promise<Blob> {
  const form = new FormData();
  form.append("file", file);
  form.append("segments_to_remove", JSON.stringify(segmentsToRemove));

  const res = await fetch(`${API}/trim`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Trim failed");
  }

  return res.blob();
}

export interface BestFrame {
  timestamp: number;
  reason: string;
  image_b64: string;
}

export async function getBestFrames(file: File, prompt?: string): Promise<BestFrame[]> {
  const form = new FormData();
  form.append("file", file);
  if (prompt) form.append("prompt", prompt);

  const res = await fetch(`${API}/best-frames`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Frame extraction failed");
  }

  const data = await res.json();
  return data.frames;
}

export function exportSRT(segments: Segment[]): string {
  return segments
    .map((seg, i) => {
      const start = toSRTTime(seg.start);
      const end = toSRTTime(seg.end);
      return `${i + 1}\n${start} --> ${end}\n${seg.caption}\n`;
    })
    .join("\n");
}

function toSRTTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.round((s % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(sec)},${pad(ms, 3)}`;
}

function pad(n: number, len = 2): string {
  return String(n).padStart(len, "0");
}
