import { motion, useReducedMotion } from "framer-motion";
import { Download } from "lucide-react";

export type AssetStatus = "pending" | "generating" | "ready" | "error";

interface Props {
  label: string;
  sublabel?: string;
  imageUrl?: string;
  score?: number | null;
  status: AssetStatus;
  transparent?: boolean;   // render on a checkerboard (stickers)
  aspect?: string;         // e.g. "16/9", "9/16"
  onDownload?: () => void;
}

const EASE = [0.22, 1, 0.36, 1] as const;

export default function AssetCard({
  label, sublabel, imageUrl, score, status, transparent, aspect, onDownload,
}: Props) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 20, scale: reduce ? 1 : 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: EASE }}
      whileHover={reduce ? undefined : { y: -4, scale: 1.015 }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-2xl"
    >
      <div
        className={`relative w-full overflow-hidden ${transparent ? "sticker-checker" : "bg-white/[0.03]"}`}
        style={{ aspectRatio: aspect ?? "1 / 1" }}
      >
        {status === "ready" && imageUrl ? (
          <img
            src={imageUrl}
            alt={label}
            loading="lazy"
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : status === "error" ? (
          <div className="flex h-full items-center justify-center text-xs text-red-300/80">
            Failed
          </div>
        ) : (
          <div className={`h-full w-full ${status === "generating" ? "asset-shimmer" : "bg-white/[0.05]"}`} />
        )}

        {score != null && status === "ready" && (
          <span className="absolute right-2 top-2 rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white">
            {score}
          </span>
        )}

        {status === "ready" && imageUrl && onDownload && (
          <button
            onClick={onDownload}
            aria-label={`Download ${label}`}
            className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/80"
          >
            <Download size={14} />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="truncate text-xs font-medium text-white/80">{label}</span>
        {sublabel && (
          <span className="shrink-0 text-[11px] tabular-nums text-white/40">{sublabel}</span>
        )}
      </div>
    </motion.div>
  );
}
