import { notFound } from "next/navigation";
import { locales } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/getDictionary";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function LocaleLayout({ children, params }) {
  const { lang } = await params;
  if (!locales.includes(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader
        lang={lang}
        nav={dict.nav}
        ticker={{ ...dict.ticker, rows: dict.home.ledger }}
      />
      <main className="flex-1">{children}</main>
      <SiteFooter lang={lang} footer={dict.footer} firmName={dict.meta.firmName} risk={dict.risk} />
    </div>
  );
}
