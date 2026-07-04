import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import type { BestFrame, PackAsset } from "../../api";
import AssetCard from "./AssetCard";
import AssetLightbox, { type PreviewItem } from "./AssetLightbox";

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

export default function AssetPackGrid({ frames, assets, framesLoading }: Props) {
  const [preview, setPreview] = useState<PreviewItem | null>(null);
  const stickers = assets.filter((a) => a.kind === "sticker");
  const thumbnail = assets.find((a) => a.kind === "thumbnail");
  const story = assets.find((a) => a.kind === "story");

  return (
    <div className="space-y-10">
      {/* Best frames / moment map */}
      <Section title="Best Frames" count={frames.length ? `${frames.length}` : undefined}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {framesLoading && frames.length === 0
            ? Array.from({ length: 5 }).map((_, i) => (
                <AssetCard key={i} label="Analyzing…" status="generating" />
              ))
            : frames.map((f, i) => {
                const url = `data:image/jpeg;base64,${f.image_b64}`;
                const label = f.label || f.scene?.label || "Moment";
                return (
                  <AssetCard
                    key={i}
                    label={label}
                    sublabel={ts(f.timestamp)}
                    score={f.score}
                    imageUrl={url}
                    status="ready"
                    onOpen={() =>
                      setPreview({ url, label, sublabel: ts(f.timestamp), score: f.score, downloadName: `frame_${i + 1}.jpg` })
                    }
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

      {/* Formats: thumbnail + story, balanced side by side */}
      <Section title="Formats">
        <div className="flex flex-wrap items-start gap-6">
          <div className="w-full max-w-[440px]">
            <p className="mb-2 text-[11px] text-white/55">16:9 Thumbnail</p>
            {thumbnail ? (
              <AssetCard
                label="16:9 Thumbnail"
                imageUrl={`data:${thumbnail.mime};base64,${thumbnail.image_b64}`}
                status="ready"
                aspect="16 / 9"
                onOpen={() =>
                  setPreview({ url: `data:${thumbnail.mime};base64,${thumbnail.image_b64}`, label: "16:9 Thumbnail", downloadName: "thumbnail_16x9.jpg" })
                }
                onDownload={() => download(`data:${thumbnail.mime};base64,${thumbnail.image_b64}`, "thumbnail_16x9.jpg")}
              />
            ) : (
              <AssetCard label="16:9 Thumbnail" status="generating" aspect="16 / 9" />
            )}
          </div>

          <div className="w-[168px]">
            <p className="mb-2 text-[11px] text-white/55">9:16 Story</p>
            {story ? (
              <AssetCard
                label="9:16 Story"
                imageUrl={`data:${story.mime};base64,${story.image_b64}`}
                status="ready"
                aspect="9 / 16"
                onOpen={() =>
                  setPreview({ url: `data:${story.mime};base64,${story.image_b64}`, label: "9:16 Story", downloadName: "story_9x16.jpg" })
                }
                onDownload={() => download(`data:${story.mime};base64,${story.image_b64}`, "story_9x16.jpg")}
              />
            ) : (
              <AssetCard label="9:16 Story" status="generating" aspect="9 / 16" />
            )}
          </div>
        </div>
      </Section>

      <AnimatePresence>
        {preview && <AssetLightbox item={preview} onClose={() => setPreview(null)} />}
      </AnimatePresence>
    </div>
  );
}
