import Link from "next/link";
import { MapPin, Phone } from "lucide-react";
import { localePath, type Locale } from "@/lib/i18n-config";
import { Logo } from "./logo";

interface FooterProps {
  locale: Locale;
  tagline: string;
  product: string;
  company: string;
  support: string;
  contact: string;
  address: string;
  rights: string;
  links: {
    howItWorks: string;
    pricing: string;
    ride: string;
    safety: string;
    drive: string;
  };
}

export function Footer({
  locale,
  tagline,
  product,
  company,
  support,
  contact,
  address,
  rights,
  links,
}: FooterProps) {
  return (
    <footer className="mt-16 border-t border-ink-100 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="text-[17px] font-semibold tracking-tight text-ink-950">
              RideShare<span className="text-brand-600"> LLC</span>
            </span>
          </div>
          <p className="mt-3 text-sm text-ink-500">{tagline}</p>
          <p className="mt-4 flex items-start gap-2 text-sm text-ink-500">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            {address}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-ink-950">{product}</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-500">
            <li>
              <Link href={localePath(locale, "/ride")} className="hover:text-ink-950">
                {links.ride}
              </Link>
            </li>
            <li>
              <Link
                href={localePath(locale, "/pricing")}
                className="hover:text-ink-950"
              >
                {links.pricing}
              </Link>
            </li>
            <li>
              <Link
                href={localePath(locale, "/how-it-works")}
                className="hover:text-ink-950"
              >
                {links.howItWorks}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-ink-950">{company}</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-500">
            <li>
              <Link href={localePath(locale, "/drive")} className="hover:text-ink-950">
                {links.drive}
              </Link>
            </li>
            <li>
              <Link href={localePath(locale, "/safety")} className="hover:text-ink-950">
                {links.safety}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-ink-950">{support}</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-500">
            <li>
              <a
                href={`tel:${contact.replace(/[^0-9+]/g, "")}`}
                className="flex items-center gap-2 hover:text-ink-950"
              >
                <Phone className="h-4 w-4 text-brand-600" />
                {contact}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ink-100 py-5">
        <p className="mx-auto max-w-6xl px-4 text-xs text-ink-400 sm:px-6">{rights}</p>
      </div>
    </footer>
  );
}
