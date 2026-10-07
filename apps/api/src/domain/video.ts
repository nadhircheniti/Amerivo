/**
 * Teacher introduction videos: only YouTube, Vimeo, Loom and Google Drive links are accepted,
 * because they can be embedded in the profile page (any other link would send visitors to an
 * outside website, which the Terms of Service forbid as a way of sharing contact details).
 */

const YT_ID = /^[A-Za-z0-9_-]{6,20}$/;

/** Player URL for a YouTube, Vimeo, Loom or Google Drive page URL, or null when the link can't be embedded. */
export function videoEmbedUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, "");
  const parts = url.pathname.split("/").filter(Boolean);
  const yt = (id: string | null | undefined) => (id && YT_ID.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null);

  if (host === "youtu.be") return yt(parts[0]);
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (parts[0] === "watch") return yt(url.searchParams.get("v"));
    if (parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live") return yt(parts[1]);
    return null;
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    // vimeo.com/123456, vimeo.com/123456/abcdef (unlisted hash), player.vimeo.com/video/123456?h=abcdef
    const i = parts.findIndex((p) => /^\d+$/.test(p));
    if (i < 0) return null;
    const next = parts[i + 1];
    const hash = url.searchParams.get("h") ?? (next && /^[a-f0-9]+$/i.test(next) ? next : null);
    return `https://player.vimeo.com/video/${parts[i]}${hash ? `?h=${encodeURIComponent(hash)}` : ""}`;
  }
  if (host === "loom.com") {
    // loom.com/share/<id> or loom.com/embed/<id>
    const id = (parts[0] === "share" || parts[0] === "embed") && parts[1] && /^[a-f0-9]{16,64}$/i.test(parts[1]) ? parts[1] : null;
    return id ? `https://www.loom.com/embed/${id}` : null;
  }
  if (host === "drive.google.com") {
    // drive.google.com/file/d/<id>/view (the file must be shared with "anyone with the link")
    const id = parts[0] === "file" && parts[1] === "d" && parts[2] && /^[A-Za-z0-9_-]{10,100}$/.test(parts[2]) ? parts[2] : null;
    return id ? `https://drive.google.com/file/d/${id}/preview` : null;
  }
  return null;
}
