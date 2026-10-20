import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getDictionary } from "@/lib/i18n";
import { hasLocale, localePath } from "@/lib/i18n-config";
import { pageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "how");
}

export default async function HowItWorksPage({
  params,
}: PageProps<"/[locale]/how-it-works">) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;
  const dict = await getDictionary(locale);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
        {dict.howPage.title}
      </h1>
      <p className="mt-2 text-ink-500">{dict.howPage.subtitle}</p>

      <ol className="mt-10 grid gap-5 sm:grid-cols-2">
        {dict.howPage.steps.map((step, index) => (
          <li
            key={step.title}
            className="rounded-3xl border border-ink-100 bg-white p-6 shadow-sm"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-950 text-sm font-bold text-white">
              {index + 1}
            </span>
            <h2 className="mt-4 font-semibold text-ink-950">{step.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{step.text}</p>
          </li>
        ))}
      </ol>

      <div className="mt-10">
        <Link
          href={localePath(locale, "/ride")}
          className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-7 py-3.5 font-semibold text-white transition-colors hover:bg-brand-700"
        >
          {dict.howPage.cta}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
