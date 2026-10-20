import { NextResponse, type NextRequest } from "next/server";
import { hasLocale, locales, negotiateLocale } from "@/lib/i18n-config";

/**
 * Redirects locale-less requests, e.g. /ride -> /en/ride, using the
 * visitor's saved preference (cookie) or their Accept-Language header.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const pathnameHasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (pathnameHasLocale) return;

  const saved = request.cookies.get("rs_locale")?.value;
  const locale = saved && hasLocale(saved) ? saved : negotiateLocale(request.headers.get("accept-language"));

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip API routes, Next internals, and any path with a file extension.
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
