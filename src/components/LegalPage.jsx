import PageHead from "@/components/PageHead";

export default function LegalPage({ label, title, updated, children }) {
  return (
    <>
      <PageHead label={label} title={title} />
      <div className="mx-auto max-w-3xl px-6 md:px-10 pb-24">
        <div className="smallcaps text-[var(--color-ink-mute)] mb-8">
          Last updated {updated}
        </div>
        <div className="prose-editorial">{children}</div>
      </div>
    </>
  );
}
