/* eslint-disable @next/next/no-img-element -- avatars come from the API host, not optimised by next/image */
import { Avatar, type AvatarTone } from "@/components/ui/primitives";
import { API_URL } from "@/lib/api";
import type { TeacherRef } from "../_lib/types";

const tones: AvatarTone[] = ["teal", "sky", "lilac", "orange", "yellow", "sand"];

/** Resolves an avatar URL from the API ("/api/files/<id>" is relative to the API host). */
export function avatarSrc(url: string | null | undefined) {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  if (!API_URL) return null;
  try {
    return new URL(url, API_URL).href;
  } catch {
    return null;
  }
}

/** Teacher photo, or initials on a colour picked from the name. */
export function TeacherAvatar({ teacher, size = 48 }: { teacher: Pick<TeacherRef, "firstName" | "lastName" | "avatarUrl">; size?: number }) {
  const src = avatarSrc(teacher.avatarUrl);
  if (src) return <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  const initials = `${teacher.firstName.charAt(0)}${teacher.lastName.charAt(0)}`.toUpperCase();
  const tone = tones[(teacher.firstName.charCodeAt(0) + teacher.lastName.length) % tones.length];
  return <Avatar initials={initials || "?"} tone={tone} size={size} />;
}
