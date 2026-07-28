import { Sparkles, Download, Wand2 } from "lucide-react";
import type { BestFrame } from "../../api";
import { FRAME_EDITOR } from "../../features";

// Full-width inline analysis panel for the selected frame. Section order is
// fixed so deterministic CV metrics (Slice 2) drop into the reserved "Measured
// metrics" slot without a redesign. We deliberately do NOT show invented
// numeric scores (sharpness/smile/etc.) or confidence percentages here — those
// require the measured-metrics work and would otherwise imply precision the
// pipeline can't back up.
function ts(t?: number) {
  if (t == null) return "—";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const PENDING_METRICS = ["Sharpness", "Blur", "Exposure", "Subject area", "Uniqueness"];

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
      <div className="rounded-2xl border border-white/10 bg-ash p-6 text-sm text-white/45">
        Select a frame to see why Kadr chose it.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-ash p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="text-xs uppercase tracking-[0.18em] text-white/60">Frame analysis</span>
        <span className="rounded-full bg-ember/90 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-ink">
          #{rank}
        </span>
        <span className="text-sm text-white/55">
          {rank === 1 ? "Kadr's top pick" : `Ranked #${rank}`} of {total}
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-[1.6fr_1fr]">
        {/* Why — the real, explainable payoff */}
        <div>
          <p className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-white/45">
            <Sparkles size={12} /> Why Kadr picked this
            <span className="normal-case tracking-normal text-white/30">· AI interpretation</span>
          </p>
          <p className="text-[15px] leading-relaxed text-white/80">
            {frame.reason || "This frame ranked among the strongest moments in the clip."}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Scene</p>
              <p className="mt-0.5 text-white/80">{frame.scene?.label || "—"}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Timestamp</p>
              <p className="mt-0.5 font-mono text-white/80">{ts(frame.timestamp)}</p>
            </div>
          </div>
        </div>

        {/* Measured metrics — reserved for Slice 2 (deterministic CV) */}
        <div className="rounded-xl border border-dashed border-white/12 bg-white/[0.02] p-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Measured metrics</p>
          <p className="mt-1 text-[11px] text-white/35">
            Deterministic scores, computed from the pixels — coming in the analysis upgrade.
          </p>
          <div className="mt-3 space-y-2">
            {PENDING_METRICS.map((m) => (
              <div key={m} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-[11px] text-white/45">{m}</span>
                <span className="h-1.5 flex-1 rounded-full bg-white/[0.06]" />
                <span className="text-[11px] text-white/25">—</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/10 pt-5">
        <button
          onClick={onDownload}
          className="flex items-center gap-2 rounded-full bg-ember px-4 py-2 text-sm font-semibold text-ink transition hover:bg-[#E39A55]"
        >
          <Download size={14} /> Export frame
        </button>
        {FRAME_EDITOR && (
          <button
            onClick={onEdit}
            className="flex items-center gap-2 rounded-full border border-white/15 bg-transparent px-4 py-2 text-sm text-white/80 transition hover:border-white/35 hover:text-white"
          >
            <Wand2 size={14} /> Resize / Expand
          </button>
        )}
      </div>
    </div>
  );
}
