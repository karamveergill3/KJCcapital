"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAuthConfigured, portalPath, readCredentials, signInFailure } from "@/lib/portalAuth";

// Returns a message key for the form, or redirects on success. Nothing here
// takes a destination from the caller: a signed-in client always lands on the
// account page, so the form cannot be turned into an open redirect.
export async function signIn(_previous, formData) {
  const lang = formData.get("lang");
  if (!isAuthConfigured()) return { error: "notOpen" };

  const credentials = readCredentials(formData);
  if (credentials.error) return { error: credentials.error, email: credentials.email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials);
  if (error) return { error: signInFailure(error), email: credentials.email };

  redirect(portalPath(lang, "/account"));
}

export async function signOut(formData) {
  const lang = formData.get("lang");
  if (isAuthConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect(portalPath(lang));
}
