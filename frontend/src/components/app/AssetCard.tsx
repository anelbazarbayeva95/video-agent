import { motion, useReducedMotion } from "framer-motion";
import { Download, Maximize2 } from "lucide-react";

export type AssetStatus = "pending" | "generating" | "ready" | "error";

interface Props {
  label: string;
  sublabel?: string;
  imageUrl?: string;
  rank?: number | null;    // selection rank (1 = Kadr's top pick); omit for non-frames
  status: AssetStatus;
  transparent?: boolean;   // render on a checkerboard (stickers)
  aspect?: string;         // e.g. "16/9", "9/16"
  selected?: boolean;      // active frame in the inspector
  onDownload?: () => void;
  onOpen?: () => void;
}

const EASE = [0.22, 1, 0.36, 1] as const;

export default function AssetCard({
  label, sublabel, imageUrl, rank, status, transparent, aspect, selected, onDownload, onOpen,
}: Props) {
  const reduce = useReducedMotion();
  const openable = status === "ready" && !!imageUrl && !!onOpen;

  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 20, scale: reduce ? 1 : 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: EASE }}
      whileHover={reduce ? undefined : { y: -4, scale: 1.015 }}
      className={`group relative overflow-hidden rounded-2xl border bg-bone/[0.04] ${
        selected ? "border-electric/70 shadow-[0_0_0_2px_#3D7BFF]" : "border-bone/10 shadow-2xl"
      }`}
    >
      <button
        type="button"
        onClick={openable ? onOpen : undefined}
        aria-label={openable ? `Preview ${label}` : label}
        disabled={!openable}
        className={`relative block w-full overflow-hidden bg-transparent ${
          transparent ? "sticker-checker" : "bg-bone/[0.03]"
        } ${openable ? "cursor-zoom-in" : "cursor-default"}`}
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
          <div className="flex h-full items-center justify-center text-xs text-red-600">
            Failed
          </div>
        ) : (
          <div className={`h-full w-full ${status === "generating" ? "asset-shimmer" : "bg-bone/[0.05]"}`} />
        )}

        {rank != null && status === "ready" && (
          <span className={`pointer-events-none absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${rank === 1 ? "bg-electric text-white" : "bg-black/70 text-white"}`}>
            #{rank}
          </span>
        )}

        {openable && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/25">
            <span className="flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] text-white opacity-0 transition group-hover:opacity-100">
              <Maximize2 size={11} /> View
            </span>
          </span>
        )}
      </button>

      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="truncate text-xs font-medium text-bone/80">{label}</span>
        <div className="flex shrink-0 items-center gap-2">
          {sublabel && <span className="font-mono text-[11px] tabular-nums text-bone/60">{sublabel}</span>}
          {status === "ready" && imageUrl && onDownload && (
            <button
              onClick={onDownload}
              aria-label={`Download ${label}`}
              className="flex h-6 w-6 items-center justify-center rounded-md border border-bone/10 bg-transparent text-bone/70 transition hover:border-bone/25 hover:text-bone"
            >
              <Download size={12} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
