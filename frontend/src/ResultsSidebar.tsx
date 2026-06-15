import { Scissors, Clock, FileText, ChevronRight } from "lucide-react";
import { Analysis } from "./api";
import "./ResultsSidebar.css";

interface Props {
  analysis: Analysis;
  onSeek: (seconds: number) => void;
}

export default function ResultsSidebar({ analysis, onSeek }: Props) {
  return (
    <div className="sidebar">
      <div className="sidebar-summary">
        <p className="summary-text">{analysis.summary}</p>
        <div className="summary-meta">
          <span className={`pacing-badge pacing-${analysis.overall_pacing}`}>
            {analysis.overall_pacing} pacing
          </span>
          <span className="duration-badge">
            <Clock size={12} /> {formatTime(analysis.duration_estimate)}
          </span>
        </div>
      </div>

      <div className="sidebar-section">
        <h3><FileText size={14} /> Segments</h3>
        <div className="segments-list">
          {analysis.segments.map((seg, i) => (
            <button key={i} className="segment-card" onClick={() => onSeek(seg.start)}>
              <div className="segment-header">
                <span className="segment-time">{formatTime(seg.start)} – {formatTime(seg.end)}</span>
                {seg.cut_recommended && (
                  <span className="cut-badge"><Scissors size={11} /> cut</span>
                )}
                <ChevronRight size={14} className="segment-arrow" />
              </div>
              <p className="segment-caption">{seg.caption}</p>
              {seg.pacing_note && <p className="segment-note">{seg.pacing_note}</p>}
              {seg.cut_reason && <p className="segment-cut-reason">{seg.cut_reason}</p>}
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-section">
        <h3>Overall Notes</h3>
        <p className="overall-notes">{analysis.overall_notes}</p>
      </div>
    </div>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
