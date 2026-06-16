import type { Segment } from "./api";
import "./Timeline.css";

interface Props {
  segments: Segment[];
  duration: number;
  currentTime: number;
  onSeek: (seconds: number) => void;
}

export default function Timeline({ segments, duration, currentTime, onSeek }: Props) {
  const pct = (s: number) => `${(s / duration) * 100}%`;

  function handleTrackClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(ratio * duration, duration)));
  }

  function handleTrackKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") onSeek(Math.min(currentTime + 5, duration));
    if (e.key === "ArrowLeft") onSeek(Math.max(currentTime - 5, 0));
  }

  return (
    <div className="timeline" aria-label="Video timeline">
      <div
        className="timeline-track"
        role="slider"
        aria-label="Seek video position"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(currentTime)}
        aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
        tabIndex={0}
        onClick={handleTrackClick}
        onKeyDown={handleTrackKey}
      >
        {segments.map((seg, i) => (
          <div
            key={i}
            className={`timeline-segment ${seg.cut_recommended ? "cut" : ""}`}
            style={{ left: pct(seg.start), width: pct(seg.end - seg.start) }}
            role="button"
            tabIndex={0}
            aria-label={`Segment ${i + 1}: ${seg.caption}. ${formatTime(seg.start)} to ${formatTime(seg.end)}${seg.cut_recommended ? ". Cut recommended." : ""}`}
            onClick={(e) => { e.stopPropagation(); onSeek(seg.start); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSeek(seg.start); } }}
          />
        ))}

        {segments.filter(s => s.cut_recommended).map((seg, i) => (
          <div
            key={`cut-${i}`}
            className="cut-marker"
            aria-hidden="true"
            style={{ left: pct(seg.start) }}
            title={seg.cut_reason ?? "Cut recommended"}
          />
        ))}

        <div
          className="playhead"
          aria-hidden="true"
          style={{ left: pct(currentTime) }}
        />
      </div>

      <div className="timeline-labels" aria-hidden="true">
        <span>{formatTime(0)}</span>
        <span>{formatTime(duration / 2)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
