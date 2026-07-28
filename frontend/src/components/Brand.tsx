// "Cut K" monogram: the upright is a filmstrip edge, the electric diagonal is
// the cut. Paired with the tracked-out wordmark.

export function KadrMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 58 58" fill="none" aria-hidden="true">
      <rect x="8" y="6" width="10" height="46" rx="2" fill="#111114" />
      <path d="M46 6 24 29l22 23h-13L18 33v-8L33 6z" fill="#2E6BFF" />
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
