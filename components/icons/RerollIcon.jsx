/** Ikona losowania awatara (reroll). */
export function RerollIcon({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4.5 9.5A7.5 7.5 0 0 1 17 6.3" />
      <path d="M19.5 14.5A7.5 7.5 0 0 1 7 17.7" />
      <polyline points="15 3 17 6 14 6" />
      <polyline points="9 21 7 18 10 18" />
      <circle cx="12" cy="12" r="2.25" fill="currentColor" stroke="none" opacity="0.35" />
    </svg>
  );
}
