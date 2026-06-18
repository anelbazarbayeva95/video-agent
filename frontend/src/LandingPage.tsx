import { useEffect, useState } from "react";
import "./LandingPage.css";

interface Props { onStart: () => void; }

/* Portrait hero videos from Cloudinary */

const FEATURES = [
  { num: "01", title: "AI scene analysis",  desc: "Gemini 2.5 Flash reads every frame. Segments labeled with pacing, silence, and cut recommendations." },
  { num: "02", title: "Trim & export",       desc: "Mark segments to remove. One click exports a clean MP4 — no timeline, no editor required." },
  { num: "03", title: "Best frame picker",   desc: "AI ranks every frame for sharpness and expression. Browse, select, and download as JPEG in seconds." },
  { num: "04", title: "Caption export",      desc: "Auto-generated .srt subtitle file, ready to drop into any editor or upload platform." },
  { num: "05", title: "Analysis presets",    desc: "Switch between Edit, Remove silence, and Extract highlights — one click changes the entire analysis focus." },
  { num: "06", title: "Saved configs",       desc: "Save your prompt and preset. Rerun the same analysis on any new video instantly." },
];

export default function LandingPage({ onStart }: Props) {
  const [introFaded, setIntroFaded] = useState(false);

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

      {/* Global floating orbs — decorative, fixed to viewport */}
      <div className="va-orbs" aria-hidden="true">
        <div className="va-orb va-orb-1" />
        <div className="va-orb va-orb-2" />
        <div className="va-orb va-orb-3" />
        <div className="va-orb va-orb-4" />
      </div>

      {/* Skip nav — WCAG 2.1 SC 2.4.1 */}
      <a href="#va-main" className="va-skip">Skip to main content</a>

      {/* ── Nav ── */}
      <nav className="va-nav" aria-label="Main navigation">
        <span className="va-nav-logo" aria-label="Kadr">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="1" y="1" width="22" height="22" rx="3" stroke="#00c896" strokeWidth="1.5"/>
            <rect x="5" y="5" width="5" height="5" fill="#00c896" opacity=".3"/>
            <rect x="14" y="5" width="5" height="5" fill="#00c896" opacity=".3"/>
            <rect x="5" y="14" width="5" height="5" fill="#00c896" opacity=".3"/>
            <rect x="14" y="14" width="5" height="5" fill="#00c896"/>
          </svg>
          Kadr
        </span>
        <button className="va-nav-btn" onClick={onStart} aria-label="Get started — upload a video">
          Get started
        </button>
      </nav>

      <main id="va-main">

        {/* ── Hero ── */}
        <section className="va-hero" aria-labelledby="va-hero-heading">

          <h1 id="va-hero-heading" className="va-hero-name" aria-label="Kadr">
            Kadr
          </h1>
          <div className="va-hero-sub">
            <p className="va-hero-desc">
              Upload any video. AI finds what to cut, picks your best frames, writes captions — and exports everything in one click.
            </p>
            <div className="va-hero-actions">
              <button className="va-btn-primary" onClick={onStart}>
                Try Kadr free
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
          <h2 id="va-feat-heading" className="va-section-hed">Six tools.<br />One video.</h2>
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
          <ol className="va-steps" aria-label="Three steps to use Kadr">
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
          <h2 id="va-cta-heading" className="va-cta-hed">Your footage,<br />distilled.</h2>
          <button className="va-btn-primary large" onClick={onStart}>
            Try Kadr free →
          </button>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="va-footer">
        <span>Kadr</span>
        <span>Powered by Gemini 2.5 Flash · © 2025</span>
      </footer>
    </div>
  );
}
