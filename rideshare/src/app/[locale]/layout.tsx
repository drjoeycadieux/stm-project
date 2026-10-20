import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { hasLocale, locales } from "@/lib/i18n-config";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: {
      default: dict.meta.title,
      template: "%s · RideShare LLC",
    },
    description: dict.meta.description,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  const dict = await getDictionary(locale);
  const user = await getCurrentUser();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-screen flex-col bg-background text-foreground">
        <Nav
          locale={locale}
          dict={{
            howItWorks: dict.nav.howItWorks,
            pricing: dict.nav.pricing,
            safety: dict.nav.safety,
            drive: dict.nav.drive,
            ride: dict.nav.ride,
            trips: dict.nav.trips,
            driverDashboard: dict.nav.driverDashboard,
            earnings: dict.nav.earnings,
            signIn: dict.nav.signIn,
            signUp: dict.nav.signUp,
            signOut: dict.nav.signOut,
            menu: dict.nav.menu,
          }}
          user={
            user
              ? {
                  name: user.name,
                  isDriver: Boolean(user.driver),
                }
              : null
          }
        />
        <main className="flex-1">{children}</main>
        <Footer
          locale={locale}
          tagline={dict.footer.tagline}
          product={dict.footer.product}
          company={dict.footer.company}
          support={dict.footer.support}
          contact={dict.footer.contact}
          address={dict.footer.address}
          rights={dict.footer.rights}
          links={{
            howItWorks: dict.nav.howItWorks,
            pricing: dict.nav.pricing,
            ride: dict.nav.ride,
            safety: dict.nav.safety,
            drive: dict.nav.drive,
          }}
        />
      </body>
    </html>
  );
}
