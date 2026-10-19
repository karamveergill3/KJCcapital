import { getDictionary } from "@/lib/i18n/getDictionary";
import { kjcHistory, kjcQuote, longDate, maxDrawdown, money, shortMonth, signedPercent } from "@/lib/kjc";
import { account, activity, deskNote, documents, fees, notices, registers, rules } from "@/lib/portalExample";
import PageHead from "@/components/PageHead";
import EditorialSection from "@/components/EditorialSection";
import Ticker from "@/components/Ticker";
import KjcQuote from "@/components/portal/KjcQuote";
import KjcChart from "@/components/portal/KjcChart";
import RegisterMeters from "@/components/portal/RegisterMeters";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: dict.portal.leadTitle,
    description: dict.portal.metaDescription,
    alternates: { canonical: `/${lang}/portal` },
    // robots.txt already disallows /*/portal. Saying it again in the page's own
    // head means a crawler that ignores one still sees the other.
    robots: { index: false, follow: false },
    openGraph: {
      title: dict.portal.leadTitle,
      description: dict.portal.metaDescription,
      url: `/${lang}/portal`
    }
  };
}

export default async function PortalPage({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const { portal } = dict;
  const { currency, snapshots } = account;

  const latest = snapshots[snapshots.length - 1];
  const quote = kjcQuote(latest);
  const drawdown = maxDrawdown(snapshots);
  const points = kjcHistory(snapshots).map((h) => ({ month: shortMonth(h.at), percent: h.percent }));

  // Long enough to fill a wide screen: the tape loops by running twice, so a
  // short one would leave a gap before it comes round again.
  const tape = [
    { term: portal.quote.symbol, value: signedPercent(quote.percent) },
    { term: portal.quote.net, value: money(quote.net, currency, { signed: true }) },
    { term: portal.quote.closed, value: money(quote.closed, currency, { signed: true }) },
    { term: portal.quote.floating, value: money(quote.floating, currency, { signed: true }) },
    { term: portal.quote.equity, value: money(latest.equity, currency) },
    { term: portal.quote.balance, value: money(latest.balance, currency) },
    { term: portal.quote.capital, value: money(quote.capital, currency) },
    { term: portal.quote.drawdown, value: signedPercent(drawdown) },
    ...registers.map((r) => ({ term: r.name, value: `${r.weight}%` })),
    { term: portal.quote.asAt, value: longDate(account.asAt) }
  ];

  return (
    <>
      <PageHead label="Portal" title={portal.leadTitle} lead={portal.leadIntro} />

      <div className="shell pb-10">
        <aside className="border border-[var(--color-gold)] bg-[var(--color-paper-white)] px-5 py-4 max-w-3xl">
          <div className="smallcaps smallcaps-gold">{portal.example.label}</div>
          <p className="text-sm text-[var(--color-ink-soft)] mt-2 leading-relaxed">{portal.example.body}</p>
        </aside>
      </div>

      <div className="border-y border-[var(--color-rule)] bg-[var(--color-paper-warm)]/50">
        <div className="shell py-2">
          <Ticker rows={tape} label={portal.tapeLabel} />
        </div>
      </div>

      <section className="shell py-12 md:py-16">
        <KjcQuote
          quote={quote}
          currency={currency}
          drawdown={drawdown}
          copy={portal.quote}
          asAt={longDate(account.asAt)}
        />
      </section>

      <section className="shell py-12 md:py-16 border-t border-[var(--color-rule)]">
        <div className="smallcaps">{portal.performance.label}</div>
        <h2 className="serif text-2xl md:text-3xl mt-3 mb-8 leading-tight text-[var(--color-ink)]">
          {portal.performance.title}
        </h2>
        <KjcChart points={points} label={portal.performance.title} />
        <details className="mt-6">
          <summary className="smallcaps cursor-pointer min-h-11 flex items-center">{portal.performance.table}</summary>
          <table className="editorial mt-4 max-w-md">
            <thead>
              <tr>
                <th scope="col">{portal.performance.month}</th>
                <th scope="col" className="text-right">{portal.performance.value}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.month}>
                  <td>{p.month}</td>
                  <td className="tabular text-right">{signedPercent(p.percent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      <EditorialSection label={portal.mandate.label} title={portal.mandate.title}>
        <dl className="grid gap-x-10 gap-y-6 sm:grid-cols-2 not-prose">
          {rules.map((rule) => (
            <div key={rule.term} className="border-t border-[var(--color-rule)] pt-4">
              <dt className="smallcaps">{rule.term}</dt>
              <dd className="m-0 mt-2">
                <span className="font-sans font-semibold text-[var(--color-ink)]">{rule.value}</span>
                {rule.example ? (
                  <span className="smallcaps smallcaps-gold ml-2">{portal.mandate.exampleTag}</span>
                ) : null}
                <span className="block text-sm text-[var(--color-ink-soft)] mt-1 leading-relaxed">
                  {rule.detail}
                </span>
              </dd>
            </div>
          ))}
        </dl>
        <h3 className="serif text-xl mt-12 mb-6 text-[var(--color-ink)]">{portal.mandate.registers}</h3>
        <RegisterMeters registers={registers} copy={portal.mandate} />
        <p className="text-xs text-[var(--color-ink-mute)] mt-6">{portal.mandate.example}</p>
      </EditorialSection>

      <EditorialSection label={portal.activity.label} title={portal.activity.title}>
        <ol className="list-none pl-0">
          {activity.map((entry) => (
            <li key={`${entry.at}-${entry.summary}`} className="border-t border-[var(--color-rule)] py-4 grid gap-1 sm:grid-cols-[9rem_1fr]">
              <div>
                <div className="font-sans text-sm text-[var(--color-ink)] tabular">{longDate(entry.at)}</div>
                <div className="smallcaps mt-1">{entry.kind}</div>
              </div>
              <p className="m-0">{entry.summary}</p>
            </li>
          ))}
        </ol>
      </EditorialSection>

      <EditorialSection label={portal.fees.label} title={portal.fees.title}>
        <div className="overflow-x-auto">
          <table className="editorial min-w-[34rem]">
            <thead>
              <tr>
                <th scope="col">{portal.fees.period}</th>
                <th scope="col">{portal.fees.description}</th>
                <th scope="col" className="text-right">{portal.fees.amount}</th>
                <th scope="col">{portal.fees.statementLine}</th>
                <th scope="col">{portal.fees.status}</th>
              </tr>
            </thead>
            <tbody>
              {fees.map((fee) => (
                <tr key={fee.statementLine}>
                  <td>{fee.period}</td>
                  <td>{fee.description}</td>
                  <td className="tabular text-right">{money(fee.amount, currency)}</td>
                  <td className="font-mono text-sm">{fee.statementLine}</td>
                  <td>{fee.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </EditorialSection>

      <EditorialSection label={portal.documents.label} title="">
        <ul className="list-none pl-0">
          {documents.map((doc) => (
            <li key={doc.title} className="border-t border-[var(--color-rule)] py-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <span className="text-[var(--color-ink)]">{doc.title}</span>
              <span className="smallcaps">
                {doc.kind} · {longDate(doc.at)}
              </span>
            </li>
          ))}
        </ul>
      </EditorialSection>

      <EditorialSection label={portal.notices.label} title="">
        <ul className="list-none pl-0">
          {notices.map((notice) => (
            <li key={notice.title} className="border-t border-[var(--color-rule)] py-3">
              <div className="text-[var(--color-ink)]">{notice.title}</div>
              <div className="smallcaps mt-1">
                {longDate(notice.at)} · {notice.acknowledged ? portal.notices.acknowledged : portal.notices.outstanding}
              </div>
            </li>
          ))}
        </ul>
      </EditorialSection>

      <EditorialSection label={portal.deskNote.label} title={deskNote.period}>
        <p>{deskNote.body}</p>
        <p className="smallcaps mt-4">{longDate(deskNote.at)}</p>
      </EditorialSection>
    </>
  );
}
