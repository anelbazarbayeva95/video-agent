import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Upload, ScanEye, Download } from "lucide-react";
import { KadrWordmark } from "../Brand";
import "../app/assetpack.css";

interface Props {
  onStart: () => void;
}

const EASE = [0.22, 1, 0.36, 1] as const;

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
      className={`absolute left-2 top-2 rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
        n === 1 ? "bg-electric text-white" : "bg-black/65 text-white"
      }`}
    >
      #{n}
    </span>
  );
}

function Timecode({ t }: { t: string }) {
  return (
    <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-white/90">
      {t}
    </span>
  );
}

const card = "relative overflow-hidden rounded-xl border border-bone/10 shadow-xl";

/* Hero visual: a real source clip resolving into its ranked best frames. */
function HeroMotion() {
  return (
    <div className="relative mx-auto h-[420px] w-full max-w-[560px] sm:h-[460px]" aria-hidden="true">
      {/* source clip */}
      <Float delay={0.05} className="absolute left-[8%] top-0 z-20 w-[84%]">
        <div className={`${card} aspect-video`}>
          <img src="/screenshots/v02-06.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
          <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-electric" /> Source clip
          </span>
          <Timecode t="00:16" />
        </div>
      </Float>

      {/* ranked best frames — three visibly different moments */}
      <Float delay={0.28} className="absolute left-[1%] top-[54%] z-10 w-[31%]">
        <div className={`${card} aspect-square`}>
          <img src="/screenshots/v02-03.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: "center 30%" }} />
          <Rank n={1} /><Timecode t="00:09" />
        </div>
      </Float>
      <Float delay={0.38} className="absolute left-[35%] top-[60%] z-10 w-[31%]">
        <div className={`${card} aspect-square`}>
          <img src="/screenshots/v02-05.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: "30% center" }} />
          <Rank n={2} /><Timecode t="00:04" />
        </div>
      </Float>
      <Float delay={0.48} className="absolute left-[69%] top-[54%] z-10 w-[31%]">
        <div className={`${card} aspect-square`}>
          <img src="/screenshots/v02-01.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: "center 65%" }} />
          <Rank n={3} /><Timecode t="00:12" />
        </div>
      </Float>

      {/* one concise AI explanation for the top pick */}
      <Float delay={0.62} className="absolute bottom-[1%] left-1/2 z-30 w-[64%] -translate-x-1/2">
        <div className="rounded-xl border border-bone/10 bg-ink/95 px-3 py-2 shadow-xl backdrop-blur">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-electric">Why #1</p>
          <p className="mt-0.5 text-xs leading-snug text-bone/80">
            Face sharp and forward, balanced framing, soft window light.
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
      {/* Shared header container */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <KadrWordmark />
        <button
          onClick={onStart}
          className="rounded-full border-0 bg-ember px-5 py-2 text-sm font-semibold text-ink transition hover:bg-[#26262B]"
        >
          Get started
        </button>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 pb-16 pt-8 lg:grid-cols-2 lg:pt-14">
          <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.24em] text-bone/65">
              Best-frame intelligence
            </p>
            <h1 className="max-w-[16ch] text-5xl font-bold leading-[1.02] tracking-tight md:text-7xl" style={{ textWrap: "balance" }}>
              Find the one frame worth sharing<span className="text-electric">.</span>
            </h1>
            <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-bone/75 md:text-xl">
              Kadr watches every frame of your video, ranks the strongest moments,
              and shows you exactly why — so you keep the one shot worth posting.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <button
                onClick={onStart}
                className="flex items-center gap-2 rounded-full border-0 bg-ember px-7 py-3.5 text-sm font-semibold text-ink transition hover:bg-[#26262B]"
              >
                Upload a video <ArrowRight size={15} />
              </button>
              <span className="text-sm text-bone/60">Free · no account needed</span>
            </div>
          </motion.div>
          <HeroMotion />
        </section>

        <div className="mx-auto max-w-6xl border-t border-bone/10 px-6" role="separator" />

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-6 py-20" aria-labelledby="how-heading">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-bone/65">How it works</p>
          <h2 id="how-heading" className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
            Three steps. Under a minute.
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
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
                  <span className="font-mono text-xs text-bone/60">{s.time}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-bone/70">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <div className="mx-auto max-w-6xl border-t border-bone/10 px-6" role="separator" />

        {/* What it evaluates */}
        <section className="mx-auto max-w-6xl px-6 py-20" aria-labelledby="eval-heading">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-bone/65">What Kadr evaluates</p>
          <h2 id="eval-heading" className="mt-4 max-w-[22ch] text-4xl font-bold tracking-tight md:text-5xl">
            Every frame, ranked and explained.
          </h2>
          <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-bone/10 bg-bone/10 md:grid-cols-4">
            {EVALUATES.map((a) => (
              <div key={a.label} className="bg-ash p-6">
                <p className="text-lg font-semibold text-ember">{a.label}</p>
                <p className="mt-1 text-sm text-bone/65">{a.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA — compact, contained band */}
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="flex flex-col items-center gap-5 rounded-3xl border border-bone/10 bg-ash px-6 py-14 text-center">
            <h2 className="mx-auto max-w-[18ch] text-3xl font-bold tracking-tight md:text-4xl" style={{ textWrap: "balance" }}>
              Your best frame is already in the footage.
            </h2>
            <button
              onClick={onStart}
              className="inline-flex items-center gap-2 rounded-full border-0 bg-ember px-8 py-4 text-sm font-semibold text-ink transition hover:bg-[#26262B]"
            >
              Upload a video <ArrowRight size={15} />
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-bone/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-sm text-bone/60">
          <KadrWordmark size={16} />
          <span>Find your best frame · © 2026</span>
        </div>
      </footer>
    </div>
  );
}
