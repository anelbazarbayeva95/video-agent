import { Segment } from "./api";
import "./Timeline.css";

interface Props {
  segments: Segment[];
  duration: number;
  currentTime: number;
  onSeek: (seconds: number) => void;
}

export default function Timeline({ segments, duration, currentTime, onSeek }: Props) {
  const pct = (s: number) => `${(s / duration) * 100}%`;

  return (
    <div className="timeline">
      <div className="timeline-track" onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        onSeek(ratio * duration);
      }}>
        {segments.map((seg, i) => (
          <div
            key={i}
            className={`timeline-segment ${seg.cut_recommended ? "cut" : ""}`}
            style={{ left: pct(seg.start), width: pct(seg.end - seg.start) }}
            title={seg.caption}
            onClick={(e) => { e.stopPropagation(); onSeek(seg.start); }}
          />
        ))}

        {segments.filter(s => s.cut_recommended).map((seg, i) => (
          <div
            key={`cut-${i}`}
            className="cut-marker"
            style={{ left: pct(seg.start) }}
            title={seg.cut_reason ?? "Cut recommended"}
          />
        ))}

        <div
          className="playhead"
          style={{ left: pct(currentTime) }}
        />
      </div>

      <div className="timeline-labels">
        <span>0:00</span>
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
