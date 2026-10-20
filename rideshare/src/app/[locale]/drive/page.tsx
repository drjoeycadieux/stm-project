import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { getDictionary } from "@/lib/i18n";
import { hasLocale, localePath } from "@/lib/i18n-config";
import { pageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "drive");
}

export default async function DrivePage({
  params,
}: PageProps<"/[locale]/drive">) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;
  const dict = await getDictionary(locale);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="rounded-3xl bg-ink-950 p-8 text-white sm:p-12">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {dict.drivePage.title}
        </h1>
        <p className="mt-3 max-w-2xl text-ink-300">{dict.drivePage.subtitle}</p>
        <Link
          href={localePath(locale, "/register")}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-500 px-7 py-3.5 font-semibold text-ink-950 transition-colors hover:bg-brand-400"
        >
          {dict.drivePage.cta}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-ink-100 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight text-ink-950">
            {dict.drivePage.requirements.title}
          </h2>
          <ul className="mt-5 space-y-3">
            {dict.drivePage.requirements.items.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-ink-600">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl bg-brand-500 p-6 text-ink-950 sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight">
            {dict.drivePage.earningsBox.title}
          </h2>
          <p className="mt-3 text-sm text-brand-900">{dict.drivePage.earningsBox.text}</p>
          <p className="mt-6 text-5xl font-semibold tracking-tight">
            {dict.drivePage.earningsBox.example}
          </p>
          <p className="mt-1 text-xs text-brand-900">
            {dict.drivePage.earningsBox.exampleNote}
          </p>
          <p className="mt-6 border-t border-brand-600/40 pt-4 text-sm font-medium text-brand-900">
            {dict.drivePage.earningsBox.weekly}
          </p>
        </div>
      </div>

      <ol className="mt-10 grid gap-5 sm:grid-cols-3">
        {dict.drivePage.steps.map((step, index) => (
          <li key={step.title} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-ink-100">
            <span className="text-sm font-bold text-brand-600">0{index + 1}</span>
            <h3 className="mt-2 font-semibold text-ink-950">{step.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{step.text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
