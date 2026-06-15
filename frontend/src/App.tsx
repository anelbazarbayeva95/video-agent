import { useState, useRef, useCallback } from "react";
import { Upload, Play, Zap, RotateCcw } from "lucide-react";
import { analyzeVideo, Analysis, StreamEvent } from "./api";
import Timeline from "./Timeline";
import ResultsSidebar from "./ResultsSidebar";
import ConfigPanel from "./ConfigPanel";
import "./App.css";

const DEFAULT_PROMPT = "Analyze this video for editing opportunities, pacing issues, and suggest where to cut.";

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [status, setStatus] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) selectFile(f);
  }, []);

  function selectFile(f: File) {
    setFile(f);
    setVideoUrl(URL.createObjectURL(f));
    setAnalysis(null);
    setError(null);
    setStatus(null);
  }

  function reset() {
    setFile(null);
    setVideoUrl(null);
    setAnalysis(null);
    setError(null);
    setStatus(null);
    setCurrentTime(0);
  }

  async function run() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setStatus("Starting...");

    try {
      await analyzeVideo(file, prompt, (event: StreamEvent) => {
        if (event.type === "status") setStatus(event.message);
        else if (event.type === "result") { setAnalysis(event.data); setStatus(null); }
        else if (event.type === "error") setError(event.message);
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function seekTo(seconds: number) {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-brand">
          <Zap size={20} />
          <span>Video Agent</span>
        </div>
        <p className="header-sub">Multimodal video analysis powered by Gemini 2.0 Flash</p>
        {videoUrl && (
          <button className="reset-btn" onClick={reset}>
            <RotateCcw size={13} /> New video
          </button>
        )}
      </header>

      <main className="main">
        <div className="left-panel">
          {!videoUrl ? (
            <div
              className="dropzone"
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <Upload size={32} />
              <p>Drop a video or click to upload</p>
              <span>mp4, mov, avi, webm, mkv</span>
              <input
                id="file-input"
                type="file"
                accept="video/*"
                hidden
                onChange={(e) => e.target.files?.[0] && selectFile(e.target.files[0])}
              />
            </div>
          ) : (
            <div className="video-section">
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                className="video-player"
                onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
              />

              {loading && !analysis && (
                <div className="loading-state">
                  <div className="loading-bar" />
                  <p className="status">{status}</p>
                </div>
              )}

              {analysis && (
                <Timeline
                  segments={analysis.segments}
                  duration={analysis.duration_estimate}
                  currentTime={currentTime}
                  onSeek={seekTo}
                />
              )}

              <div className="controls">
                <div className="controls-left">
                  <ConfigPanel currentPrompt={prompt} onLoad={setPrompt} />
                </div>
                <textarea
                  className="prompt-input"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={2}
                  placeholder="Analysis prompt..."
                />
                <button className="run-btn" onClick={run} disabled={loading}>
                  <Play size={16} />
                  {loading ? "Analyzing..." : "Run Agent"}
                </button>
              </div>

              {!loading && error && <p className="error">{error}</p>}
            </div>
          )}
        </div>

        {analysis && (
          <ResultsSidebar analysis={analysis} onSeek={seekTo} />
        )}
      </main>
    </div>
  );
}
