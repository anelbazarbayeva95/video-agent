// Frame Noir brand lockup: crop-mark corners + ember center, tracked-out wordmark.

export function KadrMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 58 58" fill="none" aria-hidden="true">
      <path
        d="M4 16V4h12M54 16V4H42M4 42v12h12M54 42v12H42"
        stroke="#EDE8DF"
        strokeWidth="4"
        strokeLinecap="square"
      />
      <rect x="22.5" y="22.5" width="13" height="13" fill="#D9873F" />
    </svg>
  );
}

export function KadrWordmark({ size = 22 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5 text-bone">
      <KadrMark size={size} />
      <span className="pl-0.5 text-sm font-bold uppercase tracking-brand">Kadr</span>
    </span>
  );
}
