"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasLocale, localePath } from "./i18n-config";

/** Saves the visitor's language choice and reloads the current page in it. */
export async function switchLocale(locale: string, path: string): Promise<void> {
  if (!hasLocale(locale)) return;

  const cookieStore = await cookies();
  cookieStore.set("rs_locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  redirect(localePath(locale, path));
}
