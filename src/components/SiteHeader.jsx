import Link from "next/link";

export default function SiteHeader({ lang, nav, firmName }) {
  const base = `/${lang}`;
  return (
    <header className="border-b border-[var(--color-rule)] bg-[var(--color-paper)]">
      <div className="mx-auto max-w-6xl px-6 md:px-10 py-6 flex items-center justify-between">
        <Link href={base} className="serif text-lg tracking-tight no-underline">
          <span className="text-[var(--color-ink)]">{firmName}</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 smallcaps">
          <Link href={`${base}/firm`}>{nav.firm}</Link>
          <Link href={`${base}/programme`}>{nav.programme}</Link>
          <Link href={`${base}/governance`}>{nav.governance}</Link>
          <Link href={`${base}/contact`}>{nav.contact}</Link>
          <Link
            href={`${base}/portal`}
            className="border-l border-[var(--color-rule)] pl-8"
          >
            {nav.portal}
          </Link>
        </nav>
      </div>
    </header>
  );
}
