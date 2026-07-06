import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Upload, ScanEye, Package } from "lucide-react";
import { KadrWordmark } from "../Brand";
import "../app/assetpack.css";

interface Props {
  onStart: () => void;
}

const EASE = [0.22, 1, 0.36, 1] as const;

/* Sunset-film gradients — the amber lives in the "footage", not the chrome */
const G = {
  dusk: "linear-gradient(180deg,#3a2a44 0%,#7d3b39 46%,#d9873f 72%,#f4b25a 100%)",
  ember: "linear-gradient(160deg,#241b2e 0%,#8a4436 55%,#e09a4d 100%)",
  night: "linear-gradient(200deg,#1d2233 0%,#41304e 60%,#96543c 100%)",
  gold: "linear-gradient(150deg,#2c2030 10%,#a05a35 65%,#f0b264 100%)",
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

function Score({ v }: { v: number }) {
  return (
    <span className="absolute left-1.5 top-1.5 rounded-full bg-black/65 px-1.5 py-px text-[10px] font-bold tabular-nums text-white">
      {v}
    </span>
  );
}

function Timecode({ t }: { t: string }) {
  return (
    <span className="absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1.5 py-px font-mono text-[9px] tracking-wider text-bone/90">
      {t}
    </span>
  );
}

/* The hero visual: one video card becoming frames, stickers, thumbnail, story */
function HeroMotion() {
  const card = "relative overflow-hidden rounded-xl border border-bone/10 shadow-2xl";
  return (
    <div className="relative mx-auto h-[430px] w-full max-w-[560px] sm:h-[490px]" aria-hidden="true">
      {/* video card */}
      <Float delay={0.05} className="absolute left-[13%] top-0 z-20 w-[72%]">
        <div className={`${card} aspect-video`} style={{ background: G.dusk }}>
          <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-bone">
            <span className="h-1.5 w-1.5 rounded-full bg-ember" /> Source clip
          </span>
          <Timecode t="00:16" />
        </div>
      </Float>

      {/* best frames */}
      <Float delay={0.25} className="absolute left-0 top-[46%] z-10 w-[26%]">
        <div className={`${card} aspect-square`} style={{ background: G.ember }}>
          <Score v={94} /><Timecode t="00:04" />
        </div>
      </Float>
      <Float delay={0.34} className="absolute left-[29%] top-[52%] z-10 w-[26%]">
        <div className={`${card} aspect-square`} style={{ background: G.night }}>
          <Score v={91} /><Timecode t="00:09" />
        </div>
      </Float>
      <Float delay={0.43} className="absolute left-[58%] top-[47%] z-10 w-[26%]">
        <div className={`${card} aspect-square`} style={{ background: G.gold }}>
          <Score v={88} /><Timecode t="00:12" />
        </div>
      </Float>

      {/* sticker — die-cut on checkerboard */}
      <Float delay={0.55} className="absolute right-0 top-[8%] z-30 w-[22%]">
        <div className={`${card} sticker-checker aspect-square`}>
          <div
            className="absolute inset-[14%] rounded-[38%_62%_55%_45%/45%_40%_60%_55%] border-[3px] border-white"
            style={{ background: G.ember }}
          />
          <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-px text-[9px] font-semibold uppercase tracking-[0.12em] text-bone/90">
            Sticker
          </span>
        </div>
      </Float>

      {/* thumbnail 16:9 */}
      <Float delay={0.66} className="absolute bottom-[6%] left-[6%] z-20 w-[52%]">
        <div className={`${card} aspect-video`} style={{ background: G.gold }}>
          <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-px text-[9px] font-semibold uppercase tracking-[0.12em] text-bone/90">
            16:9 Thumbnail
          </span>
        </div>
      </Float>

      {/* story 9:16 */}
      <Float delay={0.77} className="absolute bottom-0 right-[4%] z-20 w-[24%]">
        <div className={`${card} aspect-[9/16]`} style={{ background: G.night }}>
          <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-px text-[9px] font-semibold uppercase tracking-[0.12em] text-bone/90">
            9:16 Story
          </span>
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
    desc: "Scenes detected, every frame scored for sharpness, faces, and composition.",
  },
  {
    icon: Package, title: "Export", time: "~5 sec",
    desc: "Best frames, stickers, a thumbnail, and a story — one ZIP, ready to post.",
  },
];

const ASSETS = [
  { n: "5", label: "Best frames", sub: "scored & scene-diverse" },
  { n: "3", label: "Stickers", sub: "transparent, die-cut" },
  { n: "1", label: "Thumbnail", sub: "16:9, subject-centered" },
  { n: "1", label: "Story", sub: "9:16, mobile-first" },
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
          className="rounded-full bg-ember px-5 py-2 text-sm font-semibold text-ink transition hover:bg-[#E39A55]"
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
              AI image toolkit
            </p>
            <h1 className="max-w-[14ch] text-5xl font-bold leading-[1.02] tracking-tight md:text-7xl" style={{ textWrap: "balance" }}>
              Every frame, an&nbsp;asset<span className="text-ember">.</span>
            </h1>
            <p className="mt-7 max-w-[46ch] text-lg leading-relaxed text-bone/70 md:text-xl">
              Upload one video. Kadr pulls its best frames and turns them into
              stickers, a thumbnail, and a story cut — a complete asset pack, ready to post.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-5">
              <button
                onClick={onStart}
                className="flex items-center gap-2 rounded-full bg-ember px-7 py-3.5 text-sm font-semibold text-ink transition hover:bg-[#E39A55]"
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

        {/* The pack */}
        <section className="mx-auto max-w-6xl px-6 py-24" aria-labelledby="pack-heading">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-bone/60">The asset pack</p>
          <h2 id="pack-heading" className="mt-4 max-w-[22ch] text-4xl font-bold tracking-tight md:text-5xl">
            One clip in. Ten assets out.
          </h2>
          <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-bone/10 bg-bone/10 md:grid-cols-4">
            {ASSETS.map((a) => (
              <div key={a.label} className="bg-ash p-6">
                <span className="font-mono text-4xl font-bold text-ember">{a.n}</span>
                <p className="mt-3 text-sm font-semibold">{a.label}</p>
                <p className="mt-1 text-xs text-bone/60">{a.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-6 pb-28 pt-8 text-center">
          <h2 className="mx-auto max-w-[18ch] text-4xl font-bold tracking-tight md:text-5xl" style={{ textWrap: "balance" }}>
            Your best frames are already in the footage.
          </h2>
          <button
            onClick={onStart}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-ember px-8 py-4 text-sm font-semibold text-ink transition hover:bg-[#E39A55]"
          >
            Try Kadr free <ArrowRight size={15} />
          </button>
        </section>
      </main>

      <footer className="border-t border-bone/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-xs text-bone/55">
          <KadrWordmark size={16} />
          <span>Every frame, an asset · © 2026</span>
        </div>
      </footer>
    </div>
  );
}
