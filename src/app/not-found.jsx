import Link from "next/link";
import { defaultLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/getDictionary";
import SiteFrame from "@/components/SiteFrame";
import PageHead from "@/components/PageHead";

// Next adds its own noindex to a 404, so this sets only the title. Without
// this file the bare built-in page rendered instead, with no way back in.
export const metadata = {
  title: "Page not found"
};

// Every unknown URL lands here, the middleware having already sent anything
// without a locale to the default one, so the page speaks the default locale.
export default async function NotFound() {
  const dict = await getDictionary(defaultLocale);
  return (
    <SiteFrame lang={defaultLocale} dict={dict}>
      <PageHead
        label="Not found"
        title="There is no page at this address."
        lead="The link may be mistyped, or the page may have moved. Everything on the site can be reached from the home page."
      />
      <div className="shell pb-24">
        <Link href={`/${defaultLocale}`} className="btn btn-gold">
          <span>Go to the home page</span>
        </Link>
      </div>
    </SiteFrame>
  );
}
