"use client";

import { useEffect, useState } from "react";
import { AvatarUpload } from "@/components/ui/file-upload";
import { useLive } from "./live-context";

/** Live mode: real profile photo upload (POST /files, purpose "avatar"), current photo from GET /me. */
export function ApplyPhoto({ firstName, lastName }: { firstName: string; lastName: string }) {
  const { call } = useLive()!;
  const [url, setUrl] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    call<{ avatarUrl: string | null }>("/me")
      .then((me) => !cancelled && setUrl(me.avatarUrl))
      .catch(() => !cancelled && setUrl(null));
    return () => {
      cancelled = true;
    };
  }, [call]);
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "?";
  return <AvatarUpload initialUrl={url ?? null} initials={initials} onUploaded={setUrl} />;
}
