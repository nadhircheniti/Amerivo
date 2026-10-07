/**
 * Talking to the Amerivo API (apps/api).
 *
 * - NEXT_PUBLIC_API_URL not set → the site runs in demo mode on the sample data in mock-data.ts.
 * - Server components use `apiGet`, which never throws: on any error or timeout it returns null so
 *   pages can fall back to sample data (the free Render plan sleeps and can take ~1 min to wake up).
 * - Client components call `apiFetch` with a token getter (Clerk) — see use-api.ts.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || null;

/** Local development only: act as a seeded user through the API's DEV_AUTH shortcut. */
export const DEV_USER = process.env.NEXT_PUBLIC_DEV_USER || null;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    /** Machine-readable reason sent by the API in `error` (e.g. "terms_required"). */
    public code?: string,
  ) {
    super(message);
  }
}

/** The API refuses students and teachers who haven't accepted the current Terms of Service. */
export const TERMS_REQUIRED = "terms_required";

/** Server-side GET with a timeout; returns null instead of throwing. Cached for `revalidate` seconds. */
export async function apiGet<T>(path: string, { revalidate = 60, timeoutMs = 8000 }: { revalidate?: number | false; timeoutMs?: number } = {}): Promise<T | null> {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}${path}`, {
      signal: AbortSignal.timeout(timeoutMs),
      ...(revalidate === false ? { cache: "no-store" as const } : { next: { revalidate } }),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Client-side call. Throws ApiError with the API's message so forms can display it. */
export async function apiFetch<T>(path: string, init: RequestInit & { token?: string | null } = {}): Promise<T> {
  if (!API_URL) throw new ApiError(0, "The booking service is not connected yet (demo mode).");
  const { token, headers, ...rest } = init;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(!token && DEV_USER ? { "x-dev-user": DEV_USER } : {}),
      ...headers,
    },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let code: string | undefined;
    try {
      const body = await res.json();
      message = Array.isArray(body.message) ? body.message.join(", ") : body.message || message;
      code = typeof body.error === "string" && body.error === TERMS_REQUIRED ? TERMS_REQUIRED : undefined;
    } catch {
      /* not JSON */
    }
    throw new ApiError(res.status, message, code);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}
