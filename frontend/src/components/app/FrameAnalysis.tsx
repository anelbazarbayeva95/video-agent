import { Sparkles, Download, Wand2 } from "lucide-react";
import type { BestFrame } from "../../api";
import { FRAME_EDITOR } from "../../features";

// Inline analysis panel for the currently-selected frame. Section order is
// fixed so deterministic CV metrics (Slice 2) drop into the reserved
// "Measured metrics" slot without a redesign.
function ts(t?: number) {
  if (t == null) return "—";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
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
      <div className="rounded-2xl border border-white/10 bg-ash p-5 text-sm text-white/45">
        Select a frame to see why Kadr chose it.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-ash p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.18em] text-white/60">Frame analysis</span>
        <span className="rounded-full bg-ember/90 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-ink">
          #{rank}
        </span>
      </div>

      {/* Recommendation */}
      <p className="text-sm text-white/85">
        {rank === 1 ? "Kadr's top pick" : `Ranked #${rank}`}
        <span className="text-white/45"> of {total}</span>
      </p>

      {/* Why Kadr picked this — AI interpretation */}
      {frame.reason && (
        <div className="mt-4">
          <p className="mb-1 flex flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-white/45">
            <Sparkles size={12} /> Why Kadr picked this
            <span className="normal-case tracking-normal text-white/30">· AI interpretation</span>
          </p>
          <p className="text-sm leading-snug text-white/75">{frame.reason}</p>
        </div>
      )}

      {/* Scene + timestamp */}
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Scene</p>
          <p className="truncate text-white/80">{frame.scene?.label || "—"}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Timestamp</p>
          <p className="font-mono text-white/80">{ts(frame.timestamp)}</p>
        </div>
      </div>

      {/* Measured metrics — reserved for Slice 2 (deterministic CV) */}
      <div className="mt-4 rounded-lg border border-dashed border-white/12 px-3 py-2 text-[11px] leading-relaxed text-white/35">
        Measured metrics — sharpness, blur, exposure, uniqueness — coming soon.
      </div>

      {/* Export */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
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
