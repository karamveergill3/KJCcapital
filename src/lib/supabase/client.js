"use client";

import { createBrowserClient } from "@supabase/ssr";

let cached;

export function createClient() {
  if (cached) return cached;
  cached = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  return cached;
}
