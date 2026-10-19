// The pause control for a moving tape (WCAG 2.2.2: anything that moves for
// more than five seconds needs a way to stop it that does not depend on a
// mouse). The name stays fixed and aria-pressed carries the state, which is
// how a toggle button is announced; the glyph shows what a press will do.
export default function TapeToggle({ paused, onToggle, label }) {
  return (
    <button type="button" className="tape-toggle" aria-pressed={paused} aria-label={label} onClick={onToggle}>
      <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true" focusable="false">
        {paused ? (
          <path d="M2.5 1.2 L8.8 5 L2.5 8.8 Z" fill="currentColor" />
        ) : (
          <path d="M2 1.2 H4.2 V8.8 H2 Z M5.8 1.2 H8 V8.8 H5.8 Z" fill="currentColor" />
        )}
      </svg>
    </button>
  );
}
