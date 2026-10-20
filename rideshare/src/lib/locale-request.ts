import { cookies } from "next/headers";
import { defaultLocale, hasLocale, type Locale } from "./i18n-config";

/** Locale saved by the visitor's language switcher, or the negotiated default. */
export async function requestLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const saved = cookieStore.get("rs_locale")?.value ?? "";
  return hasLocale(saved) ? saved : defaultLocale;
}
