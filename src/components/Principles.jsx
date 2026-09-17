import Reveal from "@/components/Reveal";

const ROMAN = ["I", "II", "III", "IV", "V"];

export default function Principles({ file, label, title, items }) {
  return (
    <section className="shell py-16 md:py-24 border-t border-[var(--color-rule)]">
      <div className="grid gap-10 md:grid-cols-[16rem_1fr] xl:grid-cols-[22rem_1fr]">
        <div>
          <Reveal className="smallcaps flex items-center gap-3">
            <span className="folio-num">{file}</span>
            <span aria-hidden className="text-[var(--color-ink-faint)]">·</span>
            <span>{label}</span>
          </Reveal>
          <Reveal
            as="h2"
            delay={1}
            className="serif text-3xl md:text-4xl mt-4 leading-tight text-[var(--color-ink)]"
          >
            {title}
          </Reveal>
          <Reveal delay={2} className="mt-6 h-px bg-[var(--color-gold)] w-16 rule-draw" />
        </div>
        <ol className="space-y-0 list-none pl-0">
          {items.map((p, i) => (
            <Reveal
              as="li"
              key={p.title}
              delay={i + 1}
              className="grid grid-cols-[3rem_1fr] gap-6 py-8 border-b border-[var(--color-rule-faint)] last:border-b-0"
            >
              <div className="serif serif-italic text-2xl text-[var(--color-gold-deep)] pt-1">
                {ROMAN[i] ?? String(i + 1)}
              </div>
              <div>
                <div className="serif text-xl text-[var(--color-ink)] mb-3">{p.title}</div>
                <p className="prose-editorial prose-wide max-w-none">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
