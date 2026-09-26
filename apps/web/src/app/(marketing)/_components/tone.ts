import type { AvatarTone } from "@/components/ui/primitives";

/** Large initials tiles (teacher cards) — same pairings as the Avatar tones. */
export const toneTile: Record<AvatarTone, string> = {
  teal: "bg-teal-100 text-teal-dark",
  orange: "bg-orange-100 text-orange-dark",
  sky: "bg-sky-100 text-sky",
  lilac: "bg-lilac-100 text-lilac",
  yellow: "bg-yellow text-navy",
  sand: "bg-sand text-navy",
  navy: "bg-navy-soft text-white",
};

/** Formats a USD amount without trailing ".00" (e.g. $35, $166.25). */
export function shortUsd(n: number) {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

export const tzLongName: Record<string, string> = {
  EST: "Eastern Time",
  CST: "Central Time",
  MST: "Mountain Time",
  PST: "Pacific Time",
};
