import { useState, useRef, useCallback } from "react";
import { Upload, RotateCcw } from "lucide-react";
import FramePicker from "./FramePicker";
import "./App.css";

export default function App({ onBack }: { onBack?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) selectFile(f);
  }, []);

  function selectFile(f: File) {
    setFile(f);
    setVideoUrl(URL.createObjectURL(f));
  }

  function reset() {
    setFile(null);
    setVideoUrl(null);
  }

  function seekTo(seconds: number) {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
    }
  }

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <header className="header" role="banner">
        <button className="header-brand" onClick={onBack} aria-label="Go back to home">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="1" y="1" width="22" height="22" rx="3" stroke="#c4b5fd" strokeWidth="1.5"/>
            <rect x="5" y="5" width="5" height="5" fill="#c4b5fd" opacity=".3"/>
            <rect x="14" y="5" width="5" height="5" fill="#c4b5fd" opacity=".3"/>
            <rect x="5" y="14" width="5" height="5" fill="#c4b5fd" opacity=".3"/>
            <rect x="14" y="14" width="5" height="5" fill="#c4b5fd"/>
          </svg>
          <span>Kadr</span>
        </button>
        <p className="header-sub" aria-hidden="true">AI frame picker · image export · stickers</p>
        {videoUrl && (
          <button className="reset-btn" onClick={reset} aria-label="Start over with a new video">
            <RotateCcw size={13} aria-hidden="true" /> New video
          </button>
        )}
      </header>

      <main id="main-content" className="main">
        <div className="left-panel">
          {!videoUrl ? (
            <button
              className="dropzone"
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload a video file. Supported formats: mp4, mov, avi, webm, mkv"
            >
              <Upload size={32} aria-hidden="true" />
              <p>Drop a video or click to upload</p>
              <span>mp4 · mov · avi · webm · mkv</span>
              <input
                ref={fileInputRef}
                id="file-input"
                type="file"
                accept="video/*"
                hidden
                aria-hidden="true"
                tabIndex={-1}
                onChange={(e) => e.target.files?.[0] && selectFile(e.target.files[0])}
              />
            </button>
          ) : (
            <div className="video-section">
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                className="video-player"
                aria-label={`Uploaded video: ${file?.name}`}
              />
              <p className="video-hint">
                Extract the best frames on the right, then download them as images or turn any frame into a sticker.
              </p>
            </div>
          )}
        </div>

        {file && (
          <aside className="sidebar" aria-label="Best frames and image tools">
            <FramePicker file={file} onSeek={seekTo} />
          </aside>
        )}
      </main>
    </div>
  );
}
