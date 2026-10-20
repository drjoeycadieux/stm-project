"use client";

import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/i18n-config";
import { stripLocale } from "@/lib/i18n-config";
import { switchLocale } from "@/lib/locale-actions";

const OPTIONS: { locale: Locale; label: string }[] = [
  { locale: "en", label: "EN" },
  { locale: "fr", label: "FR" },
];

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname() ?? "/";
  const rest = stripLocale(pathname);

  return (
    <div
      className="flex items-center rounded-full border border-ink-200 bg-white p-0.5"
      role="group"
      aria-label="Language"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.locale}
          onClick={() => switchLocale(option.locale, rest)}
          aria-pressed={option.locale === locale}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
            option.locale === locale
              ? "bg-ink-950 text-white"
              : "text-ink-500 hover:text-ink-950"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
