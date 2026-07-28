import { Sparkles, Download, Wand2, Check } from "lucide-react";
import type { BestFrame } from "../../api";
import { FRAME_EDITOR } from "../../features";

// Full-width inline analysis panel for the selected frame.
//
// Two clearly-separated kinds of information:
//  - "Why Kadr picked this" = Gemini's subjective interpretation (labeled AI).
//  - "Measured metrics" = deterministic values computed from the pixels
//    (pure Pillow on the backend). We never invent numbers; the metric section
//    only renders when the backend supplied real values.
function ts(t?: number) {
  if (t == null) return "—";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function exposureLabel(v: number) {
  return v < 60 ? "Dark" : v > 200 ? "Bright" : "Balanced";
}

function MetricBar({ label, value }: { label: string; value: number }) {
  const w = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-[11px] text-bone/45">{label}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-bone/[0.08]">
        <span className="block h-full rounded-full bg-electric" style={{ width: `${w}%` }} />
      </span>
      <span className="w-7 shrink-0 text-right text-[11px] tabular-nums text-bone/60">{value}</span>
    </div>
  );
}

export default function FrameAnalysis({
  frame,
  rank,
  total,
  onDownload,
  onEdit,
}: {
  frame: BestFrame | null;
  rank: number;
  total: number;
  onDownload: () => void;
  onEdit: () => void;
}) {
  if (!frame) {
    return (
      <div className="rounded-2xl border border-bone/10 bg-ash p-6 text-sm text-bone/45">
        Select a frame to see why Kadr chose it.
      </div>
    );
  }

  const metrics = frame.metrics;

  return (
    <div className="rounded-2xl border border-bone/10 bg-ash p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="text-xs uppercase tracking-[0.18em] text-bone/60">Frame analysis</span>
        <span className="rounded-full bg-electric px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white">
          #{rank}
        </span>
        <span className="text-sm text-bone/55">
          {rank === 1 ? "Kadr's top pick" : `Ranked #${rank}`} of {total}
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-[1.6fr_1fr]">
        {/* Why — Gemini's subjective read */}
        <div>
          <p className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-bone/45">
            <Sparkles size={12} /> Why Kadr picked this
            <span className="normal-case tracking-normal text-bone/30">· AI interpretation</span>
          </p>
          <p className="text-[15px] leading-relaxed text-bone/80">
            {frame.reason || "This frame ranked among the strongest moments in the clip."}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-bone/45">Scene</p>
              <p className="mt-0.5 text-bone/80">{frame.scene?.label || "—"}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-bone/45">Timestamp</p>
              <p className="mt-0.5 font-mono text-bone/80">{ts(frame.timestamp)}</p>
            </div>
          </div>
        </div>

        {/* Measured metrics — deterministic, computed from the pixels */}
        <div className="rounded-xl border border-bone/10 bg-bone/[0.02] p-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-bone/45">Measured metrics</p>
          {metrics ? (
            <>
              <p className="mt-0.5 text-[11px] text-bone/35">
                Computed from the pixels · sharpness is relative to this clip.
              </p>
              <div className="mt-3 space-y-2.5">
                <MetricBar label="Sharpness" value={metrics.sharpness} />
                <MetricBar label="Distinctness" value={metrics.uniqueness} />
                <div className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-[11px] text-bone/45">Exposure</span>
                  <span className="flex-1 text-[11px] text-bone/70">
                    {exposureLabel(metrics.exposure)}
                    <span className="text-bone/40"> · {metrics.exposure}/255</span>
                  </span>
                </div>
              </div>
              {frame.evidence && frame.evidence.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-bone/[0.08] pt-3 text-[11px] leading-relaxed text-bone/60">
                  {frame.evidence.map((e, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <Check size={12} className="mt-0.5 shrink-0 text-ember" /> {e}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="mt-2 text-[11px] text-bone/35">Not available for this result.</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-bone/10 pt-5">
        <button
          onClick={onDownload}
          className="flex items-center gap-2 rounded-full bg-ember px-4 py-2 text-sm font-semibold text-ink transition hover:bg-[#26262B]"
        >
          <Download size={14} /> Export frame
        </button>
        {FRAME_EDITOR && (
          <button
            onClick={onEdit}
            className="flex items-center gap-2 rounded-full border border-bone/15 bg-transparent px-4 py-2 text-sm text-bone/80 transition hover:border-bone/35 hover:text-bone"
          >
            <Wand2 size={14} /> Resize / Expand
          </button>
        )}
      </div>
    </div>
  );
}
