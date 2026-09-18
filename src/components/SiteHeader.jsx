import Link from "next/link";
import { NAV_ITEMS } from "@/lib/site";
import Fleur from "@/components/Fleur";
import LocalTime from "@/components/LocalTime";
import Ticker from "@/components/Ticker";
import MobileNav from "@/components/MobileNav";

export default function SiteHeader({ lang, nav, ticker }) {
  const base = `/${lang}`;
  return (
    <header className="relative border-b border-[var(--color-rule)] bg-[var(--color-paper)]/85 backdrop-blur-[6px] sticky top-0 z-40">
      <div className="shell py-5 flex items-center justify-between gap-8">
        <Link href={base} className="flex min-h-11 items-center gap-3.5 no-underline">
          <Fleur size={26} />
          <span className="wordmark">
            KJC<span className="wordmark-sep">·</span>Capital
          </span>
        </Link>
        <MobileNav lang={lang} nav={nav} />
        <nav className="hidden md:flex items-center gap-8 smallcaps">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={`${base}${item.path}`}
              className={
                item.rule
                  ? "border-l border-[var(--color-rule)] pl-8 link-slide"
                  : "link-slide"
              }
            >
              {nav[item.key]}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-[var(--color-rule-faint)] bg-[var(--color-paper-warm)]/50">
        <div className="shell py-2 flex items-center gap-3 sm:gap-6">
          <LocalTime />
          <div className="flex-1 min-w-0 sm:border-l sm:border-[var(--color-rule)] sm:pl-6">
            <Ticker rows={ticker.rows} extra={ticker.extra} label={ticker.label} />
          </div>
        </div>
      </div>
    </header>
  );
}
