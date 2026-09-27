/**
 * WEB_URL is a comma-separated list of allowed origins. "*" matches one DNS label part, so
 * Vercel preview deployments can be allowed, e.g.
 *   https://amerivo-api.vercel.app,https://amerivo-api-*.vercel.app
 */
export function corsOrigins(list: string): (string | RegExp)[] {
  return list
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean)
    .map((o) => (o.includes("*") ? new RegExp(`^${o.split("*").map(escape).join("[a-z0-9-]*")}$`) : o));
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
