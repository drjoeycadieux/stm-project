"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { localePath, type Locale } from "@/lib/i18n-config";

export interface SignInDict {
  title: string;
  subtitle: string;
  email: string;
  password: string;
  submit: string;
  noAccount: string;
  register: string;
  invalid: string;
  demo: { title: string; text: string; rider: string; driver: string; fill: string };
}

export function SignInForm({
  locale,
  dict,
  next,
}: {
  locale: Locale;
  dict: SignInDict;
  next?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(false);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (response.ok) {
      router.push(next && next.startsWith("/") ? next : `/${locale}`);
      router.refresh();
      return;
    }
    setError(true);
    setBusy(false);
  }

  function fillDemo(value: string) {
    setEmail(value);
    setPassword("montreal1");
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-3xl border border-ink-100 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-950">{dict.title}</h1>
        <p className="mt-1.5 text-sm text-ink-500">{dict.subtitle}</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Input
            label={dict.email}
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            required
          />
          <Input
            label={dict.password}
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            required
          />

          {error && (
            <p className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {dict.invalid}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-ink-950 py-3 font-semibold text-white transition-colors hover:bg-ink-800 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {dict.submit}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-ink-500">
          {dict.noAccount}{" "}
          <Link
            href={`${localePath(locale, "/register")}${next ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="font-semibold text-brand-700 hover:underline"
          >
            {dict.register}
          </Link>
        </p>

        <div className="mt-6 rounded-2xl bg-ink-50 p-4">
          <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">
            {dict.demo.title}
          </p>
          <p className="mt-1.5 text-xs text-ink-500">{dict.demo.text}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <DemoChip label={dict.demo.rider} onClick={() => fillDemo("emma@rideshare.ca")} hint={dict.demo.fill} />
            <DemoChip label={dict.demo.driver} onClick={() => fillDemo("marc@rideshare.ca")} hint={dict.demo.fill} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function Input({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  placeholder,
  hint,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold tracking-wide text-ink-500 uppercase">
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-3 text-[15px] outline-none transition-colors placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
      {hint && <span className="mt-1 block text-xs text-ink-400">{hint}</span>}
    </label>
  );
}

function DemoChip({
  label,
  onClick,
  hint,
}: {
  label: string;
  onClick: () => void;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-700 transition-colors hover:border-brand-500 hover:text-brand-800"
    >
      {label}
      <span className="text-ink-400 group-hover:text-brand-600">({hint})</span>
    </button>
  );
}
