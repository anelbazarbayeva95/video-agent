import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Upload, ScanEye, Download } from "lucide-react";
import { KadrWordmark } from "../Brand";
import "../app/assetpack.css";

interface Props {
  onStart: () => void;
}

const EASE = [0.22, 1, 0.36, 1] as const;

/* Cool cinematic gradients — steel, indigo, night. No orange. */
const G = {
  dusk: "linear-gradient(180deg,#12131a 0%,#1c2440 46%,#2f4a7a 78%,#4d74b8 100%)",
  ember: "linear-gradient(160deg,#101018 0%,#232a44 55%,#3d5a8c 100%)",
  night: "linear-gradient(200deg,#0d0f18 0%,#191f33 60%,#2c3f66 100%)",
  gold: "linear-gradient(150deg,#141420 10%,#2b2c46 65%,#525a86 100%)",
};

function Float({
  children, delay = 0, className, style,
}: {
  children?: React.ReactNode; delay?: number; className?: string; style?: React.CSSProperties;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y: reduce ? 0 : 24, scale: reduce ? 1 : 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      <motion.div
        animate={reduce ? undefined : { y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 5.5, ease: "easeInOut", delay: delay + 1 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function Rank({ n }: { n: number }) {
  return (
    <span
      className={`absolute left-1.5 top-1.5 rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums ${
        n === 1 ? "bg-electric text-white" : "bg-black/65 text-white"
      }`}
    >
      #{n}
    </span>
  );
}

function Timecode({ t }: { t: string }) {
  return (
    <span className="absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1.5 py-px font-mono text-[9px] tracking-wider text-white/90">
      {t}
    </span>
  );
}

/* The hero visual: one clip resolving into its ranked best frames */
function HeroMotion() {
  const card = "relative overflow-hidden rounded-xl border border-bone/10 shadow-2xl";
  return (
    <div className="relative mx-auto h-[420px] w-full max-w-[560px] sm:h-[470px]" aria-hidden="true">
      {/* video card */}
      <Float delay={0.05} className="absolute left-[10%] top-0 z-20 w-[80%]">
        <div className={`${card} aspect-video`} style={{ background: G.dusk }}>
          <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-ember" /> Source clip
          </span>
          <Timecode t="00:16" />
        </div>
      </Float>

      {/* ranked best frames */}
      <Float delay={0.28} className="absolute left-[2%] top-[52%] z-10 w-[30%]">
        <div className={`${card} aspect-square`} style={{ background: G.ember }}>
          <Rank n={1} /><Timecode t="00:09" />
        </div>
      </Float>
      <Float delay={0.38} className="absolute left-[35%] top-[58%] z-10 w-[30%]">
        <div className={`${card} aspect-square`} style={{ background: G.night }}>
          <Rank n={2} /><Timecode t="00:04" />
        </div>
      </Float>
      <Float delay={0.48} className="absolute left-[68%] top-[52%] z-10 w-[30%]">
        <div className={`${card} aspect-square`} style={{ background: G.gold }}>
          <Rank n={3} /><Timecode t="00:12" />
        </div>
      </Float>

      {/* analysis chip */}
      <Float delay={0.6} className="absolute bottom-[2%] left-1/2 z-30 w-[62%] -translate-x-1/2">
        <div className="rounded-xl border border-bone/10 bg-ash/95 px-3 py-2 shadow-2xl backdrop-blur">
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-electric">Why #1</p>
          <p className="mt-0.5 text-[11px] leading-snug text-bone/80">
            Sharp skyline, level horizon, clean separation.
          </p>
        </div>
      </Float>
    </div>
  );
}

const STEPS = [
  {
    icon: Upload, title: "Upload", time: "~5 sec",
    desc: "Drop any clip — MP4, MOV, WebM. Phone footage welcome.",
  },
  {
    icon: ScanEye, title: "Analyze", time: "~30 sec",
    desc: "Scenes detected, every frame scored, and the strongest moments ranked.",
  },
  {
    icon: Download, title: "Export", time: "~5 sec",
    desc: "See why each frame was picked, then export the exact shots you want.",
  },
];

const EVALUATES = [
  { label: "Sharpness", sub: "focus & motion blur" },
  { label: "Composition", sub: "framing & balance" },
  { label: "Faces", sub: "visibility & expression" },
  { label: "Moment", sub: "scene-diverse picks" },
];

export default function NoirLanding({ onStart }: Props) {
  const reduce = useReducedMotion();
  return (
    <div className="kadr-app min-h-screen bg-ink text-bone">
      {/* Nav */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <KadrWordmark />
        <button
          onClick={onStart}
          className="rounded-full bg-ember px-5 py-2 text-sm font-semibold text-ink transition hover:bg-[#26262B]"
        >
          Get started
        </button>
      </nav>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-6 pb-24 pt-12 lg:grid-cols-2 lg:pt-20">
          <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-bone/60">
              Best-frame intelligence
            </p>
            <h1 className="max-w-[16ch] text-5xl font-bold leading-[1.02] tracking-tight md:text-7xl" style={{ textWrap: "balance" }}>
              Find the one frame worth sharing<span className="text-electric">.</span>
            </h1>
            <p className="mt-7 max-w-[46ch] text-lg leading-relaxed text-bone/70 md:text-xl">
              Kadr watches every frame of your video, ranks the strongest moments,
              and shows you exactly why — so you keep the one shot worth posting.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-5">
              <button
                onClick={onStart}
                className="flex items-center gap-2 rounded-full bg-ember px-7 py-3.5 text-sm font-semibold text-ink transition hover:bg-[#26262B]"
              >
                Upload a video <ArrowRight size={15} />
              </button>
              <span className="text-sm text-bone/55">Free · no account needed</span>
            </div>
          </motion.div>
          <HeroMotion />
        </section>

        <div className="mx-auto max-w-6xl border-t border-bone/10 px-6" role="separator" />

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-6 py-24" aria-labelledby="how-heading">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-bone/60">How it works</p>
          <h2 id="how-heading" className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
            Three steps. Under a minute.
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: reduce ? 0 : 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, ease: EASE, delay: i * 0.08 }}
                className="rounded-2xl border border-bone/10 bg-ash p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-bone/10 bg-ink text-ember">
                    <s.icon size={18} />
                  </span>
                  <span className="font-mono text-xs text-bone/55">{s.time}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-bone/65">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <div className="mx-auto max-w-6xl border-t border-bone/10 px-6" role="separator" />

        {/* What it evaluates */}
        <section className="mx-auto max-w-6xl px-6 py-24" aria-labelledby="eval-heading">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-bone/60">What Kadr evaluates</p>
          <h2 id="eval-heading" className="mt-4 max-w-[22ch] text-4xl font-bold tracking-tight md:text-5xl">
            Every frame, ranked and explained.
          </h2>
          <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-bone/10 bg-bone/10 md:grid-cols-4">
            {EVALUATES.map((a) => (
              <div key={a.label} className="bg-ash p-6">
                <p className="text-lg font-semibold text-ember">{a.label}</p>
                <p className="mt-1 text-xs text-bone/60">{a.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-6 pb-28 pt-8 text-center">
          <h2 className="mx-auto max-w-[18ch] text-4xl font-bold tracking-tight md:text-5xl" style={{ textWrap: "balance" }}>
            Your best frame is already in the footage.
          </h2>
          <button
            onClick={onStart}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-ember px-8 py-4 text-sm font-semibold text-ink transition hover:bg-[#26262B]"
          >
            Try Kadr free <ArrowRight size={15} />
          </button>
        </section>
      </main>

      <footer className="border-t border-bone/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-xs text-bone/55">
          <KadrWordmark size={16} />
          <span>Find your best frame · © 2026</span>
        </div>
      </footer>
    </div>
  );
}
