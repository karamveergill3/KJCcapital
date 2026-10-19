import test from "node:test";
import assert from "node:assert/strict";
import { isAuthConfigured, portalPath, readCredentials, signInFailure } from "../src/lib/portalAuth.js";

function form(fields) {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}

test("auth is configured only with both public values and an https URL", () => {
  assert.equal(isAuthConfigured({}), false);
  assert.equal(isAuthConfigured({ NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co" }), false);
  assert.equal(isAuthConfigured({ NEXT_PUBLIC_SUPABASE_ANON_KEY: "k" }), false);
  assert.equal(
    isAuthConfigured({ NEXT_PUBLIC_SUPABASE_URL: "http://x.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "k" }),
    false
  );
  assert.equal(
    isAuthConfigured({ NEXT_PUBLIC_SUPABASE_URL: "not a url", NEXT_PUBLIC_SUPABASE_ANON_KEY: "k" }),
    false
  );
  assert.equal(
    isAuthConfigured({ NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "k" }),
    true
  );
});

// The locale arrives in a form field, so a crafted value must not be able to
// send a signed-in client anywhere but the portal.
test("portal redirects stay on the site whatever the locale field says", () => {
  assert.equal(portalPath("en"), "/en/portal");
  assert.equal(portalPath("en", "/account"), "/en/portal/account");
  for (const hostile of ["//evil.example", "https://evil.example", "../..", "", null, undefined, "xx"]) {
    assert.equal(portalPath(hostile, "/account"), "/en/portal/account");
  }
});

test("credentials are trimmed, the address lower-cased, and blanks refused", () => {
  assert.deepEqual(readCredentials(form({ email: "  Client@Example.COM ", password: "pw" })), {
    email: "client@example.com",
    password: "pw"
  });
  assert.equal(readCredentials(form({ email: "a@b.c", password: "" })).error, "missing");
  assert.equal(readCredentials(form({ email: "", password: "pw" })).error, "missing");
  assert.equal(readCredentials(new FormData()).error, "missing");
});

test("a wrong password and an unknown address get the same answer", () => {
  assert.equal(signInFailure({ status: 400, code: "invalid_credentials" }), "mismatch");
  assert.equal(signInFailure({ status: 400, code: "user_not_found" }), "mismatch");
  assert.equal(signInFailure({ status: 400, code: "email_not_confirmed" }), "mismatch");
  assert.equal(signInFailure({ status: 429 }), "throttled");
  assert.equal(signInFailure({ code: "over_request_rate_limit", status: 400 }), "throttled");
  assert.equal(signInFailure({ status: 503 }), "unavailable");
  assert.equal(signInFailure({}), "unavailable");
  assert.equal(signInFailure(undefined), "unavailable");
});
