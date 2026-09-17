import Link from "next/link";
import Reveal from "@/components/Reveal";

export default function Invitation({ file, lang, label, title, body, cta, signoff }) {
  return (
    <section className="shell py-20 md:py-28 border-t border-[var(--color-rule)]">
      <Reveal className="relative border border-[var(--color-rule-strong)] bg-[var(--color-paper-white)] p-10 md:p-16">
        <span className="paper-grain-layer" aria-hidden />
        <div className="relative z-10">
          <div className="smallcaps flex items-center gap-3">
            <span className="folio-num">{file}</span>
            <span aria-hidden className="text-[var(--color-ink-faint)]">·</span>
            <span>{label}</span>
          </div>
          <h2 className="serif text-3xl md:text-5xl mt-6 leading-tight text-[var(--color-ink)] max-w-3xl">
            {title}
          </h2>
          <p className="prose-editorial mt-8 max-w-2xl">{body}</p>
          <div className="mt-10 flex flex-wrap items-center gap-6">
            <Link href={`/${lang}/contact`} className="btn btn-gold">
              <span>{cta}</span>
            </Link>
            <div className="text-xs text-[var(--color-ink-mute)] max-w-xs leading-relaxed">
              {signoff}
            </div>
          </div>
        </div>
        <span
          className="absolute -top-2 -left-2 z-20 w-4 h-4 border-t border-l border-[var(--color-gold)]"
          aria-hidden
        />
        <span
          className="absolute -top-2 -right-2 z-20 w-4 h-4 border-t border-r border-[var(--color-gold)]"
          aria-hidden
        />
        <span
          className="absolute -bottom-2 -left-2 z-20 w-4 h-4 border-b border-l border-[var(--color-gold)]"
          aria-hidden
        />
        <span
          className="absolute -bottom-2 -right-2 z-20 w-4 h-4 border-b border-r border-[var(--color-gold)]"
          aria-hidden
        />
      </Reveal>
    </section>
  );
}
