export default function Monogram({ size = 28 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden
      className="text-[var(--color-gold-deep)]"
    >
      <circle cx="20" cy="20" r="19" fill="none" stroke="currentColor" strokeWidth="0.75" />
      <path
        d="M13 11 L13 29 M13 20 L20 11 M13 20 L20 29"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 11 L28 11 L28 23 Q28 29 24 29 Q22 29 22 27"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
