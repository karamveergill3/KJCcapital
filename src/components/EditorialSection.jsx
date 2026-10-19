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
        {/* min-w-0: a grid column grows to fit its widest child unless told it
            may shrink, so a wide table would push the page off the screen
            instead of scrolling inside its own box. */}
        <div className="prose-editorial min-w-0">{children}</div>
      </div>
    </section>
  );
}
