import { useState } from "react";
import { Image, Download, Loader, CheckCircle, X, ChevronLeft, ChevronRight } from "lucide-react";
import type { BestFrame } from "./api";
import { getBestFrames } from "./api";
import "./FramePicker.css";

interface Props {
  file: File;
  onSeek: (seconds: number) => void;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function baseFileName(file: File) {
  return file.name.replace(/\.[^/.]+$/, "").replace(/\s+/g, "_");
}

export default function FramePicker({ file, onSeek }: Props) {
  const [frames, setFrames] = useState<BestFrame[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [preview, setPreview] = useState<number | null>(null);

  async function handleExtract() {
    setLoading(true);
    setError(null);
    setDone(false);
    setFrames([]);
    setSelected(new Set());
    setPreview(null);
    try {
      const result = await getBestFrames(file, prompt.trim() || undefined);
      setFrames(result);
      setDone(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(i: number) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  function frameFileName(frame: BestFrame, index: number) {
    return `image_${index + 1}.jpg`;
  }

  function downloadFrame(frame: BestFrame, index: number) {
    const a = document.createElement("a");
    a.href = `data:image/jpeg;base64,${frame.image_b64}`;
    a.download = frameFileName(frame, index);
    a.click();
  }

  function downloadSelected() {
    frames.forEach((frame, i) => {
      if (selected.has(i)) {
        setTimeout(() => downloadFrame(frame, i), i * 200);
      }
    });
  }

  function openPreview(i: number) { setPreview(i); }
  function closePreview() { setPreview(null); }
  function prevPreview() { setPreview(p => p !== null ? Math.max(0, p - 1) : 0); }
  function nextPreview() { setPreview(p => p !== null ? Math.min(frames.length - 1, p + 1) : 0); }

  const previewFrame = preview !== null ? frames[preview] : null;

  return (
    <div className="frame-picker">
      <div className="fp-header">
        <h3><Image size={14} /> Best Frames</h3>
        <p className="fp-desc">
          AI picks the sharpest, most expressive frames from your video — perfect for thumbnails or profile photos.
        </p>
        <label className="fp-prompt-label" htmlFor="fp-prompt">
          What are you looking for? <span className="fp-prompt-hint">(optional)</span>
        </label>
        <textarea
          id="fp-prompt"
          className="fp-prompt"
          rows={2}
          placeholder="e.g. frames where the face is clearly visible, or the most visually striking moments"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          disabled={loading}
        />
        <button
          className="fp-extract-btn"
          onClick={handleExtract}
          disabled={loading}
        >
          {loading ? <><Loader size={14} className="fp-spin" /> Analyzing…</> : <><Image size={14} /> Extract best frames</>}
        </button>
      </div>

      {error && <p className="fp-error">{error}</p>}

      {done && frames.length > 0 && (
        <>
          <div className="fp-toolbar">
            <span className="fp-count">{frames.length} frames found</span>
            {selected.size > 0 && (
              <button className="fp-dl-btn" onClick={downloadSelected}>
                <Download size={13} /> Download {selected.size} selected
              </button>
            )}
          </div>

          <div className="fp-grid">
            {frames.map((frame, i) => (
              <div
                key={i}
                className={`fp-card ${selected.has(i) ? "selected" : ""}`}
              >
                <div
                  className="fp-img-wrap"
                  onClick={() => openPreview(i)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Preview frame at ${formatTime(frame.timestamp)}`}
                  onKeyDown={e => (e.key === "Enter" || e.key === " ") && openPreview(i)}
                >
                  <img
                    src={`data:image/jpeg;base64,${frame.image_b64}`}
                    alt={`Frame at ${formatTime(frame.timestamp)}`}
                    className="fp-img"
                    loading="lazy"
                  />
                  {selected.has(i) && (
                    <div className="fp-check" aria-hidden="true">
                      <CheckCircle size={20} />
                    </div>
                  )}
                  <div className="fp-img-overlay" aria-hidden="true">
                    <span className="fp-preview-hint">Click to preview</span>
                  </div>
                </div>
                <div className="fp-meta">
                  <div className="fp-meta-row">
                    <button
                      className="fp-ts"
                      onClick={() => onSeek(frame.timestamp)}
                      aria-label={`Seek to ${formatTime(frame.timestamp)}`}
                    >
                      {formatTime(frame.timestamp)}
                    </button>
                    <div className="fp-meta-actions">
                      <button
                        className={`fp-select-btn ${selected.has(i) ? "active" : ""}`}
                        onClick={() => toggleSelect(i)}
                        aria-label={selected.has(i) ? "Deselect frame" : "Select frame"}
                      >
                        {selected.has(i) ? "✓ Selected" : "Select"}
                      </button>
                      <button
                        className="fp-dl-single"
                        onClick={() => downloadFrame(frame, i)}
                        aria-label={`Download frame at ${formatTime(frame.timestamp)}`}
                      >
                        <Download size={12} />
                      </button>
                    </div>
                  </div>
                  <p className="fp-reason">{frame.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Lightbox preview */}
      {previewFrame && preview !== null && (
        <div
          className="fp-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Frame preview"
          onClick={closePreview}
        >
          <div className="fp-lightbox-inner" onClick={e => e.stopPropagation()}>
            <button className="fp-lb-close" onClick={closePreview} aria-label="Close preview">
              <X size={20} />
            </button>
            <img
              src={`data:image/jpeg;base64,${previewFrame.image_b64}`}
              alt={`Frame at ${formatTime(previewFrame.timestamp)}`}
              className="fp-lb-img"
            />
            <div className="fp-lb-footer">
              <button className="fp-lb-nav" onClick={prevPreview} disabled={preview === 0} aria-label="Previous frame">
                <ChevronLeft size={18} />
              </button>
              <div className="fp-lb-info">
                <span className="fp-lb-ts">{formatTime(previewFrame.timestamp)}</span>
                <span className="fp-lb-reason">{previewFrame.reason}</span>
              </div>
              <button className="fp-lb-nav" onClick={nextPreview} disabled={preview === frames.length - 1} aria-label="Next frame">
                <ChevronRight size={18} />
              </button>
              <button className="fp-lb-dl" onClick={() => downloadFrame(previewFrame, preview)}>
                <Download size={14} /> Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
