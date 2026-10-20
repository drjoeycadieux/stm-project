import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Eye, IdCard, ShieldCheck, Star } from "lucide-react";
import { getDictionary } from "@/lib/i18n";
import { hasLocale, localePath } from "@/lib/i18n-config";
import { pageMetadata } from "@/lib/page-metadata";

const ICONS = [IdCard, Eye, Star, ShieldCheck];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "safety");
}

export default async function SafetyPage({
  params,
}: PageProps<"/[locale]/safety">) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;
  const dict = await getDictionary(locale);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
        {dict.safetyPage.title}
      </h1>
      <p className="mt-2 text-ink-500">{dict.safetyPage.subtitle}</p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {dict.safetyPage.items.map((item, index) => {
          const Icon = ICONS[index % ICONS.length];
          return (
            <div
              key={item.title}
              className="rounded-3xl border border-ink-100 bg-white p-6 shadow-sm"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 font-semibold text-ink-950">{item.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{item.text}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-10 rounded-3xl bg-ink-950 p-8 text-center text-white">
        <Link
          href={localePath(locale, "/ride")}
          className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-7 py-3.5 font-semibold text-ink-950 transition-colors hover:bg-brand-400"
        >
          {dict.safetyPage.cta}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
