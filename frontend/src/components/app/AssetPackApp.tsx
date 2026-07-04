import { useCallback, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Upload, RotateCcw, Download, Loader } from "lucide-react";
import JSZip from "jszip";
import { buildAssetPack } from "../../api";
import type { BestFrame, PackAsset, AssetPackEvent } from "../../api";
import ProcessingTimeline, { type Step } from "./ProcessingTimeline";
import AssetPackGrid from "./AssetPackGrid";
import "./assetpack.css";

const STAGES = [
  { key: "analyzing", label: "Detecting scenes & best frames" },
  { key: "thumbnail", label: "Creating thumbnail" },
  { key: "story", label: "Creating story" },
  { key: "sticker", label: "Making stickers" },
  { key: "done", label: "Pack ready" },
];

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export default function AssetPackApp({ onBack }: { onBack?: () => void }) {
  const reduce = useReducedMotion();
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [frames, setFrames] = useState<BestFrame[]>([]);
  const [assets, setAssets] = useState<PackAsset[]>([]);
  const [stage, setStage] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const steps: Step[] = useMemo(() => {
    const cur = stage ? STAGES.findIndex((s) => s.key === stage) : -1;
    return STAGES.map((s, i) => ({
      key: s.key,
      label: s.label,
      state:
        stage === "done" || (cur >= 0 && i < cur)
          ? "complete"
          : cur === i
          ? "active"
          : "pending",
    }));
  }, [stage]);

  const done = stage === "done";

  const start = useCallback(async (f: File) => {
    setFile(f);
    setVideoUrl(URL.createObjectURL(f));
    setFrames([]);
    setAssets([]);
    setError(null);
    setStage("analyzing");
    setRunning(true);
    try {
      await buildAssetPack(f, (e: AssetPackEvent) => {
        if (e.type === "status") setStage(e.stage);
        else if (e.type === "frames") setFrames(e.frames);
        else if (e.type === "asset") setAssets((prev) => [...prev, e.asset]);
        else if (e.type === "asset_error") console.warn("asset error", e);
        else if (e.type === "error") setError(e.message);
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) start(f);
  }, [start]);

  function reset() {
    setFile(null);
    setVideoUrl(null);
    setFrames([]);
    setAssets([]);
    setStage(null);
    setError(null);
  }

  async function exportPack() {
    const zip = new JSZip();
    frames.forEach((f, i) => zip.file(`best-frames/frame_${i + 1}.jpg`, b64ToBytes(f.image_b64)));
    let sc = 0;
    assets.forEach((a) => {
      if (a.kind === "sticker") zip.file(`stickers/sticker_${++sc}.png`, b64ToBytes(a.image_b64));
      else if (a.kind === "thumbnail") zip.file(`thumbnail_16x9.jpg`, b64ToBytes(a.image_b64));
      else if (a.kind === "story") zip.file(`story_9x16.jpg`, b64ToBytes(a.image_b64));
    });
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "kadr-asset-pack.zip";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.06] bg-[#050505]/80 px-6 py-4 backdrop-blur">
        <button onClick={onBack} className="flex items-center gap-2 bg-transparent text-white" aria-label="Back to home">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="1" y="1" width="22" height="22" rx="3" stroke="#c4b5fd" strokeWidth="1.5" />
            <rect x="14" y="14" width="5" height="5" fill="#c4b5fd" />
          </svg>
          <span className="text-sm font-semibold tracking-tight">Kadr</span>
        </button>
        {file && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-transparent px-3 py-1.5 text-xs text-white/70 transition hover:border-white/25 hover:text-white"
          >
            <RotateCcw size={12} /> New video
          </button>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {!file ? (
          <motion.button
            onClick={() => fileInput.current?.click()}
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            initial={{ opacity: 0, y: reduce ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="group mx-auto mt-10 flex min-h-[340px] w-full max-w-2xl flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/15 bg-white/[0.02] px-8 text-center text-white transition hover:border-white/30 hover:bg-white/[0.04]"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/70 transition group-hover:scale-105">
              <Upload size={24} />
            </div>
            <div>
              <p className="text-lg font-medium">Drop a video to create an asset pack</p>
              <p className="mt-1 text-sm text-white/50">
                Kadr finds the best frames and turns them into social-ready visuals.
              </p>
            </div>
            <span className="mt-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition group-hover:bg-white/90">
              Choose Video
            </span>
            <input
              ref={fileInput}
              type="file"
              accept="video/*"
              hidden
              onChange={(e) => e.target.files?.[0] && start(e.target.files[0])}
            />
          </motion.button>
        ) : (
          <div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
              <div className="space-y-4">
                {videoUrl && (
                  <video
                    src={videoUrl}
                    controls
                    className="w-full rounded-2xl border border-white/10 bg-black"
                  />
                )}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="mb-3 text-xs uppercase tracking-[0.18em] text-white/40">
                    {done ? "Done" : "Generating"}
                  </p>
                  <ProcessingTimeline steps={steps} />
                </div>
              </div>

              <div>
                {error && (
                  <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                  </p>
                )}
                <AssetPackGrid frames={frames} assets={assets} framesLoading={running} />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Export bar */}
      {done && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-0 z-30 border-t border-white/[0.08] bg-[#050505]/90 px-6 py-4 backdrop-blur"
        >
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <span className="text-sm text-white/60">
              {frames.length} frames · {assets.filter((a) => a.kind === "sticker").length} stickers · thumbnail · story
            </span>
            <button
              onClick={exportPack}
              className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-white/90"
            >
              <Download size={15} /> Export pack (.zip)
            </button>
          </div>
        </motion.div>
      )}

      {running && !done && (
        <div className="pointer-events-none fixed bottom-6 right-6 flex items-center gap-2 rounded-full border border-white/10 bg-black/70 px-4 py-2 text-xs text-white/70 backdrop-blur">
          <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}>
            <Loader size={13} />
          </motion.span>
          Building your asset pack…
        </div>
      )}
    </div>
  );
}
