import { getDictionary } from "@/lib/i18n/getDictionary";
import Hero from "@/components/Hero";
import Principles from "@/components/Principles";
import Ledger from "@/components/Ledger";
import Cadence from "@/components/Cadence";
import Invitation from "@/components/Invitation";

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
  const { home } = dict;

  return (
    <>
      <Hero lang={lang} hero={home.hero} />
      <Principles
        label={home.principlesLabel}
        title={home.principlesTitle}
        items={home.principles}
      />
      <Ledger
        label={home.ledgerLabel}
        title={home.ledgerTitle}
        rows={home.ledger}
      />
      <Cadence
        label={home.cadence.label}
        title={home.cadence.title}
        lead={home.cadence.lead}
        steps={home.cadence.steps}
      />
      <Invitation
        lang={lang}
        label={home.outroLabel}
        title={home.outroTitle}
        body={home.outroBody}
        cta={home.outroCta}
        signoff={home.outroSignoff}
      />
    </>
  );
}
