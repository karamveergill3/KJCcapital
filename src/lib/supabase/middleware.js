import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { COOKIE_OPTIONS } from "@/lib/supabase/cookies";

// Server Components cannot write cookies, so a session whose access token has
// expired is refreshed here, before the page renders, and the new cookies go
// out on the response. Only portal routes pay for the round trip.
export async function refreshSession(request) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookieOptions: COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        }
      }
    }
  );
  await supabase.auth.getUser();
  return response;
}
