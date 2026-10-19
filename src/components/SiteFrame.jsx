import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

// The header, main column and footer every page sits in. The locale layout
// wraps its pages in it, and the root not-found page wraps itself in it,
// because an unknown URL never reaches the locale layout.
export default function SiteFrame({ lang, dict, children }) {
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
