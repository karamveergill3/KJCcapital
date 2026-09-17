import Link from "next/link";
import { getDictionary } from "@/lib/i18n/getDictionary";
import PageHead from "@/components/PageHead";
import EditorialSection from "@/components/EditorialSection";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: `${dict.meta.firmName} — ${dict.meta.tagline}`,
    description: dict.meta.story
  };
}

export default async function Home({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const { home, meta } = dict;
  return (
    <>
      <PageHead
        label={meta.firmName}
        title={meta.tagline}
        lead={home.leadIntro}
      />
      <section className="mx-auto max-w-6xl px-6 md:px-10 pb-8">
        <p className="prose-editorial max-w-3xl">{home.leadBody}</p>
      </section>

      <EditorialSection label={home.principlesLabel} title="How the firm works">
        <ul className="space-y-8 list-none pl-0">
          {home.principles.map((p) => (
            <li key={p.title}>
              <div className="serif text-lg text-[var(--color-ink)] mb-2">{p.title}</div>
              <p>{p.body}</p>
            </li>
          ))}
        </ul>
      </EditorialSection>

      <EditorialSection label={home.ledgerLabel} title="The fund at a glance">
        <table className="editorial">
          <tbody>
            {home.ledger.map((row) => (
              <tr key={row.term}>
                <th scope="row" className="!normal-case !tracking-normal !text-[0.95rem] !text-[var(--color-ink-mute)] !font-normal">
                  {row.term}
                </th>
                <td className="tabular text-[var(--color-ink)]">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </EditorialSection>

      <EditorialSection label={home.outroLabel} title="An introduction">
        <p>{home.outroBody}</p>
        <p className="mt-6">
          <Link
            href={`/${lang}/contact`}
            className="smallcaps border-b border-[var(--color-gold)] pb-1 no-underline text-[var(--color-ink)]"
          >
            {home.outroCta}
          </Link>
        </p>
      </EditorialSection>
    </>
  );
}
