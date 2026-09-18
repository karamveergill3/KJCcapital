import Link from "next/link";
import Fleur from "@/components/Fleur";
import LocalTime from "@/components/LocalTime";
import MobileNav from "@/components/MobileNav";

export default function SiteHeader({ lang, nav }) {
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
          <Link href={`${base}/firm`} className="link-slide">{nav.firm}</Link>
          <Link href={`${base}/programme`} className="link-slide">{nav.programme}</Link>
          <Link href={`${base}/governance`} className="link-slide">{nav.governance}</Link>
          <Link href={`${base}/contact`} className="link-slide">{nav.contact}</Link>
          <Link
            href={`${base}/portal`}
            className="border-l border-[var(--color-rule)] pl-8 link-slide"
          >
            {nav.portal}
          </Link>
        </nav>
      </div>
      <div className="border-t border-[var(--color-rule-faint)] bg-[var(--color-paper-warm)]/50">
        <div className="shell py-2 flex items-center justify-between gap-4">
          <LocalTime />
          <div className="smallcaps hidden sm:block">
            Tortola <span className="text-[var(--color-ink-faint)]">·</span> London <span className="text-[var(--color-ink-faint)]">·</span> Zürich
          </div>
        </div>
      </div>
    </header>
  );
}
