import { useCallback, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Upload, RotateCcw, Download, Loader } from "lucide-react";
import JSZip from "jszip";
import { buildAssetPack, checkHealth, isConnectionError } from "../../api";
import type { BestFrame, PackAsset, AssetPackEvent } from "../../api";
import ProcessingTimeline, { type Step } from "./ProcessingTimeline";
import AssetPackGrid from "./AssetPackGrid";
import { KadrWordmark } from "../Brand";
import "./assetpack.css";

const STAGES = [
  { key: "analyzing", label: "Detecting scenes & best frames" },
  { key: "generating", label: "Generating assets" },
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
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opts, setOpts] = useState({ count: 5, stickers: 3, thumbnails: 1, stories: 1 });
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

  const OFFLINE_MSG =
    "Can't reach the Kadr server — it may be offline or starting up. Give it a moment and try again.";

  // Run (or re-run) the pipeline for an already-selected file. Pings the backend
  // first so a dead server fails fast with a clear message instead of after a
  // full video upload ends in a cryptic "Load failed".
  const runPipeline = useCallback(async (f: File) => {
    setFrames([]);
    setAssets([]);
    setError(null);
    setStatusMsg(null);
    setStage("analyzing");
    setRunning(true);
    try {
      if (!(await checkHealth())) {
        setStage(null);
        setError(OFFLINE_MSG);
        return;
      }
      await buildAssetPack(f, (e: AssetPackEvent) => {
        if (e.type === "status") { setStage(e.stage); setStatusMsg(e.message); }
        else if (e.type === "frames") setFrames(e.frames);
        else if (e.type === "asset") setAssets((prev) => [...prev, e.asset]);
        else if (e.type === "asset_error") console.warn("asset error", e);
        else if (e.type === "error") setError(e.message);
      }, opts);
    } catch (err: any) {
      setStage(null);
      setError(isConnectionError(err) ? OFFLINE_MSG : err?.message || "Something went wrong.");
    } finally {
      setRunning(false);
    }
  }, [opts]);

  const start = useCallback((f: File) => {
    setFile(f);
    setVideoUrl(URL.createObjectURL(f));
    runPipeline(f);
  }, [runPipeline]);

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
    setStatusMsg(null);
    setError(null);
  }

  async function exportPack() {
    const zip = new JSZip();
    frames.forEach((f, i) => zip.file(`best-frames/frame_${i + 1}.jpg`, b64ToBytes(f.image_b64)));
    let sc = 0, tc = 0, stc = 0;
    assets.forEach((a) => {
      if (a.kind === "sticker") zip.file(`stickers/sticker_${++sc}.png`, b64ToBytes(a.image_b64));
      else if (a.kind === "thumbnail") zip.file(`thumbnails/thumbnail_16x9_${++tc}.jpg`, b64ToBytes(a.image_b64));
      else if (a.kind === "story") zip.file(`stories/story_9x16_${++stc}.jpg`, b64ToBytes(a.image_b64));
    });
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "kadr-asset-pack.zip";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  return (
    <div className="kadr-app min-h-screen bg-ink text-bone">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-bone/10 bg-ink/85 px-6 py-4 backdrop-blur">
        <button onClick={onBack} className="bg-transparent" aria-label="Back to home">
          <KadrWordmark size={18} />
        </button>
        {file && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 rounded-full border border-bone/15 bg-transparent px-3 py-1.5 text-xs text-bone/70 transition hover:border-bone/35 hover:text-bone"
          >
            <RotateCcw size={12} /> New video
          </button>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {!file ? (
          <div className="mx-auto mt-10 w-full max-w-2xl">
            <motion.button
              onClick={() => fileInput.current?.click()}
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              initial={{ opacity: 0, y: reduce ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="group flex min-h-[300px] w-full flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-bone/15 bg-bone/[0.02] px-8 text-center text-bone transition hover:border-bone/30 hover:bg-bone/[0.04]"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-bone/10 bg-bone/[0.04] text-ember transition group-hover:scale-105">
                <Upload size={24} />
              </div>
              <div>
                <p className="text-lg font-medium">Drop a video to create an asset pack</p>
                <p className="mt-1 text-sm text-bone/65">
                  Kadr finds the best frames and turns them into social-ready visuals.
                </p>
              </div>
              <span className="mt-2 rounded-full bg-ember px-5 py-2.5 text-sm font-semibold text-ink transition group-hover:bg-[#E39A55]">
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

            {/* Pack contents */}
            <div className="mt-4 rounded-2xl border border-bone/10 bg-ash px-5 py-4">
              <p className="mb-3 text-xs uppercase tracking-[0.18em] text-bone/60">Pack contents</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(
                  [
                    ["count", "Best frames"],
                    ["stickers", "Stickers"],
                    ["thumbnails", "Thumbnails"],
                    ["stories", "Stories"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex flex-col gap-1.5 text-xs text-bone/70">
                    {label}
                    <select
                      value={opts[key]}
                      onChange={(e) => setOpts((o) => ({ ...o, [key]: Number(e.target.value) }))}
                      className="rounded-lg border border-bone/15 bg-ink px-2.5 py-2 text-sm text-bone"
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[300px_1fr]">
              <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
                {videoUrl && (
                  <video
                    src={videoUrl}
                    controls
                    className="w-full rounded-2xl border border-bone/10 bg-black"
                  />
                )}
                <div className="rounded-2xl border border-bone/10 bg-ash p-4">
                  <p className="mb-3 text-xs uppercase tracking-[0.18em] text-bone/60" aria-live="polite">
                    {done ? "Asset pack ready" : "Generating"}
                  </p>
                  <ProcessingTimeline steps={steps} />
                  {!done && statusMsg && (
                    <p className="mt-3 font-mono text-[11px] text-bone/60">{statusMsg}</p>
                  )}
                </div>
              </div>

              <div className="min-w-0">
                {error && (
                  <div className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    <span>{error}</span>
                    {file && !running && (
                      <button
                        onClick={() => runPipeline(file)}
                        className="flex shrink-0 items-center gap-1.5 rounded-full border border-red-300/40 bg-transparent px-3 py-1.5 text-xs font-medium text-red-100 transition hover:border-red-200/70 hover:text-white"
                      >
                        <RotateCcw size={12} /> Retry
                      </button>
                    )}
                  </div>
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
          className="sticky bottom-0 z-30 border-t border-bone/10 bg-ink/90 px-6 py-4 backdrop-blur"
        >
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <span className="text-sm text-bone/60">
              {frames.length} frames · {assets.filter((a) => a.kind === "sticker").length} stickers · thumbnail · story
            </span>
            <button
              onClick={exportPack}
              className="flex items-center gap-2 rounded-full bg-ember px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-[#E39A55]"
            >
              <Download size={15} /> Export pack (.zip)
            </button>
          </div>
        </motion.div>
      )}

      {running && !done && (
        <div className="pointer-events-none fixed bottom-6 right-6 flex items-center gap-2 rounded-full border border-bone/10 bg-ink/85 px-4 py-2 text-xs text-bone/70 backdrop-blur">
          <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}>
            <Loader size={13} />
          </motion.span>
          Building your asset pack…
        </div>
      )}
    </div>
  );
}
