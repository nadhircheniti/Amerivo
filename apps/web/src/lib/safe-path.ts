/**
 * Where to go after a redirect parameter (?next=…): only a path on this site. Protocol-relative
 * paths ("//evil.example"), backslashes (browsers treat "/\evil.example" like "//evil.example")
 * and control characters fall back to `fallback`.
 */
export function safePath(p: string | null, origin: string, fallback = "/welcome") {
  if (!p || !p.startsWith("/") || /[\\\u0000-\u001f]/.test(p)) return fallback;
  try {
    const url = new URL(p, origin);
    if (url.origin !== origin || url.pathname.startsWith("/accept-terms")) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
