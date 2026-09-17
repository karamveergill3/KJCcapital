export default function PageHead({ label, title, lead }) {
  return (
    <header className="mx-auto max-w-6xl px-6 md:px-10 pt-16 md:pt-24 pb-10">
      {label ? (
        <div className="smallcaps letter-settle mb-8 flex items-center gap-3">
          <span aria-hidden className="folio-num">§</span>
          <span>{label}</span>
        </div>
      ) : null}
      <h1 className="serif letter-settle text-4xl md:text-6xl leading-[1.03] tracking-tight text-[var(--color-ink)] max-w-3xl">
        {title}
      </h1>
      {lead ? (
        <p className="serif fade-up is-visible delay-2 mt-8 text-xl md:text-2xl leading-snug text-[var(--color-ink-soft)] max-w-3xl">
          {lead}
        </p>
      ) : null}
      <div className="rule-draw mt-12 h-px bg-[var(--color-gold)] w-24" />
    </header>
  );
}
