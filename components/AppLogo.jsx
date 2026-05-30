export default function AppLogo({ size = 52, className = '' }) {
  return (
    <div className={`app-logo ${className}`.trim()} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M8 10a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-4 4v-4H10a2 2 0 0 1-2-2V10z"
          fill="currentColor"
        />
        <circle cx="13" cy="14" r="1.25" fill="currentColor" opacity="0.35" />
        <circle cx="16" cy="14" r="1.25" fill="currentColor" opacity="0.35" />
        <circle cx="19" cy="14" r="1.25" fill="currentColor" opacity="0.35" />
      </svg>
    </div>
  );
}
