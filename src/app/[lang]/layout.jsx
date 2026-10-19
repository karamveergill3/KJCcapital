import { notFound } from "next/navigation";
import { locales } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/getDictionary";
import SiteFrame from "@/components/SiteFrame";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function LocaleLayout({ children, params }) {
  const { lang } = await params;
  if (!locales.includes(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <SiteFrame lang={lang} dict={dict}>
      {children}
    </SiteFrame>
  );
}
