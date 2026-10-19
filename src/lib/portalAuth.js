import { defaultLocale, isLocale } from "@/lib/i18n/config";

/**
 * Sign-in needs a Supabase project, and the site has none connected yet. Until
 * both public values are set the portal still renders its form, and a submit
 * answers that the portal is not open rather than failing on a missing URL.
 */
export function isAuthConfigured(env = process.env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Where a portal redirect lands. The locale comes from a form field, so it is
 * checked against the known locales; anything else falls back to the default,
 * which keeps every redirect on a fixed path inside the site.
 */
export function portalPath(lang, sub = "") {
  const locale = isLocale(lang) ? lang : defaultLocale;
  return `/${locale}/portal${sub}`;
}

export function readCredentials(formData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "missing", email };
  return { email, password };
}

/**
 * Maps a Supabase auth error to a message key in portal.signIn.errors. A wrong
 * password and an unknown address get the same answer, so the form cannot be
 * used to find out who is a client.
 */
export function signInFailure(error) {
  const status = Number(error?.status);
  const code = String(error?.code ?? "");
  if (status === 429 || code === "over_request_rate_limit") return "throttled";
  if (status >= 500 || !status) return "unavailable";
  return "mismatch";
}
