import { getDictionary } from "@/lib/i18n/getDictionary";
import Hero from "@/components/Hero";
import Registers from "@/components/Registers";
import Principles from "@/components/Principles";
import Ledger from "@/components/Ledger";
import Cadence from "@/components/Cadence";
import Invitation from "@/components/Invitation";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: `${dict.meta.firmName} — ${dict.meta.tagline}`,
    description: dict.meta.story,
    alternates: { canonical: `/${lang}` },
    openGraph: {
      title: `${dict.meta.firmName} — ${dict.meta.tagline}`,
      description: dict.meta.story,
      url: `/${lang}`
    }
  };
}

export default async function Home({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const { home } = dict;

  return (
    <>
      <Hero lang={lang} hero={home.hero} />
      <Registers
        file="File 02"
        label={home.registersLabel}
        title={home.registersTitle}
        lead={home.registersLead}
        items={home.registers}
      />
      <Principles
        file="File 03"
        label={home.principlesLabel}
        title={home.principlesTitle}
        items={home.principles}
      />
      <Ledger
        file="File 04"
        label={home.ledgerLabel}
        title={home.ledgerTitle}
        rows={home.ledger}
      />
      <Cadence
        file="File 05"
        label={home.cadence.label}
        title={home.cadence.title}
        lead={home.cadence.lead}
        steps={home.cadence.steps}
      />
      <Invitation
        file="File 06"
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
