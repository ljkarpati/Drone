// The TurnAround mark: a U-turn arrow above a wave. The same drawing is used for the
// app icons and the cover image (scripts/make-icons.ts and scripts/make-cover.ts).

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="14" fill="#0B2545" />
      <path
        d="M41 38V23a9 9 0 0 0-18 0v10"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path d="M15 31h16l-8 10z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round" />
      <path
        d="M9 51q5.5-5 11 0t11 0 11 0 11 0"
        fill="none"
        stroke="#7CC4FA"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
