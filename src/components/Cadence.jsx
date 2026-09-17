import Reveal from "@/components/Reveal";

export default function Cadence({ file, label, title, lead, steps }) {
  return (
    <section className="border-t border-[var(--color-rule)] bg-[var(--color-paper-warm)]/60">
      <div className="shell py-16 md:py-24">
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
            {lead ? (
              <Reveal delay={3} as="p" className="prose-editorial mt-8 max-w-sm">
                {lead}
              </Reveal>
            ) : null}
          </div>
          <ol className="relative list-none pl-0">
            <span
              className="absolute left-4 top-4 bottom-4 w-px bg-[var(--color-rule-strong)]"
              aria-hidden
            />
            {steps.map((step, i) => (
              <Reveal
                as="li"
                key={step.title}
                delay={i + 1}
                className="relative pl-14 pb-10 last:pb-0"
              >
                <span
                  className="absolute left-2 top-2 w-5 h-5 rounded-full border border-[var(--color-gold)] bg-[var(--color-paper-white)] flex items-center justify-center"
                  aria-hidden
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold)]" />
                </span>
                <div className="smallcaps flex items-baseline gap-3">
                  <span className="tabular text-[var(--color-ink)]">{step.when}</span>
                  <span aria-hidden className="text-[var(--color-ink-faint)]">·</span>
                  <span>{step.stage}</span>
                </div>
                <div className="serif text-xl mt-3 text-[var(--color-ink)]">{step.title}</div>
                <p className="prose-editorial prose-wide mt-3 max-w-none">{step.body}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
