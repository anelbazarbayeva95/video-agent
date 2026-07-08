import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, Download, Sparkles, Loader, RotateCcw } from "lucide-react";
import { expandImage } from "../../api";

export interface PreviewItem {
  url: string;
  label: string;
  sublabel?: string;
  score?: number | null;
  transparent?: boolean;
  downloadName: string;
}

const EXPAND_ASPECTS = ["16:9", "9:16"] as const;

function b64Of(dataUrl: string) {
  return dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
}

export default function AssetLightbox({
  item,
  onClose,
}: {
  item: PreviewItem;
  onClose: () => void;
}) {
  // Each ratio expands from the ORIGINAL (never compounds), and results are
  // cached so switching between ratios is instant and non-destructive.
  const [active, setActive] = useState<string | null>(null); // null = original
  const [cache, setCache] = useState<Record<string, string>>({});
  const [expanding, setExpanding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shown = active ? cache[active] : item.url;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function download() {
    const a = document.createElement("a");
    a.href = shown;
    a.download = active ? `expanded_${active.replace(":", "x")}_${item.downloadName}` : item.downloadName;
    a.click();
  }

  async function doExpand(aspect: string) {
    if (cache[aspect]) { setActive(aspect); return; }  // already generated
    setExpanding(aspect);
    setError(null);
    try {
      const b64 = await expandImage(b64Of(item.url), aspect);  // always from original
      const url = `data:image/jpeg;base64,${b64}`;
      setCache((c) => ({ ...c, [aspect]: url }));
      setActive(aspect);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setExpanding(null);
    }
  }

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
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg bg-black/60 text-white transition hover:bg-black/80"
        >
          <X size={18} />
        </button>

        <div className={`relative flex min-h-0 flex-1 items-center justify-center ${item.transparent ? "sticker-checker" : "bg-black"}`}>
          <img src={shown} alt={item.label} className="max-h-[78vh] max-w-[92vw] object-contain" />
          {expanding && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55 text-sm text-white">
              <Loader size={22} className="animate-spin" />
              Expanding to {expanding}…
            </div>
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
            {/* Expand (outpaint) — not for transparent stickers */}
            {!item.transparent && (
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-1 text-[11px] uppercase tracking-[0.14em] text-white/45">
                  <Sparkles size={12} /> Expand
                </span>
                <button
                  onClick={() => setActive(null)}
                  disabled={!!expanding || active === null}
                  title="Undo — back to the original frame"
                  className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition disabled:opacity-40 ${
                    active === null
                      ? "border-ember bg-ember/15 text-ember"
                      : "border-white/25 bg-white/5 text-white/85 hover:border-white/45 hover:text-white"
                  }`}
                >
                  <RotateCcw size={11} /> {active === null ? "Original" : "Undo"}
                </button>
                {EXPAND_ASPECTS.map((a) => (
                  <button
                    key={a}
                    onClick={() => doExpand(a)}
                    disabled={!!expanding}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition disabled:opacity-40 ${
                      active === a
                        ? "border-ember bg-ember/15 text-ember"
                        : "border-white/15 bg-transparent text-white/80 hover:border-ember hover:text-white"
                    }`}
                  >
                    {a}{cache[a] ? "" : ""}
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
          </div>
        </div>

        {error && <p className="border-t border-white/10 bg-[#0d0d0d] px-4 py-2 text-xs text-red-300">{error}</p>}
      </motion.div>
    </motion.div>
  );
}
