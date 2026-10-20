import type en from "@/messages/en.json";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "./i18n-config";

export type Dictionary = typeof en;

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("@/messages/en.json").then((m) => m.default),
  fr: () => import("@/messages/fr.json").then((m) => m.default),
};

export async function getDictionary(locale: string): Promise<Dictionary> {
  if (!hasLocale(locale)) notFound();
  return dictionaries[locale]();
}
