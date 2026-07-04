import type { BestFrame, PackAsset } from "../../api";
import AssetCard from "./AssetCard";

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

function Section({ title, count, children }: { title: string; count?: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 first:mt-0">
      <div className="mb-3 flex items-baseline gap-3">
        <h3 className="text-xs uppercase tracking-[0.18em] text-white/60">{title}</h3>
        {count && <span className="text-[11px] text-white/55">{count}</span>}
      </div>
      {children}
    </section>
  );
}

export default function AssetPackGrid({ frames, assets, framesLoading }: Props) {
  const stickers = assets.filter((a) => a.kind === "sticker");
  const thumbnail = assets.find((a) => a.kind === "thumbnail");
  const story = assets.find((a) => a.kind === "story");

  return (
    <div>
      {/* Best frames / moment map */}
      <Section title="Best Frames" count={frames.length ? `${frames.length}` : undefined}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {framesLoading && frames.length === 0
            ? Array.from({ length: 5 }).map((_, i) => (
                <AssetCard key={i} label="Analyzing…" status="generating" />
              ))
            : frames.map((f, i) => {
                const url = `data:image/jpeg;base64,${f.image_b64}`;
                return (
                  <AssetCard
                    key={i}
                    label={f.label || f.scene?.label || "Moment"}
                    sublabel={ts(f.timestamp)}
                    score={f.score}
                    imageUrl={url}
                    status="ready"
                    onDownload={() => download(url, `frame_${i + 1}.jpg`)}
                  />
                );
              })}
        </div>
      </Section>

      {/* Stickers */}
      <Section title="Stickers" count={stickers.length ? `${stickers.length}` : undefined}>
        <div className="grid grid-cols-3 gap-3 sm:max-w-md">
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
                    onDownload={() => download(url, `sticker_${i + 1}.png`)}
                  />
                );
              })}
        </div>
      </Section>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-[2fr_1fr]">
        {/* Thumbnail 16:9 */}
        <Section title="Thumbnail">
          {thumbnail ? (
            <AssetCard
              label="16:9 Thumbnail"
              imageUrl={`data:${thumbnail.mime};base64,${thumbnail.image_b64}`}
              status="ready"
              aspect="16 / 9"
              onDownload={() =>
                download(`data:${thumbnail.mime};base64,${thumbnail.image_b64}`, "thumbnail_16x9.jpg")
              }
            />
          ) : (
            <AssetCard label="16:9 Thumbnail" status="generating" aspect="16 / 9" />
          )}
        </Section>

        {/* Story 9:16 */}
        <Section title="Story">
          <div className="max-w-[220px]">
            {story ? (
              <AssetCard
                label="9:16 Story"
                imageUrl={`data:${story.mime};base64,${story.image_b64}`}
                status="ready"
                aspect="9 / 16"
                onDownload={() =>
                  download(`data:${story.mime};base64,${story.image_b64}`, "story_9x16.jpg")
                }
              />
            ) : (
              <AssetCard label="9:16 Story" status="generating" aspect="9 / 16" />
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}
