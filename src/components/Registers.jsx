import Reveal from "@/components/Reveal";

export default function Registers({ file, label, title, lead, items }) {
  return (
    <section className="shell py-16 md:py-24 border-t border-[var(--color-rule)]">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Reveal className="smallcaps flex items-center gap-3">
            <span className="folio-num">{file}</span>
            <span aria-hidden className="text-[var(--color-ink-faint)]">·</span>
            <span>{label}</span>
          </Reveal>
          <Reveal
            as="h2"
            delay={1}
            className="serif text-3xl md:text-5xl mt-4 leading-tight text-[var(--color-ink)]"
          >
            {title}
          </Reveal>
        </div>
        {lead ? (
          <Reveal as="p" delay={2} className="serif text-lg text-[var(--color-ink-soft)] max-w-sm">
            {lead}
          </Reveal>
        ) : null}
      </div>

      <Reveal delay={2} className="mt-10 h-px bg-[var(--color-gold)] w-24 rule-draw" />

      <ol className="mt-12 grid gap-px bg-[var(--color-rule)] sm:grid-cols-2 xl:grid-cols-4 list-none pl-0">
        {items.map((item, i) => (
          <Reveal
            as="li"
            key={item.name}
            delay={Math.min(i + 1, 5)}
            className="bg-[var(--color-paper)] p-8 xl:p-10 flex flex-col"
          >
            <div className="flex items-baseline justify-between gap-4">
              <span className="folio-num">{String(i + 1).padStart(2, "0")}</span>
              <span className="smallcaps smallcaps-gold">{item.note}</span>
            </div>
            <h3 className="serif text-2xl mt-6 text-[var(--color-ink)]">{item.name}</h3>
            <p className="prose-editorial mt-4 text-[0.98rem]">{item.body}</p>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}
