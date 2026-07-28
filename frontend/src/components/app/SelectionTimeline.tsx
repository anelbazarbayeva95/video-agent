import type { BestFrame } from "../../api";

// A selection timeline — NOT a heatmap. It marks where along the video the
// selected frames were picked from. (A heatmap would need a score/activity
// value across ALL sampled frames, which we don't surface.) Clicking a marker
// opens that frame.
//
// Requires a real video `duration`: without it we can't honestly place markers
// on a full-video axis. Falling back to the largest timestamp would put the
// last selected frame at ~100% of the bar, falsely implying it occurred at the
// end of the video — so when duration is unknown we hide the timeline entirely
// rather than imply coverage we can't back up.
function fmt(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function SelectionTimeline({
  frames,
  selected,
  onSelect,
}: {
  frames: BestFrame[];
  selected: number;
  onSelect: (i: number) => void;
}) {
  const stamps = frames.map((f) => f.timestamp).filter((t) => typeof t === "number");
  const duration = frames.find((f) => f.duration && f.duration > 0)?.duration ?? 0;
  // No real duration ⇒ hide (see header comment): don't imply full-video coverage.
  if (frames.length === 0 || stamps.length === 0 || duration <= 0) return null;

  const axisEnd = duration;

  return (
    <div className="mt-5 rounded-xl border border-bone/10 bg-bone/[0.02] px-4 py-3">
      <div className="mb-2 flex items-center justify-between text-[11px] text-bone/45">
        <span className="uppercase tracking-[0.14em]">Selected moments</span>
        <span className="font-mono tabular-nums">{frames.length} selected</span>
      </div>
      <div className="relative h-6">
        {/* track */}
        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-bone/15" />
        {frames.map((f, i) => {
          const pct = Math.max(0, Math.min(100, (f.timestamp / axisEnd) * 100));
          const title = `#${i + 1} · ${f.label || "Moment"} · ${fmt(f.timestamp)}`;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(i)}
              title={title}
              aria-label={`Open ${title}`}
              // Inline reset: this project disables Tailwind preflight, so the
              // native button border would otherwise show as a stray square.
              style={{ left: `${pct}%`, border: 0, background: "transparent", padding: 0 }}
              className="group absolute top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
            >
              {/* filled ember dot with an ink ring so it reads on the track;
                  the selected marker is larger with a brighter ring */}
              <span
                className={`block rounded-full transition duration-150 group-hover:scale-150 ${
                  i === selected
                    ? "h-4 w-4 bg-electric shadow-[0_0_0_3px_#FFFFFF,0_0_0_5px_#3D7BFF]"
                    : "h-3 w-3 bg-bone shadow-[0_0_0_3px_#FFFFFF]"
                }`}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] tabular-nums text-bone/35">
        <span>0:00</span>
        <span>{fmt(axisEnd)}</span>
      </div>
    </div>
  );
}
