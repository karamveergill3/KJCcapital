import { getDictionary } from "@/lib/i18n/getDictionary";
import { longDate, money, signedPercent } from "@/lib/kjc";
import { fetchSiteFeed, keystoneFeedUrl, monthEnds, snapshotAccount, withHistory } from "@/lib/keystone";
import { pageMeta } from "@/lib/pageMeta";
import { account as example, activity, deskNote, documents, exampleAccount, fees, notices, registers, rules } from "@/lib/portalExample";
import { buildRanges } from "@/lib/trend";
import PageHead from "@/components/PageHead";
import EditorialSection from "@/components/EditorialSection";
import KjcBoard from "@/components/portal/KjcBoard";
import RegisterMeters from "@/components/portal/RegisterMeters";

// "2026-10" as "October 2026", read in UTC like every date on the page.
const monthName = (month) =>
  new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${month}-01T00:00:00Z`));

// Keystone syncs the account about once a minute, so the page is rebuilt at
// most that often. Without a feed it is the snapshot or the example, and
// neither changes.
export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    ...pageMeta({
      lang,
      path: "/portal",
      title: dict.portal.leadTitle,
      description: dict.portal.metaDescription
    }),
    // This alone keeps the portal out of the index. robots.txt must not block
    // the page as well: a crawler that obeys a disallow never fetches the page,
    // so it never reads the noindex and can still list the URL from links.
    robots: { index: false, follow: false }
  };
}

export default async function PortalPage({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const { portal } = dict;

  // Live from Keystone when the feed answers, drawn over the committed
  // history: the snapshot's exact points up to its last one, then the feed's
  // after it, with the feed's headline. Otherwise the committed snapshot of
  // the real account, labelled with its time, and only if that is missing
  // too, the labelled example.
  const live = await fetchSiteFeed(keystoneFeedUrl());
  const data = live ? withHistory(live, snapshotAccount()) : snapshotAccount() ?? exampleAccount();
  const { mode } = data;
  // The board's chart, one stretch of the series per range tab, and the month
  // table below, both from that one series. It is times and percentages only,
  // so every range and every month is too.
  const ranges = buildRanges(data.series);
  // The month the data was taken in reads "to date", even when the feed has
  // stopped syncing or the snapshot is weeks old, so a mid-month reading is
  // never shown as a month end. The example's points are month ends already,
  // so it goes by today's date.
  const months = monthEnds(data.series, mode === "example" ? undefined : new Date(data.asAt));

  return (
    <>
      <PageHead label="Portal" title={portal.leadTitle} lead={portal.leadIntro} />

      <KjcBoard
        mode={mode}
        initial={{ percent: data.percent, asAt: data.asAt }}
        ranges={ranges}
        copy={portal.quote}
      />

      {/* One month in a table says no more than the board, so the table
          waits until the series reaches into a second calendar month. */}
      {months.length > 1 ? (
        <section className="shell py-12 md:py-16 border-t border-[var(--color-rule)]">
          <div className="smallcaps">{portal.performance.label}</div>
          <h2 className="serif text-2xl md:text-3xl mt-3 mb-3 leading-tight text-[var(--color-ink)]">
            {portal.performance.title}
          </h2>
          <p className="text-sm text-[var(--color-ink-soft)] mb-8">{portal.performance.note}</p>
          <div className="overflow-x-auto">
            <table className="editorial max-w-sm">
              <thead>
                <tr>
                  <th scope="col">{portal.performance.month}</th>
                  <th scope="col" className="text-right">{portal.performance.kjc}</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <tr key={m.month}>
                    <td>
                      {monthName(m.month)}
                      {m.toDate ? <span className="smallcaps ml-2">{portal.performance.toDate}</span> : null}
                    </td>
                    <td className="tabular text-right">{signedPercent(m.kjc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <EditorialSection label={portal.mandate.label} title={portal.mandate.title}>
        <dl className="grid gap-x-10 gap-y-6 sm:grid-cols-2 not-prose">
          {rules.map((rule) => (
            <div key={rule.term} className="border-t border-[var(--color-rule)] pt-4">
              <dt className="smallcaps">{rule.term}</dt>
              <dd className="m-0 mt-2">
                <span className="font-sans font-semibold text-[var(--color-ink)]">{rule.value}</span>
                {rule.example ? <span className="smallcaps smallcaps-gold ml-2">{portal.exampleTag}</span> : null}
                <span className="block text-sm text-[var(--color-ink-soft)] mt-1 leading-relaxed">{rule.detail}</span>
              </dd>
            </div>
          ))}
        </dl>
        <h3 className="serif text-xl mt-12 mb-6 text-[var(--color-ink)]">
          {portal.mandate.registers}
          <span className="smallcaps smallcaps-gold ml-3">{portal.exampleTag}</span>
        </h3>
        <RegisterMeters registers={registers} copy={portal.mandate} />
        <p className="text-xs text-[var(--color-ink-mute)] mt-6">{portal.mandate.example}</p>
      </EditorialSection>

      <EditorialSection label={portal.activity.label} tag={portal.exampleTag} title={portal.activity.title}>
        <ol className="list-none pl-0">
          {activity.map((entry) => (
            <li
              key={`${entry.at}-${entry.summary}`}
              className="border-t border-[var(--color-rule)] py-4 grid gap-1 sm:grid-cols-[9rem_1fr]"
            >
              <div>
                <div className="font-sans text-sm text-[var(--color-ink)] tabular">{longDate(entry.at)}</div>
                <div className="smallcaps mt-1">{entry.kind}</div>
              </div>
              <p className="m-0">{entry.summary}</p>
            </li>
          ))}
        </ol>
      </EditorialSection>

      <EditorialSection label={portal.fees.label} tag={portal.exampleTag} title={portal.fees.title}>
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
                  <td className="tabular text-right">{money(fee.amount, example.currency)}</td>
                  <td className="font-mono text-sm">{fee.statementLine}</td>
                  <td>{fee.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </EditorialSection>

      <EditorialSection label={portal.documents.label} tag={portal.exampleTag} title="">
        <ul className="list-none pl-0">
          {documents.map((doc) => (
            <li
              key={doc.title}
              className="border-t border-[var(--color-rule)] py-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1"
            >
              <span className="text-[var(--color-ink)]">{doc.title}</span>
              <span className="smallcaps">
                {doc.kind} · {longDate(doc.at)}
              </span>
            </li>
          ))}
        </ul>
      </EditorialSection>

      <EditorialSection label={portal.notices.label} tag={portal.exampleTag} title="">
        <ul className="list-none pl-0">
          {notices.map((n) => (
            <li key={n.title} className="border-t border-[var(--color-rule)] py-3">
              <div className="text-[var(--color-ink)]">{n.title}</div>
              <div className="smallcaps mt-1">
                {longDate(n.at)} · {n.acknowledged ? portal.notices.acknowledged : portal.notices.outstanding}
              </div>
            </li>
          ))}
        </ul>
      </EditorialSection>

      <EditorialSection label={portal.deskNote.label} tag={portal.exampleTag} title={deskNote.period}>
        <p>{deskNote.body}</p>
        <p className="smallcaps mt-4">{longDate(deskNote.at)}</p>
      </EditorialSection>
    </>
  );
}
