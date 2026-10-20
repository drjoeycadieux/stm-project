export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="12" className="fill-ink-950" />
      {/* Route winding through the island */}
      <path
        d="M9 29c6.5 0 5-9 11.5-9S26 11 31.5 11"
        stroke="var(--color-brand-500)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Pickup dot */}
      <circle cx="9" cy="29" r="3" fill="white" />
      {/* Destination pin */}
      <path
        d="M31.5 6.5c-2.3 0-4.2 1.9-4.2 4.2 0 3.1 4.2 6.8 4.2 6.8s4.2-3.7 4.2-6.8c0-2.3-1.9-4.2-4.2-4.2Z"
        fill="var(--color-brand-500)"
      />
      <circle cx="31.5" cy="10.7" r="1.5" className="fill-ink-950" />
    </svg>
  );
}
