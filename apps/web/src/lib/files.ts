/**
 * Addresses of files stored by the API (server and client safe — no React, no "use client").
 * The API stores `/api/files/<id>`, relative to its own origin (NEXT_PUBLIC_API_URL without "/api").
 */
import { API_URL } from "./api";

/** Origin of the API (NEXT_PUBLIC_API_URL minus "/api"). */
export const API_ORIGIN = API_URL ? API_URL.replace(/\/api$/, "") : null;

/** Full address of a stored file: "/api/files/<id>" → "https://api…/api/files/<id>". Other http(s) URLs are kept. */
export function fileSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  if (url.startsWith("/") && API_ORIGIN) return `${API_ORIGIN}${url}`;
  return null;
}
