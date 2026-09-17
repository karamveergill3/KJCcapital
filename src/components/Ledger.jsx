import Reveal from "@/components/Reveal";

export default function Ledger({ label, title, rows }) {
  return (
    <section className="mx-auto max-w-6xl px-6 md:px-10 py-16 md:py-20 border-t border-[var(--color-rule)]">
      <div className="grid gap-10 md:grid-cols-[16rem_1fr]">
        <div>
          <Reveal className="smallcaps flex items-center gap-3">
            <span className="folio-num">File 03</span>
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
        <Reveal
          delay={2}
          className="border border-[var(--color-rule)] bg-[var(--color-paper-white)] p-6 md:p-8"
        >
          <table className="editorial">
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.term}>
                  <th scope="row" className="!normal-case !tracking-normal !text-[0.98rem] !text-[var(--color-ink-mute)] !font-normal !py-4">
                    <span className="folio-num mr-3">{romanize(i + 1)}</span>
                    {row.term}
                  </th>
                  <td className="tabular text-[var(--color-ink)] !py-4 text-right">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      </div>
    </section>
  );
}

function romanize(n) {
  const map = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  return map[n - 1] ?? String(n);
}
