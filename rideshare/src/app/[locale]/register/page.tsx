import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n";
import { hasLocale } from "@/lib/i18n-config";
import { pageMetadata } from "@/lib/page-metadata";
import { SignUpForm } from "@/components/sign-up-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "register");
}

export default async function RegisterPage({
  params,
  searchParams,
}: PageProps<"/[locale]/register">) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;
  const dict = await getDictionary(locale);
  const query = await searchParams;

  return (
    <div className="px-4 py-16 sm:px-6">
      <SignUpForm
        locale={locale}
        next={typeof query.next === "string" ? query.next : undefined}
        dict={{
          title: dict.auth.register.title,
          subtitle: dict.auth.register.subtitle,
          name: dict.auth.register.name,
          phone: dict.auth.register.phone,
          email: dict.auth.register.email,
          password: dict.auth.register.password,
          passwordHint: dict.auth.register.passwordHint,
          submit: dict.auth.register.submit,
          haveAccount: dict.auth.register.haveAccount,
          login: dict.auth.register.login,
          taken: dict.auth.register.taken,
        }}
      />
    </div>
  );
}
