import { useEffect, useState } from "react";
import "./LandingPage.css";

interface Props { onStart: () => void; }

const CARDS = [
  {
    phrase: "Find the cuts",
    sub: "AI marks every silence, filler, and slow section",
    visual: "waveform",
  },
  {
    phrase: "Pick best frames",
    sub: "Ranked by sharpness and expression",
    visual: "grid",
  },
  {
    phrase: "Write captions",
    sub: "SRT file ready to drop in any editor",
    visual: "lines",
  },
  {
    phrase: "Export in one click",
    sub: "Clean MP4, JPEGs, or subtitles — all at once",
    visual: "arrow",
  },
];

function CardVisual({ type }: { type: string }) {
  if (type === "waveform") return (
    <svg width="100%" height="80" viewBox="0 0 200 80" preserveAspectRatio="none" aria-hidden="true">
      {[8,16,32,12,48,28,56,20,40,14,52,24,36,18,44,10,38,26,50,22,42,16,34,30,46,12].map((h, i) => (
        <rect key={i} x={i * 8} y={(80 - h) / 2} width="5" height={h} rx="2"
          fill={i % 5 === 2 ? "#c4b5fd" : "rgba(255,255,255,0.18)"} />
      ))}
    </svg>
  );
  if (type === "grid") return (
    <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden="true">
      {Array.from({ length: 16 }, (_, i) => {
        const x = (i % 4) * 22;
        const y = Math.floor(i / 4) * 22;
        const active = i === 10;
        return <rect key={i} x={x} y={y} width="16" height="16" rx="3"
          fill={active ? "#c4b5fd" : "rgba(255,255,255,0.14)"} />;
      })}
    </svg>
  );
  if (type === "lines") return (
    <svg width="100%" height="80" viewBox="0 0 200 80" aria-hidden="true">
      {[160, 120, 180, 90, 150, 70, 140, 100].map((w, i) => (
        <rect key={i} x="0" y={i * 10 + 2} width={w} height="5" rx="2.5"
          fill={i === 2 ? "rgba(196,181,253,0.7)" : "rgba(255,255,255,0.15)"} />
      ))}
    </svg>
  );
  if (type === "arrow") return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5"/>
      <path d="M22 32h20M34 26l8 6-8 6" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M32 20v-4M32 48v4" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
  return null;
}

export default function LandingPage({ onStart }: Props) {
  const [introFaded, setIntroFaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setIntroFaded(true), 60);
    return () => clearTimeout(t);
  }, []);

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
      <a href="#va-main" className="va-skip">Skip to main content</a>

      {/* ── Nav ── */}
      <nav className="va-nav" aria-label="Main navigation">
        <span className="va-nav-logo" aria-label="Kadr">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="1" y="1" width="22" height="22" rx="3" stroke="#c4b5fd" strokeWidth="1.5"/>
            <rect x="5" y="5" width="5" height="5" fill="#c4b5fd" opacity=".3"/>
            <rect x="14" y="5" width="5" height="5" fill="#c4b5fd" opacity=".3"/>
            <rect x="5" y="14" width="5" height="5" fill="#c4b5fd" opacity=".3"/>
            <rect x="14" y="14" width="5" height="5" fill="#c4b5fd"/>
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
          <div className="va-hero-text">
            <p className="va-hero-eyebrow">AI video toolkit</p>
            <h1 id="va-hero-heading" className="va-hero-name">
              Your footage,<br />distilled.
            </h1>
            <p className="va-hero-desc">
              Upload any video. AI finds what to cut, picks your best frames, writes captions — and exports everything in one click.
            </p>
            <div className="va-hero-actions">
              <button className="va-btn-primary" onClick={onStart}>Try Kadr free</button>
              <span className="va-hero-note">Free · No account needed</span>
            </div>
          </div>
        </section>

        {/* ── Cards ── */}
        <section className="va-cards-section" aria-label="Features">
          <div className="va-cards">
            {CARDS.map((card) => (
              <div className="va-card" key={card.phrase}>
                <div className="va-card-visual" aria-hidden="true">
                  <CardVisual type={card.visual} />
                </div>
                <div className="va-card-body">
                  <h3 className="va-card-phrase">{card.phrase}</h3>
                  <p className="va-card-sub">{card.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="va-divider" role="separator" />

        {/* ── Features ── */}
        <section className="va-section va-reveal" id="features" aria-labelledby="va-feat-heading">
          <div className="va-section-label" aria-hidden="true">What it does</div>
          <h2 id="va-feat-heading" className="va-section-hed">Six tools.<br />One video.</h2>
          <div className="va-feat-grid" role="list">
            {[
              { num: "01", title: "AI scene analysis",  desc: "Gemini 2.5 Flash reads every frame. Segments labeled with pacing, silence, and cut recommendations." },
              { num: "02", title: "Trim & export",       desc: "Mark segments to remove. One click exports a clean MP4 — no timeline, no editor required." },
              { num: "03", title: "Best frame picker",   desc: "AI ranks every frame for sharpness and expression. Browse, select, and download as JPEG in seconds." },
              { num: "04", title: "Caption export",      desc: "Auto-generated .srt subtitle file, ready to drop into any editor or upload platform." },
              { num: "05", title: "Analysis presets",    desc: "Switch between Edit, Remove silence, and Extract highlights — one click changes the entire analysis focus." },
              { num: "06", title: "Saved configs",       desc: "Save your prompt and preset. Rerun the same analysis on any new video instantly." },
            ].map(f => (
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
          <h2 id="va-cta-heading" className="va-cta-hed">Ready to edit<br />smarter?</h2>
          <button className="va-btn-primary large" onClick={onStart}>Try Kadr free →</button>
        </section>

      </main>

      <footer className="va-footer">
        <span>Kadr</span>
        <span>Powered by Gemini 2.5 Flash · © 2025</span>
      </footer>
    </div>
  );
}
