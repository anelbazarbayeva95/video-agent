import { useEffect, useState } from "react";
import "./LandingPage.css";

interface Props { onStart: () => void; }

const VIDEOS = ["v01", "v02", "v03", "v04"];
const SHOTS_PER_VIDEO = 6;

const CARDS = [
  { phrase: "Find the cuts",       sub: "AI marks every silence, filler, and slow section", visual: "waveform" },
  { phrase: "Pick best frames",    sub: "Ranked by sharpness and expression",                visual: "grid"     },
  { phrase: "Write captions",      sub: "SRT file ready to drop in any editor",              visual: "lines"    },
  { phrase: "Export in one click", sub: "Clean MP4, JPEGs, or subtitles — all at once",     visual: "arrow"    },
];

const WAVE_HEIGHTS = [8,16,32,12,48,28,56,20,40,14,52,24,36,18,44,10,38,26,50,22,42,16,34,30,46,12];

function CardVisual({ type }: { type: string }) {
  if (type === "waveform") return (
    <svg width="100%" height="80" viewBox="0 0 208 80" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {WAVE_HEIGHTS.map((h, i) => (
        <rect key={i} x={i * 8} y={(80 - h) / 2} width="5" height={h} rx="2"
          fill={i % 5 === 2 ? "#c4b5fd" : "rgba(255,255,255,0.2)"}
          className="va-wbar" style={{ animationDelay: `${i * 0.06}s` }} />
      ))}
    </svg>
  );
  if (type === "grid") return (
    <svg width="82" height="82" viewBox="0 0 82 82" aria-hidden="true">
      {Array.from({ length: 16 }, (_, i) => {
        const active = i === 10;
        return <rect key={i} x={(i % 4) * 22} y={Math.floor(i / 4) * 22} width="16" height="16" rx="3"
          fill={active ? "#c4b5fd" : "rgba(255,255,255,0.18)"}
          className={active ? "va-grid-active" : "va-grid-dot"}
          style={{ animationDelay: `${i * 0.04}s` }} />;
      })}
    </svg>
  );
  if (type === "lines") return (
    <svg width="100%" height="84" viewBox="0 0 200 84" aria-hidden="true">
      {[160,120,180,90,150,70,140,100].map((w, i) => (
        <rect key={i} x="0" y={i * 11 + 2} width={w} height="5" rx="2.5"
          fill={i === 2 ? "rgba(196,181,253,0.8)" : "rgba(255,255,255,0.18)"}
          className="va-line-bar" style={{ animationDelay: `${i * 0.1}s` }} />
      ))}
    </svg>
  );
  if (type === "arrow") return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
      <circle cx="36" cy="36" r="30" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" className="va-arrow-ring"/>
      <circle cx="36" cy="36" r="22" stroke="rgba(196,181,253,0.25)" strokeWidth="1" className="va-arrow-ring2"/>
      <path d="M24 36h24M40 30l8 6-8 6" stroke="#c4b5fd" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="va-arrow-path"/>
    </svg>
  );
  return null;
}

/* Stacked screenshot carousel */
function ScreenshotStack() {
  const [videoIdx, setVideoIdx] = useState(0);
  const [shotIdx, setShotIdx] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      const next = shotIdx + 1;
      if (next < SHOTS_PER_VIDEO) setShotIdx(next);
      else { setVideoIdx(v => (v + 1) % VIDEOS.length); setShotIdx(0); }
    }, 1800);
    return () => clearTimeout(t);
  }, [shotIdx, videoIdx]);

  const video = VIDEOS[videoIdx];

  // static deck slots behind active for depth (fixed, never move)
  const prevA = shotIdx > 0 ? shotIdx - 1 : -1;
  const prevB = shotIdx > 1 ? shotIdx - 2 : -1;

  return (
    <div className="va-stack" aria-label="Product screenshots">
      {/* static depth cards — don't animate */}
      {prevB >= 0 && (
        <img src={`/screenshots/${video}-0${prevB + 1}.jpg`} alt="" aria-hidden="true"
          className="va-stack-img va-stack-depth"
          style={{ zIndex: 1, transform: "translate(20px, 14px) scale(0.93) rotate(-1.8deg)", opacity: 0.45 }} />
      )}
      {prevA >= 0 && (
        <img src={`/screenshots/${video}-0${prevA + 1}.jpg`} alt="" aria-hidden="true"
          className="va-stack-img va-stack-depth"
          style={{ zIndex: 2, transform: "translate(10px, 7px) scale(0.97) rotate(-0.9deg)", opacity: 0.65 }} />
      )}
      {/* active image — crossfades */}
      <img
        key={`${video}-${shotIdx}`}
        src={`/screenshots/${video}-0${shotIdx + 1}.jpg`}
        alt="Kadr app screenshot"
        className="va-stack-img va-stack-active"
        style={{ zIndex: 10 }}
      />
    </div>
  );
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

      {/* Floating orbs */}
      <div className="va-orbs" aria-hidden="true">
        <div className="va-orb va-orb-1" />
        <div className="va-orb va-orb-2" />
        <div className="va-orb va-orb-3" />
      </div>

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
        <button className="va-nav-btn" onClick={onStart}>Get started</button>
      </nav>

      <main id="va-main">

        {/* ── Hero: split layout ── */}
        <section className="va-hero" aria-labelledby="va-hero-heading">
          <div className="va-hero-text">
            <p className="va-hero-eyebrow">AI video toolkit</p>
            <h1 id="va-hero-heading" className="va-hero-name">
              Upload once.<br />Export everything.
            </h1>
            <p className="va-hero-desc">
              Upload any video. AI finds what to cut, picks your best frames, writes captions — and exports everything in one click.
            </p>
            <div className="va-hero-actions">
              <button className="va-btn-primary" onClick={onStart}>Try Kadr free</button>
              <span className="va-hero-note">Free · No account needed</span>
            </div>
          </div>
          <div className="va-hero-visual">
            <ScreenshotStack />
          </div>
        </section>

        {/* ── Feature cards ── */}
        <section className="va-cards-section" aria-label="Features">
          <div className="va-cards">
            {CARDS.map((card, i) => (
              <div className="va-card va-reveal" key={card.phrase} style={{ transitionDelay: `${i * 0.08}s` }}>
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

        <section className="va-cta va-reveal" aria-labelledby="va-cta-heading">
          <h2 id="va-cta-heading" className="va-cta-hed">Ready to edit<br />smarter?</h2>
          <button className="va-btn-primary" onClick={onStart}>Try Kadr free →</button>
        </section>

      </main>

      <footer className="va-footer">
        <span>Kadr</span>
        <span>Powered by Gemini 2.5 Flash · © 2025</span>
      </footer>
    </div>
  );
}
