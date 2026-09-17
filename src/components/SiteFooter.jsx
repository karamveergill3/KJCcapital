import Link from "next/link";

export default function SiteFooter({ lang, footer, firmName, risk }) {
  const base = `/${lang}`;
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[var(--color-rule)] bg-[var(--color-paper-warm)]">
      <div className="mx-auto max-w-6xl px-6 md:px-10 py-12">
        <div className="serif text-sm text-[var(--color-ink-soft)] max-w-3xl leading-relaxed">
          {risk.banner}
        </div>
        <hr className="rule my-10" />
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <div className="smallcaps mb-3">Firm</div>
            <div className="serif text-lg">{firmName}</div>
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
            <ul className="space-y-2 text-sm">
              <li><Link href={`${base}/legal/terms`}>{footer.legal.terms}</Link></li>
              <li><Link href={`${base}/legal/privacy`}>{footer.legal.privacy}</Link></li>
              <li><Link href={`${base}/legal/cookies`}>{footer.legal.cookies}</Link></li>
              <li><Link href={`${base}/legal/risk`}>{footer.legal.risk}</Link></li>
              <li><Link href={`${base}/legal/disclosures`}>{footer.legal.disclosures}</Link></li>
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
