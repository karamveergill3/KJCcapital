import Link from "next/link";

export default function Hero({ lang, hero }) {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-6 md:px-10 pt-16 md:pt-24 pb-16 md:pb-24">
        <div className="grid gap-14 md:grid-cols-[1.4fr_1fr] md:gap-16 items-start">
          <div>
            <div className="smallcaps letter-settle flex items-center gap-3">
              <span className="folio-num">File 01</span>
              <span aria-hidden className="text-[var(--color-ink-faint)]">·</span>
              <span>Mandate</span>
            </div>
            <h1 className="serif text-[2.6rem] md:text-[4.4rem] leading-[1.02] tracking-tight mt-8 text-[var(--color-ink)] max-w-3xl">
              <span className="letter-settle inline-block">A precision</span>{" "}
              <span className="letter-settle inline-block" style={{ animationDelay: "120ms" }}>
                instrument
              </span>{" "}
              <span className="letter-settle inline-block" style={{ animationDelay: "240ms" }}>
                for
              </span>{" "}
              <span
                className="serif-italic letter-settle inline-block text-[var(--color-gold-deep)]"
                style={{ animationDelay: "360ms" }}
              >
                capital.
              </span>
            </h1>
            <p
              className="serif mt-10 text-lg md:text-xl leading-snug text-[var(--color-ink-soft)] max-w-xl fade-up is-visible delay-3"
            >
              {hero.lead}
            </p>
            <div
              className="mt-10 flex flex-wrap items-center gap-4 fade-up is-visible delay-4"
            >
              <Link href={`/${lang}/contact`} className="btn btn-gold">
                <span>{hero.ctaPrimary}</span>
              </Link>
              <Link href={`/${lang}/programme`} className="btn">
                <span>{hero.ctaSecondary}</span>
              </Link>
            </div>
            <div className="mt-14 h-px bg-[var(--color-gold)] rule-draw w-40" />
            <dl className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-8 max-w-2xl fade-up is-visible delay-5">
              {hero.meta.map((item) => (
                <div key={item.label}>
                  <dt className="smallcaps">{item.label}</dt>
                  <dd className="serif text-lg mt-2 text-[var(--color-ink)]">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <aside className="relative">
            <div className="border border-[var(--color-rule)] bg-[var(--color-paper-white)] p-8 md:p-10 shadow-[0_1px_0_var(--color-rule),0_20px_40px_-30px_rgba(15,15,14,0.20)]">
              <div className="flex items-center justify-between">
                <div className="smallcaps flex items-center gap-2">
                  <span className="folio-num">Folio</span>
                  <span aria-hidden className="text-[var(--color-ink-faint)]">·</span>
                  <span>{hero.folio.label}</span>
                </div>
                <span className="smallcaps smallcaps-gold">{hero.folio.badge}</span>
              </div>
              <h2 className="serif text-2xl md:text-3xl mt-6 leading-tight text-[var(--color-ink)]">
                {hero.folio.title}
              </h2>
              <p className="mt-4 text-sm text-[var(--color-ink-soft)] leading-relaxed max-w-sm">
                {hero.folio.body}
              </p>
              <hr className="rule my-6" />
              <ul className="space-y-3">
                {hero.folio.items.map((entry) => (
                  <li
                    key={entry.term}
                    className="flex items-baseline justify-between gap-4"
                  >
                    <span className="smallcaps">{entry.term}</span>
                    <span className="serif text-[var(--color-ink)] tabular text-sm">
                      {entry.value}
                    </span>
                  </li>
                ))}
              </ul>
              <hr className="rule my-6" />
              <div className="flex items-center justify-between text-xs text-[var(--color-ink-mute)]">
                <span className="smallcaps">Reference</span>
                <span className="tabular">{hero.folio.reference}</span>
              </div>
            </div>
            <div className="absolute -top-3 -right-3 w-3 h-3 border-t border-r border-[var(--color-gold)]" aria-hidden />
            <div className="absolute -bottom-3 -left-3 w-3 h-3 border-b border-l border-[var(--color-gold)]" aria-hidden />
          </aside>
        </div>
      </div>
    </section>
  );
}
