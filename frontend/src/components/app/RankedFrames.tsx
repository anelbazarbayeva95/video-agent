import type { BestFrame } from "../../api";
import { frameSrc } from "../../api";
import AssetCard from "./AssetCard";

// The ranked Best Frames grid — the centerpiece of the results page. Clicking a
// card selects it (updates the inspector: video, timeline, analysis). Download
// exports that single frame.
function ts(t?: number) {
  if (t == null) return undefined;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function RankedFrames({
  frames,
  selected,
  loading,
  onSelect,
  onDownload,
}: {
  frames: BestFrame[];
  selected: number;
  loading: boolean;
  onSelect: (i: number) => void;
  onDownload: (i: number) => void;
}) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-3">
        <h3 className="text-xs uppercase tracking-[0.18em] text-bone/60">Best Frames</h3>
        {frames.length > 0 && <span className="text-[11px] text-bone/55">{frames.length} ranked</span>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {loading && frames.length === 0
          ? Array.from({ length: 4 }).map((_, i) => (
              <AssetCard key={i} label="Analyzing…" status="generating" />
            ))
          : frames.map((f, i) => {
              const url = frameSrc(f);
              return (
                <AssetCard
                  key={i}
                  label={f.label || "Moment"}
                  sublabel={ts(f.timestamp)}
                  rank={i + 1}
                  imageUrl={url}
                  status="ready"
                  selected={i === selected}
                  onOpen={() => onSelect(i)}
                  onDownload={() => onDownload(i)}
                />
              );
            })}
      </div>
    </section>
  );
}
