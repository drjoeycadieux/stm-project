import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n";
import { hasLocale } from "@/lib/i18n-config";
import { pageMetadata } from "@/lib/page-metadata";
import { SignInForm } from "@/components/sign-in-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "login");
}

export default async function LoginPage({
  params,
  searchParams,
}: PageProps<"/[locale]/login">) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;
  const dict = await getDictionary(locale);
  const query = await searchParams;

  return (
    <div className="px-4 py-16 sm:px-6">
      <SignInForm
        locale={locale}
        next={typeof query.next === "string" ? query.next : undefined}
        dict={{
          title: dict.auth.login.title,
          subtitle: dict.auth.login.subtitle,
          email: dict.auth.login.email,
          password: dict.auth.login.password,
          submit: dict.auth.login.submit,
          noAccount: dict.auth.login.noAccount,
          register: dict.auth.login.register,
          invalid: dict.auth.login.invalid,
          demo: dict.auth.demo,
        }}
      />
    </div>
  );
}
