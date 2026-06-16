import { useEffect, useState } from "react";
import "./LandingPage.css";

interface Props { onStart: () => void; }

/* Portrait hero videos from Cloudinary */
/* Desktop: 4 columns, each ~320px wide — cap at w_480 */
const HERO_VIDEOS = [
  "https://res.cloudinary.com/doj3vlkhr/video/upload/q_auto/f_auto/w_480/v1781584057/10637183-uhd_2160_4096_25fps_kqdpoq.mp4",
  "https://res.cloudinary.com/doj3vlkhr/video/upload/q_auto/f_auto/w_480/v1781584065/8323035-uhd_2160_4096_25fps_qnjj2i.mp4",
  "https://res.cloudinary.com/doj3vlkhr/video/upload/q_auto/f_auto/w_480/v1781584058/8503684-uhd_2160_3840_24fps_slhers.mp4",
  "https://res.cloudinary.com/doj3vlkhr/video/upload/q_auto/f_auto/w_480/v1781584042/7534415-uhd_2160_4096_25fps_laqmn9.mp4",
];

/* Tablet/mobile: single full-screen video — cap at w_720 */
const HERO_VIDEOS_MOBILE = [
  "https://res.cloudinary.com/doj3vlkhr/video/upload/q_auto/f_auto/w_720/v1781584057/10637183-uhd_2160_4096_25fps_kqdpoq.mp4",
  "https://res.cloudinary.com/doj3vlkhr/video/upload/q_auto/f_auto/w_720/v1781584065/8323035-uhd_2160_4096_25fps_qnjj2i.mp4",
  "https://res.cloudinary.com/doj3vlkhr/video/upload/q_auto/f_auto/w_720/v1781584058/8503684-uhd_2160_3840_24fps_slhers.mp4",
  "https://res.cloudinary.com/doj3vlkhr/video/upload/q_auto/f_auto/w_720/v1781584042/7534415-uhd_2160_4096_25fps_laqmn9.mp4",
];

const FEATURES = [
  { num: "01", title: "AI scene analysis",  desc: "Gemini 2.5 Flash reads every frame. Segments labeled with pacing notes and cut recommendations." },
  { num: "02", title: "Trim & export",       desc: "Select segments to remove. One click exports a clean MP4 — no timeline, no editor." },
  { num: "03", title: "Best frame picker",   desc: "AI surfaces the sharpest, most expressive shots from your entire video. Download as JPEG." },
  { num: "04", title: "Caption export",      desc: "Ready-to-use .srt subtitle file generated from AI captions. Drop it into any editor." },
  { num: "05", title: "Analysis presets",    desc: "Switch between Edit, Remove silence, and Extract highlights with one click." },
  { num: "06", title: "Saved configs",       desc: "Save your custom prompt. Rerun the exact same analysis on any video instantly." },
];

