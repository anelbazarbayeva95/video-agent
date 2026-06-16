import { useState } from "react";
import { Scissors, Clock, FileText, ChevronRight, Download, FileDown } from "lucide-react";
import type { Analysis } from "./api";
import { trimVideo, exportSRT } from "./api";
import "./ResultsSidebar.css";

interface Props {
  analysis: Analysis;
  file: File;
  onSeek: (seconds: number) => void;
}

export default function ResultsSidebar({ analysis, file, onSeek }: Props) {
  const [removed, setRemoved] = useState<Set<number>>(() => {
    const auto = new Set<number>();
    analysis.segments.forEach((s, i) => { if (s.cut_recommended) auto.add(i); });
    return auto;
  });
  const [trimming, setTrimming] = useState(false);
  const [trimError, setTrimError] = useState<string | null>(null);

  function toggleRemove(i: number) {
    setRemoved(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  async function handleTrim() {
    const segs = analysis.segments
      .filter((_, i) => removed.has(i))
      .map(s => ({ start: s.start, end: s.end }));
    if (segs.length === 0) return;
    setTrimming(true);
    setTrimError(null);
    try {
      const blob = await trimVideo(file, segs);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "video_1.mp4";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setTrimError(e.message);
    } finally {
      setTrimming(false);
    }
  }

  function handleSRT() {
    const srt = exportSRT(analysis.segments);
    const blob = new Blob([srt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "captions.srt";
    a.click();
    URL.revokeObjectURL(url);
  }

  const removedCount = removed.size;

  return (
    <>
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
        <p className="segments-hint">Check segments to remove, then export trimmed video.</p>
        <div className="segments-list">
          {analysis.segments.map((seg, i) => (
            <div
              key={i}
              className={`segment-card ${removed.has(i) ? "marked-remove" : ""}`}
              onClick={() => onSeek(seg.start)}
            >
              <div className="segment-header">
                <input
                  type="checkbox"
                  className="segment-checkbox"
                  checked={removed.has(i)}
                  onChange={() => toggleRemove(i)}
                  onClick={e => e.stopPropagation()}
                  title="Mark for removal"
                />
                <span className="segment-time">{formatTime(seg.start)} – {formatTime(seg.end)}</span>
                {seg.cut_recommended && (
                  <span className="cut-badge"><Scissors size={11} /> cut</span>
                )}
                <ChevronRight size={14} className="segment-arrow" />
              </div>
              <p className="segment-caption">{seg.caption}</p>
              {seg.pacing_note && <p className="segment-note">{seg.pacing_note}</p>}
              {seg.cut_reason && <p className="segment-cut-reason">{seg.cut_reason}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar-actions">
        <button
          className="action-btn primary"
          onClick={handleTrim}
          disabled={trimming || removedCount === 0}
        >
          <Download size={14} />
          {trimming ? "Processing..." : `Export trimmed${removedCount > 0 ? ` (−${removedCount})` : ""}`}
        </button>
        <button className="action-btn secondary" onClick={handleSRT}>
          <FileDown size={14} /> Export SRT
        </button>
        {trimError && <p className="trim-error">{trimError}</p>}
      </div>

      <div className="sidebar-section">
        <h3>Overall Notes</h3>
        <p className="overall-notes">{analysis.overall_notes}</p>
      </div>
    </>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
