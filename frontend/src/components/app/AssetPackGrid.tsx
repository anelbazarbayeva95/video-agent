import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import type { BestFrame, PackAsset } from "../../api";
import { selectionTier } from "../../api";
import AssetCard from "./AssetCard";
import AssetLightbox, { type PreviewItem } from "./AssetLightbox";
import SelectionTimeline from "./SelectionTimeline";

interface Props {
  frames: BestFrame[];
  assets: PackAsset[];
  framesLoading: boolean;
}

function ts(t?: number) {
  if (t == null) return undefined;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function download(dataUrl: string, name: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = name;
  a.click();
}

function Section({
  title, count, children,
}: { title: string; count?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-3">
        <h3 className="text-xs uppercase tracking-[0.18em] text-white/60">{title}</h3>
        {count && <span className="text-[11px] text-white/55">{count}</span>}
      </div>
      {children}
    </section>
  );
}

// Build the lightbox item for a best frame. Keeps the moment label and the
// broader scene label as separate fields (they describe different levels of
// interpretation), and carries the AI `reason` + score-derived tier. All
// downstream display fields are optional, so older frames without scene/reason
// still open cleanly.
function framePreview(f: BestFrame, i: number): PreviewItem {
  return {
    url: `data:image/jpeg;base64,${f.image_b64}`,
    label: f.label || "Moment",       // moment label: why this frame is useful
    sceneLabel: f.scene?.label,        // broader scene description
    sublabel: ts(f.timestamp),
    score: f.score,                    // used only to derive the coarse tier
    reason: f.reason,                  // Gemini interpretation
    downloadName: `frame_${i + 1}.jpg`,
  };
}

export default function AssetPackGrid({ frames, assets, framesLoading }: Props) {
  const [preview, setPreview] = useState<PreviewItem | null>(null);
  const stickers = assets.filter((a) => a.kind === "sticker");
  const thumbnails = assets.filter((a) => a.kind === "thumbnail");
  const stories = assets.filter((a) => a.kind === "story");

  return (
    <div className="space-y-10">
      {/* Best frames / moment map */}
      <Section title="Best Frames" count={frames.length ? `${frames.length}` : undefined}>
        {frames.length > 0 && (
          <SelectionTimeline frames={frames} onSelect={(i) => setPreview(framePreview(frames[i], i))} />
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {framesLoading && frames.length === 0
            ? Array.from({ length: 5 }).map((_, i) => (
                <AssetCard key={i} label="Analyzing…" status="generating" />
              ))
            : frames.map((f, i) => {
                const url = `data:image/jpeg;base64,${f.image_b64}`;
                return (
                  <AssetCard
                    key={i}
                    label={f.label || "Moment"}
                    sublabel={ts(f.timestamp)}
                    tier={selectionTier(f.score) ?? undefined}
                    imageUrl={url}
                    status="ready"
                    onOpen={() => setPreview(framePreview(f, i))}
                    onDownload={() => download(url, `frame_${i + 1}.jpg`)}
                  />
                );
              })}
        </div>
      </Section>

      {/* Stickers */}
      <Section title="Stickers" count={stickers.length ? `${stickers.length}` : undefined}>
        <div className="grid max-w-lg grid-cols-3 gap-3">
          {stickers.length === 0
            ? Array.from({ length: 3 }).map((_, i) => (
                <AssetCard key={i} label="Sticker" status="generating" transparent />
              ))
            : stickers.map((s, i) => {
                const url = `data:${s.mime};base64,${s.image_b64}`;
                return (
                  <AssetCard
                    key={i}
                    label="Sticker"
                    sublabel={ts(s.timestamp)}
                    imageUrl={url}
                    status="ready"
                    transparent
                    onOpen={() =>
                      setPreview({ url, label: "Sticker", sublabel: ts(s.timestamp), transparent: true, downloadName: `sticker_${i + 1}.png` })
                    }
                    onDownload={() => download(url, `sticker_${i + 1}.png`)}
                  />
                );
              })}
        </div>
      </Section>

      {/* Formats: thumbnails + stories, balanced side by side */}
      <Section title="Formats">
        <div className="flex flex-wrap items-start gap-6">
          <div className="flex min-w-0 flex-1 basis-[440px] flex-col gap-3">
            <p className="text-[11px] text-white/55">16:9 Thumbnail</p>
            {thumbnails.length === 0 ? (
              <div className="max-w-[440px]">
                <AssetCard label="16:9 Thumbnail" status="generating" aspect="16 / 9" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {thumbnails.map((t, i) => {
                  const url = `data:${t.mime};base64,${t.image_b64}`;
                  const name = `thumbnail_16x9_${i + 1}.jpg`;
                  return (
                    <AssetCard
                      key={i}
                      label={`16:9 Thumbnail${thumbnails.length > 1 ? ` ${i + 1}` : ""}`}
                      sublabel={ts(t.timestamp)}
                      imageUrl={url}
                      status="ready"
                      aspect="16 / 9"
                      onOpen={() => setPreview({ url, label: "16:9 Thumbnail", sublabel: ts(t.timestamp), downloadName: name })}
                      onDownload={() => download(url, name)}
                    />
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-[11px] text-white/55">9:16 Story</p>
            <div className="flex flex-wrap gap-3">
              {stories.length === 0 ? (
                <div className="w-[168px]">
                  <AssetCard label="9:16 Story" status="generating" aspect="9 / 16" />
                </div>
              ) : (
                stories.map((s, i) => {
                  const url = `data:${s.mime};base64,${s.image_b64}`;
                  const name = `story_9x16_${i + 1}.jpg`;
                  return (
                    <div key={i} className="w-[168px]">
                      <AssetCard
                        label={`9:16 Story${stories.length > 1 ? ` ${i + 1}` : ""}`}
                        sublabel={ts(s.timestamp)}
                        imageUrl={url}
                        status="ready"
                        aspect="9 / 16"
                        onOpen={() => setPreview({ url, label: "9:16 Story", sublabel: ts(s.timestamp), downloadName: name })}
                        onDownload={() => download(url, name)}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </Section>

      <AnimatePresence>
        {preview && <AssetLightbox item={preview} onClose={() => setPreview(null)} />}
      </AnimatePresence>
    </div>
  );
}
