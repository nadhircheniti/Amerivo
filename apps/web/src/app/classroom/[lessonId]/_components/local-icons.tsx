import type { SVGProps } from "react";

/** Classroom-only icons missing from the shared set (same 24×24 thin-line style). */
const paths = {
  micOff: (
    <>
      <path d="M15 9.5V6a3 3 0 0 0-5.7-1.3M9 9v2a3 3 0 0 0 4.9 2.3" />
      <path d="M5 11a7 7 0 0 0 11.6 5.3M19 11a7 7 0 0 1-.6 2.8M12 18v3M3 3l18 18" />
    </>
  ),
  videoOff: (
    <>
      <path d="M16 13.5V16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2M10 6h4a2 2 0 0 1 2 2v2l6-3v10" />
      <path d="M3 3l18 18" />
    </>
  ),
  send: <path d="M4 12l16-8-6 16-2.5-6.5z" />,
  upload: <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />,
} as const;

export function LocalIcon({ name, size = 22, ...rest }: { name: keyof typeof paths; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}
