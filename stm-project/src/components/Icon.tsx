import type { ReactNode } from 'react';

interface IconProps {
  name:
    | 'bus'
    | 'search'
    | 'close'
    | 'locate'
    | 'refresh'
    | 'alert'
    | 'clock'
    | 'chevron'
    | 'stop'
    | 'route'
    | 'arrow';
  size?: number;
  className?: string;
}

const paths: Record<IconProps['name'], ReactNode> = {
  bus: (
    <path
      d="M5 5.5A2.5 2.5 0 0 1 7.5 3h9A2.5 2.5 0 0 1 19 5.5v9a1.5 1.5 0 0 1-1.5 1.5H18v2h-2.5v-2h-7v2H6v-2h-.5A1.5 1.5 0 0 1 4 14.5v-9Zm1.5.5v5.5h11V6h-11Zm1 8.75a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Zm9 0a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z"
      fill="currentColor"
      stroke="none"
    />
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  locate: (
    <>
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 1 0-2.4 6.1" />
      <path d="M20 4v7h-7" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.5 21 20H3L12 3.5Z" />
      <path d="M12 9.5v4.5" />
      <circle cx="12" cy="17" r=".9" fill="currentColor" stroke="none" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  chevron: <path d="m9 5 7 7-7 7" />,
  stop: (
    <>
      <path d="M12 21s6-5.4 6-10a6 6 0 1 0-12 0c0 4.6 6 10 6 10Z" />
      <circle cx="12" cy="11" r="2.2" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="6" r="2.2" />
      <circle cx="18" cy="18" r="2.2" />
      <path d="M8 6h5a3 3 0 0 1 3 3v6" />
    </>
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
};

export function Icon({ name, size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}
