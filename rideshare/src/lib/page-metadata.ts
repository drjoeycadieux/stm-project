import type { Metadata } from "next";
import { getDictionary } from "./i18n";
import { hasLocale } from "./i18n-config";

/** Keys of the `meta.pages` dictionary, one per route with its own title. */
export type PageTitleKey = "ride" | "trips" | "login" | "register" | "driver" | "earnings" | "pricing" | "safety" | "how" | "drive";

/**
 * Per-page metadata. The locale layout supplies the `"%s · RideShare LLC"`
 * title template and the site-wide description.
 */
export async function pageMetadata(locale: string, key: PageTitleKey): Promise<Metadata> {
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.meta.pages[key] };
}
