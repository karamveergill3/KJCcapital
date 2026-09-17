export default function PageHead({ label, title, lead }) {
  return (
    <header className="mx-auto max-w-6xl px-6 md:px-10 pt-16 md:pt-24 pb-10">
      {label ? <div className="smallcaps mb-6">{label}</div> : null}
      <h1 className="serif text-4xl md:text-6xl leading-[1.05] tracking-tight text-[var(--color-ink)] max-w-3xl">
        {title}
      </h1>
      {lead ? (
        <p className="serif mt-8 text-xl md:text-2xl leading-snug text-[var(--color-ink-soft)] max-w-3xl">
          {lead}
        </p>
      ) : null}
      <hr className="rule-gold mt-12 w-24" />
    </header>
  );
}
