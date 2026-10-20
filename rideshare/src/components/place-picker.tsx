"use client";

import { useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import { PLACES, type Place, type PlaceCategory } from "@/lib/places";

const CATEGORY_ICON: Record<PlaceCategory, string> = {
  airport: "✈",
  station: "🚇",
  district: "▦",
  landmark: "★",
};

interface PlacePickerProps {
  locale: Locale;
  label: string;
  placeholder: string;
  value: Place | null;
  onChange: (place: Place) => void;
  /** Places that should not be selectable, e.g. the other end of the trip. */
  exclude?: string;
}

export function PlacePicker({
  locale,
  label,
  placeholder,
  value,
  onChange,
  exclude,
}: PlacePickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return PLACES.filter((place) => {
      if (place.id === exclude) return false;
      if (!needle) return true;
      return (
        place.name.en.toLowerCase().includes(needle) ||
        place.name.fr.toLowerCase().includes(needle) ||
        place.hint.en.toLowerCase().includes(needle) ||
        place.hint.fr.toLowerCase().includes(needle)
      );
    }).slice(0, 8);
  }, [query, exclude]);

  function select(place: Place) {
    onChange(place);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative">
      <label className="mb-1.5 block text-xs font-semibold tracking-wide text-ink-500 uppercase">
        {label}
      </label>

      <div className="relative">
        <MapPin className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-brand-600" />
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="place-results"
          autoComplete="off"
          value={open ? query : value ? value.name[locale] : ""}
          placeholder={placeholder}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onBlur={() => {
            // Give option clicks a chance to register.
            blurTimer.current = setTimeout(() => setOpen(false), 150);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && results.length > 0) {
              event.preventDefault();
              select(results[0]);
            }
            if (event.key === "Escape") setOpen(false);
          }}
          className="w-full rounded-xl border border-ink-200 bg-white py-3 pr-3 pl-9 text-[15px] text-ink-950 outline-none transition-colors placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </div>

      {open && (
        <ul
          id="place-results"
          className="absolute z-20 mt-1.5 max-h-72 w-full overflow-auto rounded-xl border border-ink-100 bg-white py-1.5 shadow-lg shadow-ink-950/5"
        >
          {results.length === 0 && (
            <li className="px-4 py-3 text-sm text-ink-400">—</li>
          )}
          {results.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  if (blurTimer.current) clearTimeout(blurTimer.current);
                  select(place);
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-brand-50"
              >
                <span className="w-5 text-center text-sm text-ink-400">
                  {CATEGORY_ICON[place.category]}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink-950">
                    {place.name[locale]}
                  </span>
                  <span className="block truncate text-xs text-ink-500">
                    {place.hint[locale]}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


