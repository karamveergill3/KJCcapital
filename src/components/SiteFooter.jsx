import Link from "next/link";

export default function SiteFooter({ lang, footer, firmName, risk }) {
  const base = `/${lang}`;
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[var(--color-rule)] bg-[var(--color-paper-warm)]">
      <div className="shell py-12">
        <div className="serif text-sm text-[var(--color-ink-soft)] max-w-3xl leading-relaxed">
          {risk.banner}
        </div>
        <hr className="rule my-10" />
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <div className="smallcaps mb-3">Firm</div>
            <div className="wordmark">
              KJC<span className="wordmark-sep">·</span>Capital
            </div>
            <div className="text-sm text-[var(--color-ink-mute)] mt-2 max-w-xs leading-relaxed">
              {footer.regulatory}
            </div>
          </div>
          <div>
            <div className="smallcaps mb-3">Notice</div>
            <p className="text-sm text-[var(--color-ink-soft)] max-w-xs leading-relaxed">
              {footer.notice}
            </p>
          </div>
          <div>
            <div className="smallcaps mb-3">Legal</div>
            <ul className="text-sm list-none pl-0">
              {[
                [`${base}/legal/terms`, footer.legal.terms],
                [`${base}/legal/privacy`, footer.legal.privacy],
                [`${base}/legal/cookies`, footer.legal.cookies],
                [`${base}/legal/risk`, footer.legal.risk],
                [`${base}/legal/disclosures`, footer.legal.disclosures]
              ].map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="flex min-h-11 items-center">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <hr className="rule mt-10 mb-6" />
        <div className="flex items-center justify-between text-xs text-[var(--color-ink-mute)]">
          <div>© {year} {firmName}. All rights reserved.</div>
          <div className="smallcaps">British Virgin Islands</div>
        </div>
      </div>
    </footer>
  );
}
