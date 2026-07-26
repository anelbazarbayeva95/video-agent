import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, Download, Sparkles, Loader, RotateCcw, Move, Crop } from "lucide-react";
import { expandImage, expandMargins, reframe } from "../../api";
import type { Aspect } from "../../api";

export interface PreviewItem {
  url: string;
  label: string;
  sublabel?: string;
  score?: number | null;
  transparent?: boolean;
  downloadName: string;
}

// Expand (outpaint) — generative canvas growth. Set to false to hide the
// Expand controls (Resize stays available); all backend + drag code is intact.
const EXPAND_ENABLED = true;

const EXPAND_ASPECTS = ["16:9", "9:16"] as const;
// Resize (smart crop to an aspect, no generated pixels).
const RESIZE_ASPECTS: Aspect[] = ["16:9", "9:16", "1:1"];
const MAX_MARGIN = 1.5;

type Side = "left" | "right" | "top" | "bottom";
interface Margins { left: number; right: number; top: number; bottom: number; }
const ZERO: Margins = { left: 0, right: 0, top: 0, bottom: 0 };

function b64Of(dataUrl: string) {
  return dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
}
const clamp = (v: number) => Math.max(0, Math.min(MAX_MARGIN, v));

export default function AssetLightbox({
  item,
  onClose,
}: {
  item: PreviewItem;
  onClose: () => void;
}) {
  // Every expand (preset or drag) works from the ORIGINAL frame, never
  // compounding. Preset results are cached per ratio; the drag result is kept
  // separately. "Undo" returns to the original without discarding either.
  const [active, setActive] = useState<string | null>(null); // null | "16:9" | "9:16" | "custom"
  const [cache, setCache] = useState<Record<string, string>>({});
  const [customUrl, setCustomUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [margins, setMargins] = useState<Margins>(ZERO);
  const [expanding, setExpanding] = useState<string | null>(null);
  const [resizing, setResizing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = !!expanding || !!resizing;

  const imgRef = useRef<HTMLImageElement>(null);
  const [rendered, setRendered] = useState({ w: 0, h: 0 });

  const shown = editing
    ? item.url
    : active === "expand:custom"
    ? customUrl ?? item.url
    : active
    ? cache[active] ?? item.url
    : item.url;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (editing ? cancelEdit() : onClose());
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, editing]);

  function measure() {
    const el = imgRef.current;
    if (el) setRendered({ w: el.clientWidth, h: el.clientHeight });
  }
  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  function download() {
    const a = document.createElement("a");
    a.href = shown;
    let name = item.downloadName;
    if (active?.startsWith("expand:")) name = `expanded_${active.slice(7).replace(":", "x")}_${item.downloadName}`;
    else if (active?.startsWith("resize:")) name = `resized_${active.slice(7).replace(":", "x")}_${item.downloadName}`;
    a.download = name;
    a.click();
  }

  async function doExpand(aspect: string) {
    setEditing(false);
    const key = `expand:${aspect}`;
    if (cache[key]) { setActive(key); return; }
    setExpanding(aspect);
    setError(null);
    try {
      const b64 = await expandImage(b64Of(item.url), aspect); // from original
      setCache((c) => ({ ...c, [key]: `data:image/jpeg;base64,${b64}` }));
      setActive(key);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setExpanding(null);
    }
  }

  // Resize = smart crop to a target aspect (subject kept centered, no generated
  // pixels). Cached per aspect, keyed separately from Expand so the two don't
  // collide on shared ratios like 16:9.
  async function doResize(aspect: Aspect) {
    setEditing(false);
    const key = `resize:${aspect}`;
    if (cache[key]) { setActive(key); return; }
    setResizing(aspect);
    setError(null);
    try {
      const blob = await reframe(b64Of(item.url), aspect); // from original
      setCache((c) => ({ ...c, [key]: URL.createObjectURL(blob) }));
      setActive(key);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setResizing(null);
    }
  }

  function startEdit() {
    setActive(null);
    setMargins(ZERO);
    setEditing(true);
    requestAnimationFrame(measure);
  }
  function cancelEdit() {
    setEditing(false);
    setMargins(ZERO);
  }

  async function generateCustom() {
    if (margins.left + margins.right + margins.top + margins.bottom === 0) return;
    setExpanding("custom");
    setError(null);
    try {
      const b64 = await expandMargins(b64Of(item.url), margins); // from original
      setCustomUrl(`data:image/jpeg;base64,${b64}`);
      setActive("expand:custom");
      setEditing(false);
      setMargins(ZERO);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setExpanding(null);
    }
  }

  // Drag a single edge outward to grow that side's margin.
  function onHandleDown(side: Side) {
    return (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
      const startX = e.clientX;
      const startY = e.clientY;
      const start = margins[side];
      const w = rendered.w || 1;
      const h = rendered.h || 1;

      const move = (ev: PointerEvent) => {
        let next = start;
        if (side === "left") next = start + (startX - ev.clientX) / w;
        if (side === "right") next = start + (ev.clientX - startX) / w;
        if (side === "top") next = start + (startY - ev.clientY) / h;
        if (side === "bottom") next = start + (ev.clientY - startY) / h;
        setMargins((m) => ({ ...m, [side]: clamp(next) }));
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };
  }

  const anyMargin = margins.left + margins.right + margins.top + margins.bottom > 0;
  const pad = {
    left: margins.left * rendered.w,
    right: margins.right * rendered.w,
    top: margins.top * rendered.h,
    bottom: margins.bottom * rendered.h,
  };

  const handleCls =
    "absolute z-20 rounded-full border-2 border-ember bg-ink shadow-lg touch-none";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Preview: ${item.label}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[90vh] max-w-[92vw] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d]"
      >
        <button
          onClick={onClose}
          aria-label="Close preview"
          className="absolute right-3 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-lg bg-black/60 text-white transition hover:bg-black/80"
        >
          <X size={18} />
        </button>

        <div
          className={`relative flex min-h-0 flex-1 items-center justify-center p-6 ${
            item.transparent ? "sticker-checker" : "bg-black"
          }`}
        >
          {editing ? (
            // Drag-to-expand editor: the tinted, dashed zone is the new canvas.
            <div
              className="relative"
              style={{
                paddingLeft: pad.left,
                paddingRight: pad.right,
                paddingTop: pad.top,
                paddingBottom: pad.bottom,
              }}
            >
              {anyMargin && (
                <div className="pointer-events-none absolute inset-0 rounded-md border-2 border-dashed border-ember/70 bg-ember/10" />
              )}
              <img
                ref={imgRef}
                src={item.url}
                alt={item.label}
                onLoad={measure}
                draggable={false}
                className="block max-h-[52vh] max-w-[64vw] select-none object-contain"
              />
              {/* edge handles */}
              <div
                className={`${handleCls} h-9 w-4 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize`}
                style={{ left: pad.left, top: pad.top + rendered.h / 2 }}
                onPointerDown={onHandleDown("left")}
              />
              <div
                className={`${handleCls} h-9 w-4 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize`}
                style={{ left: pad.left + rendered.w, top: pad.top + rendered.h / 2 }}
                onPointerDown={onHandleDown("right")}
              />
              <div
                className={`${handleCls} h-4 w-9 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize`}
                style={{ left: pad.left + rendered.w / 2, top: pad.top }}
                onPointerDown={onHandleDown("top")}
              />
              <div
                className={`${handleCls} h-4 w-9 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize`}
                style={{ left: pad.left + rendered.w / 2, top: pad.top + rendered.h }}
                onPointerDown={onHandleDown("bottom")}
              />
            </div>
          ) : (
            <img src={shown} alt={item.label} className="max-h-[78vh] max-w-[92vw] object-contain" />
          )}

          {(expanding || resizing) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55 text-sm text-white">
              <Loader size={22} className="animate-spin" />
              {resizing
                ? `Resizing to ${resizing}…`
                : expanding === "custom"
                ? "Expanding…"
                : `Expanding to ${expanding}…`}
            </div>
          )}
          {editing && !expanding && (
            <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-[11px] text-white/80">
              Drag any edge outward, then Generate
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#0d0d0d] px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-white">{item.label}</span>
            {item.score != null && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] tabular-nums text-white/70">
                {item.score}
              </span>
            )}
            {item.sublabel && <span className="text-white/55">{item.sublabel}</span>}
          </div>

          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button
                  onClick={cancelEdit}
                  disabled={!!expanding}
                  className="rounded-full border border-white/25 bg-white/5 px-3 py-2 text-sm font-medium text-white/85 transition hover:border-white/45 disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  onClick={generateCustom}
                  disabled={!!expanding || !anyMargin}
                  className="flex items-center gap-2 rounded-full bg-ember px-4 py-2 text-sm font-semibold text-ink transition hover:bg-[#E39A55] disabled:opacity-40"
                >
                  <Sparkles size={14} /> Generate
                </button>
              </>
            ) : (
              <>
                {/* Expand + Resize — not for stickers (transparent cutouts) */}
                {!item.transparent && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Shared Undo — back to the original frame */}
                    <button
                      onClick={() => setActive(null)}
                      disabled={busy || active === null}
                      title="Undo — back to the original frame"
                      className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition disabled:opacity-40 ${
                        active === null
                          ? "border-ember bg-ember/15 text-ember"
                          : "border-white/25 bg-white/5 text-white/85 hover:border-white/45 hover:text-white"
                      }`}
                    >
                      <RotateCcw size={11} /> {active === null ? "Original" : "Undo"}
                    </button>

                    {EXPAND_ENABLED && (
                      <>
                        <span className="flex items-center gap-1 pl-1 text-[11px] uppercase tracking-[0.14em] text-white/45">
                          <Sparkles size={12} /> Expand
                        </span>
                        {EXPAND_ASPECTS.map((a) => (
                          <button
                            key={a}
                            onClick={() => doExpand(a)}
                            disabled={busy}
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition disabled:opacity-40 ${
                              active === `expand:${a}`
                                ? "border-ember bg-ember/15 text-ember"
                                : "border-white/15 bg-transparent text-white/80 hover:border-ember hover:text-white"
                            }`}
                          >
                            {a}
                          </button>
                        ))}
                        <button
                          onClick={startEdit}
                          disabled={busy}
                          title="Drag edges to expand freely"
                          className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition disabled:opacity-40 ${
                            active === "expand:custom"
                              ? "border-ember bg-ember/15 text-ember"
                              : "border-white/15 bg-transparent text-white/80 hover:border-ember hover:text-white"
                          }`}
                        >
                          <Move size={11} /> Custom
                        </button>
                      </>
                    )}

                    {/* Resize — smart crop to an aspect */}
                    <span className="flex items-center gap-1 pl-1 text-[11px] uppercase tracking-[0.14em] text-white/45">
                      <Crop size={12} /> Resize
                    </span>
                    {RESIZE_ASPECTS.map((a) => (
                      <button
                        key={a}
                        onClick={() => doResize(a)}
                        disabled={busy}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition disabled:opacity-40 ${
                          active === `resize:${a}`
                            ? "border-ember bg-ember/15 text-ember"
                            : "border-white/15 bg-transparent text-white/80 hover:border-ember hover:text-white"
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={download}
                  className="flex items-center gap-2 rounded-full bg-ember px-4 py-2 text-sm font-semibold text-ink transition hover:bg-[#E39A55]"
                >
                  <Download size={14} /> Download
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <p className="border-t border-white/10 bg-[#0d0d0d] px-4 py-2 text-xs text-red-300">{error}</p>
        )}
      </motion.div>
    </motion.div>
  );
}
