import { useEffect, useRef, useState } from "react";
import { X, Download, Loader, Wand2 } from "lucide-react";
import { makeSticker, STICKER_STYLES } from "./api";
import type { StickerStyle } from "./api";
import "./StickerModal.css";

interface Props {
  imageB64: string;
  onClose: () => void;
}

export default function StickerModal({ imageB64, onClose }: Props) {
  const [style, setStyle] = useState<StickerStyle>("cutout");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const resultUrlRef = useRef<string | null>(null);

  useEffect(() => {
    resultUrlRef.current = resultUrl;
  }, [resultUrl]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    };
  }, [onClose]);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const blob = await makeSticker(imageB64, style);
      setResultUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function triggerDownload(url: string, name: string, revoke = false) {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    if (revoke) setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function download(fmt: "png" | "webp") {
    if (!resultUrl) return;
    if (fmt === "png") {
      triggerDownload(resultUrl, "sticker.png");
      return;
    }
    // convert PNG -> WebP client-side, keeping transparency
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      canvas.toBlob(b => {
        if (b) triggerDownload(URL.createObjectURL(b), "sticker.webp", true);
      }, "image/webp");
    };
    img.src = resultUrl;
  }

  return (
    <div className="sm-overlay" role="dialog" aria-modal="true" aria-label="Sticker generator" onClick={onClose}>
      <div className="sm-inner" onClick={e => e.stopPropagation()}>
        <div className="sm-header">
          <h3>Make a sticker</h3>
          <button className="sm-close" onClick={onClose} aria-label="Close sticker generator">
            <X size={18} />
          </button>
        </div>

        <div className={`sm-preview ${resultUrl ? "sm-checker" : ""}`}>
          <img
            src={resultUrl ?? `data:image/jpeg;base64,${imageB64}`}
            alt={resultUrl ? "Generated sticker" : "Source frame"}
            className="sm-img"
          />
          {loading && (
            <div className="sm-loading" role="status" aria-live="polite">
              <Loader size={22} className="sm-spin" />
              <span>Generating sticker…</span>
            </div>
          )}
        </div>

        <div className="sm-styles" role="group" aria-label="Sticker style">
          {STICKER_STYLES.map(s => (
            <button
              key={s.id}
              className={`sm-style ${style === s.id ? "active" : ""}`}
              onClick={() => setStyle(s.id)}
              aria-pressed={style === s.id}
              disabled={loading}
            >
              {s.label}
            </button>
          ))}
        </div>

        {error && <p className="sm-error" role="alert">{error}</p>}

        <div className="sm-footer">
          <button className="sm-generate" onClick={generate} disabled={loading}>
            <Wand2 size={14} />
            {loading ? "Generating…" : resultUrl ? "Regenerate" : "Generate sticker"}
          </button>
          {resultUrl && !loading && (
            <>
              <button className="sm-dl" onClick={() => download("png")}>
                <Download size={13} /> PNG
              </button>
              <button className="sm-dl" onClick={() => download("webp")}>
                <Download size={13} /> WebP
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
