import { NextResponse } from "next/server";
import { defaultLocale, locales } from "@/lib/i18n/config";
import { isAuthConfigured } from "@/lib/portalAuth";
import { refreshSession } from "@/lib/supabase/middleware";

const PUBLIC_FILE = /\.(?:ico|png|jpg|jpeg|gif|svg|webp|avif|txt|xml|pdf|css|js|map|woff2?)$/i;
const PORTAL = /^\/[a-z]{2}\/portal(?:\/|$)/;

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const first = pathname.split("/")[1];
  if (locales.includes(first)) {
    if (PORTAL.test(pathname) && isAuthConfigured()) return refreshSession(request);
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"]
};
