export function CoinIcon({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden
    >
      <circle cx="16" cy="16" r="13" fill="url(#goldg)" stroke="#9a6412" strokeWidth="2" />
      <circle cx="16" cy="16" r="9.5" fill="none" stroke="#c98513" strokeWidth="1.2" opacity="0.8" />
      <rect x="13" y="13" width="6" height="6" rx="0.8" fill="#8a5c0b" />
      <path d="M7 10a13 13 0 0 1 8-5.4" stroke="#fff3d6" strokeWidth="2.4" strokeLinecap="round" opacity="0.8" />
      <defs>
        <radialGradient id="goldg" cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#ffe9a3" />
          <stop offset="0.55" stopColor="#f2b93c" />
          <stop offset="1" stopColor="#c07f1d" />
        </radialGradient>
      </defs>
    </svg>
  );
}
