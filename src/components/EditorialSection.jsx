export default function EditorialSection({ label, title, children }) {
  return (
    <section className="shell py-12 md:py-16 border-t border-[var(--color-rule)]">
      <div className="grid gap-8 md:grid-cols-[12rem_1fr]">
        <div>
          <div className="smallcaps">{label}</div>
          {title ? (
            <h2 className="serif text-2xl md:text-3xl mt-3 leading-tight text-[var(--color-ink)]">
              {title}
            </h2>
          ) : null}
        </div>
        <div className="prose-editorial">{children}</div>
      </div>
    </section>
  );
}
