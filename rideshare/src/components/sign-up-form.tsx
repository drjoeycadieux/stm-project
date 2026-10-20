"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { localePath, type Locale } from "@/lib/i18n-config";
import { Input } from "./sign-in-form";

export interface SignUpDict {
  title: string;
  subtitle: string;
  name: string;
  phone: string;
  email: string;
  password: string;
  passwordHint: string;
  submit: string;
  haveAccount: string;
  login: string;
  taken: string;
}

export function SignUpForm({
  locale,
  dict,
  next,
}: {
  locale: Locale;
  dict: SignUpDict;
  next?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"taken" | "invalid" | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, phone: phone || null }),
    });
    if (response.ok) {
      router.push(next && next.startsWith("/") ? next : `/${locale}`);
      router.refresh();
      return;
    }
    const data = await response.json().catch(() => ({}));
    setError(data.error === "email_taken" ? "taken" : "invalid");
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-3xl border border-ink-100 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-950">{dict.title}</h1>
        <p className="mt-1.5 text-sm text-ink-500">{dict.subtitle}</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Input label={dict.name} value={name} onChange={setName} autoComplete="name" required />
          <Input
            label={dict.phone}
            type="tel"
            value={phone}
            onChange={setPhone}
            autoComplete="tel"
            placeholder="+1 (514) 555-0100"
          />
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
            autoComplete="new-password"
            hint={dict.passwordHint}
            required
          />

          {error && (
            <p className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error === "taken" ? dict.taken : dict.passwordHint}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 py-3 font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {dict.submit}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-ink-500">
          {dict.haveAccount}{" "}
          <Link
            href={`${localePath(locale, "/login")}${next ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="font-semibold text-brand-700 hover:underline"
          >
            {dict.login}
          </Link>
        </p>
      </div>
    </div>
  );
}
