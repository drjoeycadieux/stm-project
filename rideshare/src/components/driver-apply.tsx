"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";

export interface DriverApplyDict {
  carModel: string;
  color: string;
  plate: string;
  submit: string;
  errorText: string;
}

export function DriverApplyForm({ dict }: { dict: DriverApplyDict }) {
  const router = useRouter();
  const [carModel, setCarModel] = useState("");
  const [color, setColor] = useState("");
  const [plate, setPlate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(false);
    const response = await fetch("/api/driver/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carModel, color, plate }),
    });
    if (response.ok) {
      router.refresh();
    } else {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label={dict.carModel}
          value={carModel}
          onChange={setCarModel}
          placeholder="Toyota Camry"
          required
        />
        <Field
          label={dict.color}
          value={color}
          onChange={setColor}
          placeholder="Graphite"
          required
        />
        <Field
          label={dict.plate}
          value={plate}
          onChange={setPlate}
          placeholder="ABC-1234"
          required
        />
      </div>

      {error && (
        <p className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          {dict.errorText}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="rounded-full bg-brand-600 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
      >
        {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : dict.submit}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold tracking-wide text-ink-500 uppercase">
        {label}
      </span>
      <input
        type="text"
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-3 text-[15px] outline-none transition-colors placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}
