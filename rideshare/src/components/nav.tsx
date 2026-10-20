"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { localePath, type Locale } from "@/lib/i18n-config";
import { LanguageSwitcher } from "./language-switcher";
import { Logo } from "./logo";

export interface NavDict {
  howItWorks: string;
  pricing: string;
  safety: string;
  drive: string;
  ride: string;
  trips: string;
  driverDashboard: string;
  earnings: string;
  signIn: string;
  signUp: string;
  signOut: string;
  menu: string;
}

interface NavProps {
  locale: Locale;
  dict: NavDict;
  user: { name: string; isDriver: boolean } | null;
}

const primaryLinks = (dict: NavDict): { label: string; href: string }[] => [
  { label: dict.ride, href: "/ride" },
  { label: dict.pricing, href: "/pricing" },
  { label: dict.howItWorks, href: "/how-it-works" },
  { label: dict.safety, href: "/safety" },
  { label: dict.drive, href: "/drive" },
];

export function Nav({ locale, dict, user }: NavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const links = primaryLinks(dict);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(`/${locale}`);
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link
          href={localePath(locale)}
          className="flex shrink-0 items-center gap-2.5"
          onClick={() => setOpen(false)}
        >
          <Logo />
          <span className="text-[17px] font-semibold tracking-tight text-ink-950">
            RideShare<span className="text-brand-600"> LLC</span>
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 lg:flex">
          {links.map((link) => {
            const active = pathname === localePath(locale, link.href);
            return (
              <Link
                key={link.href}
                href={localePath(locale, link.href)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand-50 text-brand-800"
                    : "text-ink-700 hover:bg-ink-50 hover:text-ink-950"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher locale={locale} />

          {user ? (
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href={localePath(locale, "/trips")}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-50 hover:text-ink-950"
              >
                {dict.trips}
              </Link>
              {user.isDriver && (
                <Link
                  href={localePath(locale, "/driver")}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-50 hover:text-ink-950"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {dict.driverDashboard}
                </Link>
              )}
              <button
                onClick={signOut}
                title={dict.signOut}
                aria-label={dict.signOut}
                className="rounded-full border border-ink-200 p-2 text-ink-500 transition-colors hover:border-ink-300 hover:text-ink-950"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href={localePath(locale, "/login")}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-50 hover:text-ink-950"
              >
                {dict.signIn}
              </Link>
              <Link
                href={localePath(locale, "/register")}
                className="rounded-full bg-ink-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink-800"
              >
                {dict.signUp}
              </Link>
            </div>
          )}

          <button
            onClick={() => setOpen((value) => !value)}
            aria-label={dict.menu}
            aria-expanded={open}
            className="rounded-full border border-ink-200 p-2 text-ink-700 lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-ink-100 bg-white px-4 pb-4 pt-2 lg:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={localePath(locale, link.href)}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-ink-800 hover:bg-ink-50"
              >
                {link.label}
              </Link>
            ))}
            <div className="my-2 h-px bg-ink-100" />
            {user ? (
              <>
                <Link
                  href={localePath(locale, "/trips")}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm font-medium text-ink-800 hover:bg-ink-50"
                >
                  {dict.trips}
                </Link>
                {user.isDriver && (
                  <Link
                    href={localePath(locale, "/driver")}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-3 py-2.5 text-sm font-medium text-ink-800 hover:bg-ink-50"
                  >
                    {dict.driverDashboard}
                  </Link>
                )}
                <button
                  onClick={() => {
                    setOpen(false);
                    signOut();
                  }}
                  className="rounded-xl px-3 py-2.5 text-left text-sm font-medium text-ink-800 hover:bg-ink-50"
                >
                  {dict.signOut}
                </button>
              </>
            ) : (
              <>
                <Link
                  href={localePath(locale, "/login")}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm font-medium text-ink-800 hover:bg-ink-50"
                >
                  {dict.signIn}
                </Link>
                <Link
                  href={localePath(locale, "/register")}
                  onClick={() => setOpen(false)}
                  className="rounded-xl bg-ink-950 px-3 py-2.5 text-center text-sm font-semibold text-white"
                >
                  {dict.signUp}
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
