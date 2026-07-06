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
  label?: string;
}

export async function getBestFrames(
  file: File,
  prompt?: string,
  count?: number,
): Promise<BestFrame[]> {
  const form = new FormData();
  form.append("file", file);
  if (prompt) form.append("prompt", prompt);
  if (count != null) form.append("count", String(count));

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

export interface PackAsset {
  kind: "thumbnail" | "story" | "sticker";
  aspect?: string;
  image_b64: string;
  mime: string;
  timestamp?: number;
  label?: string;
}

export type AssetPackEvent =
  | { type: "status"; stage: string; message: string }
  | { type: "frames"; frames: BestFrame[] }
  | { type: "asset"; asset: PackAsset }
  | { type: "asset_error"; kind: string; message: string }
  | { type: "error"; message: string }
  | { type: "done" };

export interface AssetPackOptions {
  prompt?: string;
  count?: number;
  stickerStyle?: string;
  stickers?: number;
  thumbnails?: number;
  stories?: number;
}

export async function buildAssetPack(
  file: File,
  onEvent: (e: AssetPackEvent) => void,
  opts: AssetPackOptions = {},
): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  if (opts.prompt) form.append("prompt", opts.prompt);
  if (opts.count != null) form.append("count", String(opts.count));
  if (opts.stickerStyle) form.append("sticker_style", opts.stickerStyle);
  if (opts.stickers != null) form.append("stickers", String(opts.stickers));
  if (opts.thumbnails != null) form.append("thumbnails", String(opts.thumbnails));
  if (opts.stories != null) form.append("stories", String(opts.stories));

  const res = await fetch(`${API}/asset-pack`, { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail || "Asset pack failed");
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

export type Aspect = "16:9" | "9:16" | "1:1";

export async function reframe(imageB64: string, aspect: Aspect): Promise<Blob> {
  const bin = atob(imageB64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

  const form = new FormData();
  form.append("file", new Blob([bytes], { type: "image/jpeg" }), "frame.jpg");
  form.append("aspect", aspect);

  const res = await fetch(`${API}/reframe`, { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail || "Reframe failed");
  }
  return res.blob();
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
