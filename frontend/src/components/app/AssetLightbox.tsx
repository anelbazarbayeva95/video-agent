import { useEffect } from "react";
import { motion } from "framer-motion";
import { X, Download } from "lucide-react";

export interface PreviewItem {
  url: string;
  label: string;
  sublabel?: string;
  score?: number | null;
  transparent?: boolean;
  downloadName: string;
}

export default function AssetLightbox({
  item,
  onClose,
}: {
  item: PreviewItem;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function download() {
    const a = document.createElement("a");
    a.href = item.url;
    a.download = item.downloadName;
    a.click();
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

        <div className={`flex min-h-0 flex-1 items-center justify-center ${item.transparent ? "sticker-checker" : "bg-black"}`}>
          <img
            src={item.url}
            alt={item.label}
            className="max-h-[78vh] max-w-[92vw] object-contain"
          />
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-white/10 bg-[#0d0d0d] px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-white">{item.label}</span>
            {item.score != null && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] tabular-nums text-white/70">
                {item.score}
              </span>
            )}
            {item.sublabel && <span className="text-white/55">{item.sublabel}</span>}
          </div>
          <button
            onClick={download}
            className="flex items-center gap-2 rounded-full bg-ember px-4 py-2 text-sm font-semibold text-ink transition hover:bg-[#E39A55]"
          >
            <Download size={14} /> Download
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
