import { Avatar, type AvatarTone } from "@/components/ui/primitives";
import { API_URL } from "@/lib/api";
import type { ApiPerson } from "./types";

const tones: AvatarTone[] = ["teal", "orange", "sky", "lilac", "yellow", "navy"];

/** Stable avatar color for a person id. */
export function toneFor(id: string): AvatarTone {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return tones[h % tones.length];
}

export const initialsOf = (p: Pick<ApiPerson, "firstName" | "lastName">) => `${p.firstName.charAt(0)}${p.lastName.charAt(0)}`.toUpperCase();
export const fullName = (p: Pick<ApiPerson, "firstName" | "lastName">) => `${p.firstName} ${p.lastName}`.trim();

/** Uploaded avatars are served by the API (`/api/files/<id>`); absolute URLs pass through. */
function resolveUrl(url: string) {
  if (/^https?:\/\//.test(url) || !API_URL) return url;
  try {
    return new URL(url, API_URL).href;
  } catch {
    return url;
  }
}

export function PersonAvatar({ person, size = 48 }: { person: ApiPerson; size?: number }) {
  if (person.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- user uploads served by the API, sizes vary
      <img src={resolveUrl(person.avatarUrl)} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
    );
  }
  return <Avatar initials={initialsOf(person)} tone={toneFor(person.id)} size={size} />;
}
