import { useCallback, useRef, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { Upload, RotateCcw, Loader } from "lucide-react";
import { getBestFrames, waitForServer, isConnectionError } from "../../api";
import type { BestFrame } from "../../api";
import SelectionTimeline from "./SelectionTimeline";
import RankedFrames from "./RankedFrames";
import FrameAnalysis from "./FrameAnalysis";
import AssetLightbox, { type PreviewItem } from "./AssetLightbox";
import { KadrWordmark } from "../Brand";
import "./assetpack.css";

const OFFLINE_MSG =
  "Can't reach the Kadr server — it may be offline or starting up. Give it a moment and try again.";

// Client-side stage labels shown while the single analysis call runs, so the
// wait reads as progress rather than a blank spinner.
const STAGES = ["Extracting frames", "Evaluating quality", "Selecting best moments"];

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
  const [stage, setStage] = useState(0);
  const [waking, setWaking] = useState(false);
  const [editor, setEditor] = useState<PreviewItem | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const analyze = useCallback(
    async (f: File) => {
      setFrames([]);
      setSelected(0);
      setError(null);
      setElapsed(null);
      setStage(0);
      setRunning(true);
      setWaking(true);
      const t0 = performance.now();
      try {
        // Wait out a possible cold start (free backend sleeps when idle).
        const up = await waitForServer();
        setWaking(false);
        if (!up) {
          setError(OFFLINE_MSG);
          return;
        }
        const iv = setInterval(
          () => setStage((s) => (s < STAGES.length - 1 ? s + 1 : s)),
          6000,
        );
        try {
          const fr = await getBestFrames(f, undefined, count);
          setFrames(fr);
          setSelected(0);
          setElapsed((performance.now() - t0) / 1000);
        } finally {
          clearInterval(iv);
        }
      } catch (err: any) {
        setError(isConnectionError(err) ? OFFLINE_MSG : err?.message || "Something went wrong.");
      } finally {
        setWaking(false);
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
      <header className="sticky top-0 z-30 border-b border-bone/10 bg-ink/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <button onClick={onBack} className="border-0 bg-transparent p-0" aria-label="Back to home">
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
        </div>
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
              <span className="mt-2 rounded-full bg-ember px-5 py-2.5 text-sm font-semibold text-ink transition group-hover:bg-[#26262B]">
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

            <div className="mt-3 flex items-center justify-between rounded-2xl border border-bone/10 bg-ash px-5 py-4">
              <div>
                <p className="text-sm font-medium text-bone/85">Number of frames</p>
                <p className="mt-1 text-sm text-bone/65">Kadr returns up to this many distinct, high-quality moments.</p>
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
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-bone/60">
                {file && <span className="max-w-[26ch] truncate font-medium text-bone/85">{file.name}</span>}
                {duration != null && <span>{ts(duration)}</span>}
                {frames.length > 0 && <span><span className="text-bone/85">{frames.length}</span> best frames</span>}
                {analyzed != null && <span>{analyzed} frames analyzed</span>}
                {elapsed != null && <span>in {elapsed.toFixed(1)}s</span>}
                {running && frames.length === 0 && <span>Analyzing…</span>}
              </div>
            </div>

            {/* Video hero (left) + inspector (right) */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.18em] text-bone/60">Source video</p>
                {videoUrl && (
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    controls
                    // Fill the column for landscape, but cap height so a vertical
                    // clip doesn't become a giant tower; both maxes preserve aspect.
                    className="mx-auto block max-h-[70vh] max-w-full rounded-2xl border border-bone/10 bg-black"
                  />
                )}
                {running && (
                  <div className="rounded-2xl border border-bone/10 bg-ash px-4 py-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-bone/85">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
                        className="flex"
                      >
                        <Loader size={14} />
                      </motion.span>
                      {waking ? "Starting the Kadr server…" : `${STAGES[stage]}…`}
                    </div>
                    {waking ? (
                      <p className="mt-2 text-xs text-bone/60">
                        The free server sleeps when idle — the first run can take up to a minute.
                      </p>
                    ) : (
                      <>
                        <div className="mt-3 flex gap-1.5">
                          {STAGES.map((_, i) => (
                            <span
                              key={i}
                              className={`h-1 flex-1 rounded-full ${i <= stage ? "bg-electric" : "bg-bone/15"}`}
                            />
                          ))}
                        </div>
                        <p className="mt-2 text-xs text-bone/60">
                          Scoring sharpness, composition, faces, and distinct moments.
                        </p>
                      </>
                    )}
                  </div>
                )}
                {error && (
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <span>{error}</span>
                    {file && !running && (
                      <button
                        onClick={() => analyze(file)}
                        className="flex shrink-0 items-center gap-1.5 rounded-full border border-red-300 bg-transparent px-3 py-1.5 text-xs font-medium text-red-700 transition hover:border-red-500 hover:text-red-900"
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
