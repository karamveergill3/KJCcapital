"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn } from "@/app/[lang]/portal/actions";

export default function SignInForm({ lang, copy }) {
  const [state, action, pending] = useActionState(signIn, null);
  const message = state?.error ? copy.errors[state.error] ?? copy.errors.unavailable : null;

  return (
    <form action={action} className="max-w-md space-y-6" noValidate>
      <input type="hidden" name="lang" value={lang} />
      <div>
        <label htmlFor="portal-email" className="smallcaps block mb-2">
          {copy.email}
        </label>
        <input
          id="portal-email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          defaultValue={state?.email ?? ""}
          aria-invalid={message ? "true" : undefined}
          aria-describedby={message ? "portal-error" : undefined}
          className="field"
        />
      </div>
      <div>
        <label htmlFor="portal-password" className="smallcaps block mb-2">
          {copy.password}
        </label>
        <input
          id="portal-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={message ? "true" : undefined}
          aria-describedby={message ? "portal-error" : undefined}
          className="field"
        />
      </div>
      <p
        id="portal-error"
        role="alert"
        aria-live="polite"
        className="text-sm text-[var(--color-loss)] min-h-5"
      >
        {message}
      </p>
      <div className="flex flex-wrap items-center gap-6">
        <button type="submit" className="btn btn-gold" disabled={pending} aria-busy={pending}>
          <span>{pending ? copy.pending : copy.submit}</span>
        </button>
        <p className="text-sm text-[var(--color-ink-soft)]">
          {copy.forgotten}{" "}
          <Link href={`/${lang}/contact`} className="link-slide">
            {copy.forgottenLink}
          </Link>
        </p>
      </div>
    </form>
  );
}
