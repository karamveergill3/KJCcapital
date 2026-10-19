// The library's defaults leave Secure off and let page scripts read the
// session. The site is HTTPS-only, and every sign-in, sign-out and session
// check runs on the server, so the cookie is Secure in production and never
// readable from the browser. A browser-side Supabase client would need
// httpOnly relaxed first.
export const COOKIE_OPTIONS = {
  secure: process.env.NODE_ENV === "production",
  httpOnly: true
};
