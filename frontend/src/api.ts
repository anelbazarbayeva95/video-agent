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

export async function analyzeVideo(
  file: File,
  prompt: string,
  onEvent: (event: StreamEvent) => void
): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  if (prompt) form.append("prompt", prompt);

  const res = await fetch("http://localhost:8000/analyze", {
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
