const API = "https://video-agent-production-9eb9.up.railway.app";

export interface FrameScores {
  sharpness: number | null;
  face: number | null;
  composition: number | null;
}

export interface FrameScene {
  index: number;
  label: string;
  start: number | null;
  end: number | null;
}

export interface BestFrame {
  timestamp: number;
  reason: string;
  image_b64: string;
  score?: number | null;
  scores?: FrameScores;
  scene?: FrameScene;
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

export const STICKER_STYLES = [
  { id: "cutout", label: "Clean Cutout" },
  { id: "photo", label: "Photo" },
  { id: "cartoon", label: "Cartoon" },
  { id: "3d", label: "3D" },
  { id: "pixel", label: "Pixel art" },
  { id: "oil", label: "Oil paint" },
] as const;

export type StickerStyle = (typeof STICKER_STYLES)[number]["id"];

export async function makeSticker(imageB64: string, style: StickerStyle): Promise<Blob> {
  const bin = atob(imageB64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

  const form = new FormData();
  form.append("file", new Blob([bytes], { type: "image/jpeg" }), "frame.jpg");
  form.append("style", style);
  form.append("format", "png");

  const res = await fetch(`${API}/sticker`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail || "Sticker generation failed");
  }

  return res.blob();
}
