// Backend base URL. Override per-deploy by setting VITE_API_URL (e.g. a
// Hugging Face Space, Render, or Cloud Run URL) in the frontend's env — no code
// change needed to move the backend. Falls back to the original Railway host.
const API = (
  (import.meta.env.VITE_API_URL as string | undefined) ||
  "https://video-agent-production-9eb9.up.railway.app"
).replace(/\/+$/, "");

// Is the backend reachable? Used to fail fast with a clear message before
// uploading a whole video to a server that's offline or still starting up.
export async function checkHealth(timeoutMs = 8000): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${API}/health`, { signal: ctrl.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

// Poll /health until the server answers, up to `maxMs`. The free backend spins
// down when idle and cold-starts in ~50s, so the first request should wait it
// out (with a "waking up" message) rather than fail immediately.
export async function waitForServer(maxMs = 75000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (await checkHealth(8000)) return true;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

// fetch() rejects with a TypeError when the request never reaches the server
// (offline, DNS/TLS failure, CORS block, connection dropped) — as opposed to an
// HTTP error status, which resolves normally. Lets us show a connection-specific
// message instead of the browser's cryptic "Load failed".
export function isConnectionError(err: unknown): boolean {
  return err instanceof TypeError;
}

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

// Deterministic, pixel-computed metrics (pure Pillow on the backend).
export interface FrameMetrics {
  sharpness: number;    // 0-100, relative to the other frames in this clip
  sharpnessRaw: number; // raw variance-of-Laplacian
  exposure: number;     // mean luminance, 0-255
  uniqueness: number;   // 0-100 distinctness from the other picks
}

export interface BestFrame {
  timestamp: number;
  reason: string;
  image_b64: string;
  score?: number | null;
  scores?: FrameScores;
  scene?: FrameScene;
  label?: string;
  duration?: number; // total video length (s); optional — absent on older responses
  analyzed?: number; // frames sampled + scored; optional
  metrics?: FrameMetrics; // deterministic CV metrics; optional
  evidence?: string[];    // grounded, measured evidence bullets; optional
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

export interface ExpandMargins {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
}

function blobToB64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

function b64ToBytes(imageB64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(imageB64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// Preset expand: symmetric to a named aspect ratio.
export async function expandImage(imageB64: string, aspect: string): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([b64ToBytes(imageB64)], { type: "image/jpeg" }), "frame.jpg");
  form.append("aspect", aspect);

  const res = await fetch(`${API}/expand`, { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail || "Expand failed");
  }
  return blobToB64(await res.blob());
}

// Free-form expand: extend each side by a fraction of its dimension (drag).
export async function expandMargins(imageB64: string, m: ExpandMargins): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([b64ToBytes(imageB64)], { type: "image/jpeg" }), "frame.jpg");
  form.append("left", String(m.left ?? 0));
  form.append("right", String(m.right ?? 0));
  form.append("top", String(m.top ?? 0));
  form.append("bottom", String(m.bottom ?? 0));

  const res = await fetch(`${API}/expand`, { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail || "Expand failed");
  }
  return blobToB64(await res.blob());
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
