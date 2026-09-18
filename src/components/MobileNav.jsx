"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function MobileNav({ lang, nav }) {
  const [open, setOpen] = useState(false);
  const base = `/${lang}`;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const items = [
    { href: `${base}/firm`, label: nav.firm },
    { href: `${base}/programme`, label: nav.programme },
    { href: `${base}/governance`, label: nav.governance },
    { href: `${base}/contact`, label: nav.contact },
    { href: `${base}/portal`, label: nav.portal }
  ];

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Close menu" : "Open menu"}
        className="flex h-11 w-11 -mr-2 flex-col items-center justify-center gap-[5px]"
      >
        <span
          className={`block h-px w-6 bg-[var(--color-gold-deep)] transition-transform duration-300 ${
            open ? "translate-y-[6px] rotate-45" : ""
          }`}
        />
        <span
          className={`block h-px w-6 bg-[var(--color-gold-deep)] transition-opacity duration-200 ${
            open ? "opacity-0" : ""
          }`}
        />
        <span
          className={`block h-px w-6 bg-[var(--color-gold-deep)] transition-transform duration-300 ${
            open ? "-translate-y-[6px] -rotate-45" : ""
          }`}
        />
      </button>

      {open ? (
        <nav
          id="mobile-nav"
          className="absolute left-0 right-0 top-full border-t border-[var(--color-rule)] bg-[var(--color-paper)] shadow-[0_20px_40px_-30px_rgba(15,15,14,0.4)]"
        >
          <div className="shell py-2">
            <ul className="m-0 list-none p-0">
              {items.map((item) => (
                <li key={item.href} className="border-b border-[var(--color-rule-faint)] last:border-b-0">
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="smallcaps smallcaps-ink flex min-h-[3.25rem] items-center no-underline"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
