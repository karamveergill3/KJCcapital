export default function Fleur({ size = 26, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="KJC Capital"
      className={`text-[var(--color-gold-deep)] ${className}`.trim()}
      fill="currentColor"
    >
      {/* central lance */}
      <path d="M24 3.2c2.7 5 4.5 9.9 4.5 14.7 0 4.3-1.5 7.6-4.5 9.9-3-2.3-4.5-5.6-4.5-9.9 0-4.8 1.8-9.7 4.5-14.7z" />
      {/* side scrolls, mirrored about the centre line */}
      <g>
        <path d="M21.9 25.4c-3-2.5-6.4-4.5-9.5-4.5-3.5 0-6.1 2.4-6.1 5.7 0 2.9 2 5.1 4.8 5.5-1.5-.9-2.2-2.1-2.2-3.6 0-2 1.5-3.3 3.5-3.3 2.5 0 5.4 1.7 7.9 4z" />
        <path
          d="M21.9 25.4c-3-2.5-6.4-4.5-9.5-4.5-3.5 0-6.1 2.4-6.1 5.7 0 2.9 2 5.1 4.8 5.5-1.5-.9-2.2-2.1-2.2-3.6 0-2 1.5-3.3 3.5-3.3 2.5 0 5.4 1.7 7.9 4z"
          transform="matrix(-1 0 0 1 48 0)"
        />
      </g>
      {/* band */}
      <rect x="13.4" y="28.6" width="21.2" height="2.7" rx="0.7" />
      {/* foot */}
      <path d="M18.8 32.9h10.4c0 4.4-1.7 8.2-5.2 11.5-3.5-3.3-5.2-7.1-5.2-11.5z" />
    </svg>
  );
}