export default function LandingPage({ onStart }: Props) {
  const [introFaded, setIntroFaded] = useState(false);
  const [mobileVideoIdx, setMobileVideoIdx] = useState(0);

  /* Fade page in after mount */
  useEffect(() => {
    const t = setTimeout(() => setIntroFaded(true), 60);
    return () => clearTimeout(t);
  }, []);

  /* Scroll-reveal */
  useEffect(() => {
    const els = document.querySelectorAll(".va-reveal");
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("va-revealed"); }),
      { threshold: 0.08 }
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className={`va-landing ${introFaded ? "intro-ready" : ""}`}>

      {/* Skip nav — WCAG 2.1 SC 2.4.1 */}
      <a href="#va-main" className="va-skip">Skip to main content</a>

      {/* ── Nav ── */}
      <nav className="va-nav" aria-label="Main navigation">
        <span className="va-nav-logo" aria-label="Video Agent">Video Agent</span>
        <button className="va-nav-btn" onClick={onStart} aria-label="Get started — upload a video">
          Get started
        </button>
      </nav>

      <main id="va-main">

        {/* ── Hero ── */}
        <section className="va-hero" aria-labelledby="va-hero-heading">

          {/* Portrait video columns — decorative */}
          <div className="va-hero-bg" aria-hidden="true">
            {/* Desktop/tablet: all columns */}
            <div className="va-hero-cols">
              {HERO_VIDEOS.map((src, i) => (
                <video
                  key={src}
                  className="va-hero-col-video"
                  autoPlay
                  muted
                  playsInline
                  loop
                  preload="auto"
                  style={{ animationDelay: `${i * -4}s` }}
                >
                  <source src={src} type="video/mp4" />
                </video>
              ))}
            </div>
            {/* Mobile: single rotating video */}
            <video
              key={HERO_VIDEOS_MOBILE[mobileVideoIdx]}
              className="va-hero-mobile-video"
              autoPlay
              muted
              playsInline
              preload="auto"
              onEnded={() => setMobileVideoIdx(i => (i + 1) % HERO_VIDEOS_MOBILE.length)}
            >
              <source src={HERO_VIDEOS_MOBILE[mobileVideoIdx]} type="video/mp4" />
            </video>
            <div className="va-hero-veil" />
          </div>

          <h1 id="va-hero-heading" className="va-hero-name" aria-label="Video Agent">
            Video<br />Agent
          </h1>
          <div className="va-hero-sub">
            <p className="va-hero-desc">
              Upload any video. AI analyzes every frame, marks what to cut, generates captions — and exports the result in one click.
            </p>
            <div className="va-hero-actions">
              <button className="va-btn-primary" onClick={onStart}>
                Upload a video
              </button>
              <span className="va-hero-note" aria-label="Free to use, no account needed">
                Free · No account needed
              </span>
            </div>
          </div>
        </section>

        <div className="va-divider" role="separator" />

        {/* ── Features ── */}
        <section className="va-section va-reveal" id="features" aria-labelledby="va-feat-heading">
          <div className="va-section-label" aria-hidden="true">What it does</div>
          <h2 id="va-feat-heading" className="va-section-hed">Six tools.<br />One upload.</h2>
          <div className="va-feat-grid" role="list">
            {FEATURES.map(f => (
              <div className="va-feat va-reveal" key={f.num} role="listitem">
                <span className="va-feat-num" aria-hidden="true">{f.num}</span>
                <h3 className="va-feat-title">{f.title}</h3>
                <p className="va-feat-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="va-divider" role="separator" />

        {/* ── How it works ── */}
        <section className="va-section va-reveal" id="how-it-works" aria-labelledby="va-how-heading">
          <div className="va-section-label" aria-hidden="true">How it works</div>
          <h2 id="va-how-heading" className="va-section-hed">Three steps.<br />Under a minute.</h2>
          <ol className="va-steps" aria-label="Three steps to use Video Agent">
            <li className="va-step va-reveal">
              <span className="va-step-num" aria-hidden="true">01</span>
              <div className="va-step-body">
                <h3>Upload</h3>
                <p>Drop any video — MP4, MOV, AVI, WebM. Any length.</p>
                <span className="va-step-time">~5 sec</span>
              </div>
            </li>
            <li className="va-step va-reveal" style={{ transitionDelay: "80ms" }}>
              <span className="va-step-num" aria-hidden="true">02</span>
              <div className="va-step-body">
                <h3>Analyze</h3>
                <p>Gemini 2.5 Flash extracts frames with timestamps, identifies segments, pacing, silence, and highlights.</p>
                <span className="va-step-time">~30 sec</span>
              </div>
            </li>
            <li className="va-step va-reveal" style={{ transitionDelay: "160ms" }}>
              <span className="va-step-num" aria-hidden="true">03</span>
              <div className="va-step-body">
                <h3>Export</h3>
                <p>Trimmed MP4, .srt captions, or best frames as JPEGs — all from one panel.</p>
                <span className="va-step-time">~5 sec</span>
              </div>
            </li>
          </ol>
        </section>

        <div className="va-divider" role="separator" />

        {/* ── CTA ── */}
        <section className="va-cta va-reveal" aria-labelledby="va-cta-heading">
          <h2 id="va-cta-heading" className="va-cta-hed">Cut the noise.<br />Keep what matters.</h2>
          <button className="va-btn-primary large" onClick={onStart}>
            Upload a video →
          </button>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="va-footer">
        <span>Video Agent</span>
        <span>Powered by Gemini 2.5 Flash · © 2025</span>
      </footer>
    </div>
  );
}
