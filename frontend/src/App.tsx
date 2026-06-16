import { useState, useRef, useCallback } from "react";
import { Upload, Play, Zap, RotateCcw, Volume2, Scissors, Image } from "lucide-react";
import { analyzeVideo } from "./api";
import type { Analysis, StreamEvent } from "./api";
import Timeline from "./Timeline";
import ResultsSidebar from "./ResultsSidebar";
import FramePicker from "./FramePicker";
import ConfigPanel from "./ConfigPanel";
import "./App.css";

const PROMPTS = {
  edit: "Analyze this video for editing opportunities, pacing issues, and suggest where to cut.",
  silence: "Detect all silent pauses, filler words, dead air, and slow sections in this video. Mark every segment where the pacing drops or there is silence longer than 1 second as cut_recommended.",
  highlights: "Identify the most engaging and high-energy moments in this video. Mark low-energy, repetitive, or off-topic segments as cut_recommended so the highlights can be extracted.",
};

type RightTab = "edit" | "frames";

export default function App({ onBack }: { onBack?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(PROMPTS.edit);
  const [activePreset, setActivePreset] = useState<keyof typeof PROMPTS>("edit");
  const [status, setStatus] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [rightTab, setRightTab] = useState<RightTab>("edit");
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
    setAnalysis(null);
    setError(null);
    setStatus(null);
    setRightTab("edit");
  }

  function reset() {
    setFile(null);
    setVideoUrl(null);
    setAnalysis(null);
    setError(null);
    setStatus(null);
    setCurrentTime(0);
    setRightTab("edit");
  }

  function selectPreset(key: keyof typeof PROMPTS) {
    setActivePreset(key);
    setPrompt(PROMPTS[key]);
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

  const showSidebar = !!file;

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <header className="header" role="banner">
        <button className="header-brand" onClick={onBack} aria-label="Go back to home">
          <Zap size={20} aria-hidden="true" />
          <span>Video Agent</span>
        </button>
        <p className="header-sub" aria-hidden="true">Multimodal video analysis powered by Gemini 2.5 Flash</p>
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
                onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
              />

              {loading && !analysis && (
                <div className="loading-state" role="status" aria-live="polite">
                  <div className="loading-bar" aria-hidden="true" />
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

              <div role="group" aria-label="Analysis mode" className="presets">
                {(["edit", "silence", "highlights"] as const).map((key) => (
                  <button
                    key={key}
                    className={`preset-btn ${activePreset === key ? "active" : ""}`}
                    onClick={() => selectPreset(key)}
                    aria-pressed={activePreset === key}
                  >
                    {key === "edit" && <Scissors size={12} aria-hidden="true" />}
                    {key === "silence" && <Volume2 size={12} aria-hidden="true" />}
                    {key === "highlights" && <Zap size={12} aria-hidden="true" />}
                    {key === "edit" ? "Edit suggestions" : key === "silence" ? "Remove silence" : "Extract highlights"}
                  </button>
                ))}
              </div>

              <div className="controls">
                <div className="controls-left">
                  <ConfigPanel currentPrompt={prompt} onLoad={setPrompt} />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <label className="prompt-label" htmlFor="analysis-prompt">Analysis prompt</label>
                  <textarea
                    id="analysis-prompt"
                    className="prompt-input"
                    value={prompt}
                    onChange={(e) => { setPrompt(e.target.value); setActivePreset("edit"); }}
                    rows={2}
                    placeholder="Describe what to analyze..."
                  />
                </div>
                <button
                  className="run-btn"
                  onClick={run}
                  disabled={loading}
                  aria-label={loading ? "Analyzing video, please wait" : "Run AI analysis"}
                >
                  <Play size={16} aria-hidden="true" />
                  {loading ? "Analyzing..." : "Run Agent"}
                </button>
              </div>

              {!loading && error && (
                <p className="error" role="alert">{error}</p>
              )}
            </div>
          )}
        </div>

        {showSidebar && file && (
          <aside className="sidebar" aria-label="Video tools">
            {/* Tab bar */}
            <div className="sidebar-tabs" role="tablist">
              <button
                role="tab"
                aria-selected={rightTab === "edit"}
                className={`sidebar-tab ${rightTab === "edit" ? "active" : ""}`}
                onClick={() => setRightTab("edit")}
              >
                <Scissors size={13} /> Edit
              </button>
              <button
                role="tab"
                aria-selected={rightTab === "frames"}
                className={`sidebar-tab ${rightTab === "frames" ? "active" : ""}`}
                onClick={() => setRightTab("frames")}
              >
                <Image size={13} /> Best Frames
              </button>
            </div>

            {rightTab === "edit" && analysis && (
              <ResultsSidebar analysis={analysis} file={file} onSeek={seekTo} />
            )}

            {rightTab === "edit" && !analysis && (
              <div className="sidebar-empty">
                <Scissors size={28} />
                <p>Run the agent to see edit suggestions and export options.</p>
              </div>
            )}

            {rightTab === "frames" && (
              <FramePicker file={file} onSeek={seekTo} />
            )}
          </aside>
        )}
      </main>
    </div>
  );
}
