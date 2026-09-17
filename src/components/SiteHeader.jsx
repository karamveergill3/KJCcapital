import Link from "next/link";
import Monogram from "@/components/Monogram";
import LocalTime from "@/components/LocalTime";

export default function SiteHeader({ lang, nav, firmName }) {
  const base = `/${lang}`;
  return (
    <header className="border-b border-[var(--color-rule)] bg-[var(--color-paper)]/85 backdrop-blur-[6px] sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-6 md:px-10 py-5 flex items-center justify-between gap-8">
        <Link href={base} className="flex items-center gap-3 no-underline group">
          <Monogram size={26} />
          <span className="serif text-lg tracking-tight text-[var(--color-ink)]">
            {firmName}
          </span>
        </Link>
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
        <div className="mx-auto max-w-6xl px-6 md:px-10 py-2 flex items-center justify-between gap-4">
          <LocalTime />
          <div className="smallcaps hidden sm:block">
            Tortola <span className="text-[var(--color-ink-faint)]">·</span> London <span className="text-[var(--color-ink-faint)]">·</span> Zürich
          </div>
        </div>
      </div>
    </header>
  );
}
