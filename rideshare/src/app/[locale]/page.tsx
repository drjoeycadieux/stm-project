import Link from "next/link";
import { ArrowRight, Car, ShieldCheck, Snowflake, Sparkles } from "lucide-react";
import { getDictionary } from "@/lib/i18n";
import { localePath, hasLocale } from "@/lib/i18n-config";
import { getPlace } from "@/lib/places";
import { estimateTrip, formatCAD } from "@/lib/pricing";
import { MontrealMap } from "@/components/montreal-map";

const FEATURE_ICONS = [Sparkles, Car, ShieldCheck, Snowflake];

const POPULAR_ROUTES = [
  { from: "plateau", to: "yul" },
  { from: "downtown", to: "old-montreal" },
  { from: "berri-uqam", to: "parc-jean-drapeau" },
];

export default async function LandingPage({
  params,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;
  const dict = await getDictionary(locale);

  const heroPickup = getPlace("plateau")!;
  const heroDropoff = getPlace("yul")!;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink-950 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, var(--color-brand-500) 0%, transparent 45%), radial-gradient(circle at 85% 10%, #38bdf8 0%, transparent 40%)",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-16 pb-20 sm:px-6 lg:grid-cols-2 lg:pt-24">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold tracking-wide text-brand-200 uppercase">
              {dict.hero.badge}
            </span>
            <h1 className="mt-5 text-4xl leading-[1.08] font-semibold tracking-tight sm:text-5xl lg:text-[3.4rem]">
              {dict.hero.title}
            </h1>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-300">
              {dict.hero.subtitle}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={localePath(locale, "/ride")}
                className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-7 py-3.5 font-semibold text-ink-950 transition-colors hover:bg-brand-400"
              >
                {dict.hero.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={localePath(locale, "/drive")}
                className="inline-flex items-center rounded-full border border-white/20 px-7 py-3.5 font-semibold text-white transition-colors hover:bg-white/10"
              >
                {dict.hero.secondaryCta}
              </Link>
            </div>

            <dl className="mt-12 grid max-w-md grid-cols-3 gap-6">
              {dict.hero.stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="text-2xl font-semibold tracking-tight text-white">
                    {stat.value}
                  </dt>
                  <dd className="mt-0.5 text-xs text-ink-400">{stat.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="animate-rise [animation-delay:120ms]">
            <MontrealMap
              pickup={heroPickup}
              dropoff={heroDropoff}
              animateCar
              travelSeconds={26}
              className="h-72 shadow-2xl shadow-brand-900/40 sm:h-96"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight text-ink-950">
          {dict.landing.features.title}
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {dict.landing.features.items.map((item, index) => {
            const Icon = FEATURE_ICONS[index % FEATURE_ICONS.length];
            return (
              <div
                key={item.title}
                className="rounded-3xl border border-ink-100 bg-white p-6 shadow-sm"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold text-ink-950">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{item.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Popular routes */}
      <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight text-ink-950">
          {dict.landing.routes.title}
        </h2>
        <p className="mt-1.5 text-ink-500">{dict.landing.routes.subtitle}</p>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {POPULAR_ROUTES.map((route) => {
            const from = getPlace(route.from)!;
            const to = getPlace(route.to)!;
            const price = estimateTrip(from, to, "economy").fare;
            return (
              <div
                key={`${route.from}-${route.to}`}
                className="flex flex-col rounded-3xl border border-ink-100 bg-white p-6 shadow-sm"
              >
                <p className="text-sm font-semibold text-ink-950">
                  {from.name[locale]}
                  <span className="mx-1.5 text-ink-300">→</span>
                  {to.name[locale]}
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-ink-950">
                  {formatCAD(price, locale)}
                </p>
                <Link
                  href={`${localePath(locale, "/ride")}?from=${route.from}&to=${route.to}`}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
                >
                  {dict.landing.routes.book}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight text-ink-950">
          {dict.landing.how.title}
        </h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {dict.landing.how.steps.map((step, index) => (
            <div key={step.title} className="relative rounded-3xl bg-white p-6 shadow-sm ring-1 ring-ink-100">
              <span className="text-sm font-bold text-brand-600">0{index + 1}</span>
              <h3 className="mt-2 font-semibold text-ink-950">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Safety + driver bands */}
      <section className="mx-auto mt-20 grid max-w-6xl gap-5 px-4 sm:px-6 lg:grid-cols-2">
        <div className="rounded-3xl bg-ink-950 p-8 text-white">
          <h2 className="text-2xl font-semibold tracking-tight">{dict.landing.safety.title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-300">
            {dict.landing.safety.text}
          </p>
          <Link
            href={localePath(locale, "/safety")}
            className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/20"
          >
            {dict.landing.safety.cta}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="rounded-3xl bg-brand-500 p-8 text-ink-950">
          <h2 className="text-2xl font-semibold tracking-tight">{dict.landing.drive.title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-brand-900">
            {dict.landing.drive.text}
          </p>
          <Link
            href={localePath(locale, "/drive")}
            className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-ink-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink-800"
          >
            {dict.landing.drive.cta}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </>
  );
}
