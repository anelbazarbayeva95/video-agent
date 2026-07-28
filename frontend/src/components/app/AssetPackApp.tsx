import { useCallback, useRef, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { Upload, RotateCcw, Loader } from "lucide-react";
import { getBestFrames, checkHealth, isConnectionError } from "../../api";
import type { BestFrame } from "../../api";
import SelectionTimeline from "./SelectionTimeline";
import RankedFrames from "./RankedFrames";
import FrameAnalysis from "./FrameAnalysis";
import AssetLightbox, { type PreviewItem } from "./AssetLightbox";
import { KadrWordmark } from "../Brand";
import "./assetpack.css";

const OFFLINE_MSG =
  "Can't reach the Kadr server — it may be offline or starting up. Give it a moment and try again.";

function ts(t?: number) {
  if (t == null) return undefined;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function AssetPackApp({ onBack }: { onBack?: () => void }) {
  const reduce = useReducedMotion();
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [frames, setFrames] = useState<BestFrame[]>([]);
  const [selected, setSelected] = useState(0);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(5);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [editor, setEditor] = useState<PreviewItem | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const analyze = useCallback(
    async (f: File) => {
      setFrames([]);
      setSelected(0);
      setError(null);
      setElapsed(null);
      setRunning(true);
      const t0 = performance.now();
      try {
        if (!(await checkHealth())) {
          setError(OFFLINE_MSG);
          return;
        }
        const fr = await getBestFrames(f, undefined, count);
        setFrames(fr);
        setSelected(0);
        setElapsed((performance.now() - t0) / 1000);
      } catch (err: any) {
        setError(isConnectionError(err) ? OFFLINE_MSG : err?.message || "Something went wrong.");
      } finally {
        setRunning(false);
      }
    },
    [count],
  );

  const start = useCallback(
    (f: File) => {
      setFile(f);
      setVideoUrl(URL.createObjectURL(f));
      analyze(f);
    },
    [analyze],
  );

  // Selecting a frame drives the inspector: seek the video, update the panel.
  const selectFrame = useCallback(
    (i: number) => {
      setSelected(i);
      const v = videoRef.current;
      const fr = frames[i];
      if (v && fr && typeof fr.timestamp === "number") {
        try {
          v.currentTime = fr.timestamp;
        } catch {
          /* seek before metadata is loaded — ignored */
        }
      }
    },
    [frames],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (f) start(f);
    },
    [start],
  );

  function reset() {
    setFile(null);
    setVideoUrl(null);
    setFrames([]);
    setSelected(0);
    setError(null);
    setElapsed(null);
  }

  function downloadFrame(i: number) {
    const f = frames[i];
    if (!f) return;
    const a = document.createElement("a");
    a.href = `data:image/jpeg;base64,${f.image_b64}`;
    a.download = `frame_${i + 1}.jpg`;
    a.click();
  }

  function editItem(i: number): PreviewItem {
    const f = frames[i];
    return {
      url: `data:image/jpeg;base64,${f.image_b64}`,
      label: f.label || "Moment",
      sceneLabel: f.scene?.label,
      sublabel: ts(f.timestamp),
      rank: i + 1,
      reason: f.reason,
      downloadName: `frame_${i + 1}.jpg`,
    };
  }

  const current = frames[selected] ?? null;
  const duration = frames[0]?.duration;
  const analyzed = frames[0]?.analyzed;

  return (
    <div className="kadr-app min-h-screen bg-ink text-bone">
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
                <p className="text-lg font-medium">Drop a video to analyze</p>
                <p className="mt-1 text-sm text-bone/65">
                  Kadr understands every frame, ranks the best moments, and explains why.
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

            <div className="mt-4 flex items-center justify-between rounded-2xl border border-bone/10 bg-ash px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-bone/60">Best frames to rank</p>
                <p className="mt-1 text-sm text-bone/55">A target — Kadr returns as many distinct strong frames as it finds.</p>
              </div>
              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="rounded-lg border border-bone/15 bg-ink px-3 py-2 text-sm text-bone"
              >
                {[3, 5, 8, 12].map((n) => (
                  <option key={n} value={n}>up to {n}</option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Analysis header */}
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Best frame analysis</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-bone/55">
                {frames.length > 0 ? (
                  <>
                    <span><span className="text-bone/85">{frames.length}</span> recommended</span>
                    {duration != null && <span><span className="text-bone/85">{ts(duration)}</span> clip</span>}
                    {analyzed != null && <span><span className="text-bone/85">{analyzed}</span> frames analyzed</span>}
                    {elapsed != null && <span>in <span className="text-bone/85">{elapsed.toFixed(1)}s</span></span>}
                  </>
                ) : running ? (
                  <span>Analyzing your video…</span>
                ) : null}
              </div>
            </div>

            {/* Video hero (left) + inspector (right) */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              <div className="space-y-4">
                {videoUrl && (
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    controls
                    className="w-full rounded-2xl border border-bone/10 bg-black"
                  />
                )}
                {running && (
                  <div className="flex items-center gap-2 rounded-2xl border border-bone/10 bg-ash px-4 py-3 text-sm text-bone/70">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
                      className="flex"
                    >
                      <Loader size={14} />
                    </motion.span>
                    Analyzing your video…
                  </div>
                )}
                {error && (
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    <span>{error}</span>
                    {file && !running && (
                      <button
                        onClick={() => analyze(file)}
                        className="flex shrink-0 items-center gap-1.5 rounded-full border border-red-300/40 bg-transparent px-3 py-1.5 text-xs font-medium text-red-100 transition hover:border-red-200/70 hover:text-white"
                      >
                        <RotateCcw size={12} /> Retry
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <RankedFrames
                  frames={frames}
                  selected={selected}
                  loading={running}
                  onSelect={selectFrame}
                  onDownload={downloadFrame}
                />
                {frames.length > 0 && (
                  <SelectionTimeline frames={frames} selected={selected} onSelect={selectFrame} />
                )}
              </div>
            </div>

            {/* Frame analysis — full width */}
            {frames.length > 0 && (
              <FrameAnalysis
                frame={current}
                rank={selected + 1}
                total={frames.length}
                onDownload={() => downloadFrame(selected)}
                onEdit={() => setEditor(editItem(selected))}
              />
            )}
          </div>
        )}
      </main>

      <AnimatePresence>
        {editor && <AssetLightbox item={editor} onClose={() => setEditor(null)} />}
      </AnimatePresence>
    </div>
  );
}
