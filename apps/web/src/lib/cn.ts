import { extendTailwindMerge } from "tailwind-merge";

/** Brand color tokens (see globals.css) so tailwind-merge doesn't mistake them for font sizes. */
const colors = [
  "navy", "navy-soft", "navy-deep", "ink-soft", "teal", "teal-dark", "teal-deep", "teal-50", "teal-100", "teal-200",
  "orange", "orange-100", "orange-dark", "orange-text", "cream", "yellow", "beige", "beige-2", "muted", "sand", "line",
  "line-soft", "sky-100", "sky", "lilac-100", "lilac", "danger", "danger-100", "danger-text", "online",
];

const twMerge = extendTailwindMerge({
  extend: { theme: { color: colors, font: ["display", "hand", "serif"] } },
});

/** Join class names, skipping falsy values; later Tailwind classes override earlier conflicting ones. */
export function cn(...parts: Array<string | false | null | undefined>) {
  return twMerge(parts.filter(Boolean).join(" "));
}
