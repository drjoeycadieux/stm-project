import Link from "next/link";
import { cookies } from "next/headers";
import { getDictionary } from "@/lib/i18n";
import { hasLocale, localePath } from "@/lib/i18n-config";

export default async function NotFound() {
  const cookieStore = await cookies();
  const saved = cookieStore.get("rs_locale")?.value ?? "";
  const locale = hasLocale(saved) ? saved : "en";
  const dict = await getDictionary(locale);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center sm:px-6">
      <p className="text-7xl font-semibold tracking-tight text-ink-200">404</p>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink-950">
        {dict.notFound.title}
      </h1>
      <p className="mt-2 text-ink-500">{dict.notFound.text}</p>
      <Link
        href={localePath(locale)}
        className="mt-8 rounded-full bg-ink-950 px-7 py-3 font-semibold text-white transition-colors hover:bg-ink-800"
      >
        {dict.notFound.cta}
      </Link>
    </div>
  );
}
