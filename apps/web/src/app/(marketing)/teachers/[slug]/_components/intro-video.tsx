"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";

/**
 * Teacher introduction video (player URL checked by the API: YouTube, Vimeo, Loom, Google Drive).
 * The player is only loaded when the visitor presses Play: no third-party requests or cookies
 * before that, and a fast profile page.
 */
export function IntroVideo({ embedUrl, playLabel, caption, title }: { embedUrl: string; playLabel: string; caption: string; title: string }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    const src = `${embedUrl}${embedUrl.includes("?") ? "&" : "?"}autoplay=1`;
    return (
      <iframe
        src={src}
        title={title}
        className="absolute inset-0 size-full border-0"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    );
  }
  return (
    <>
      <div aria-hidden="true" className="absolute -end-20 -top-20 size-[280px] rounded-full bg-teal opacity-25" />
      <div aria-hidden="true" className="absolute -start-[60px] -bottom-[100px] size-[260px] rounded-full bg-orange opacity-25" />
      <button
        type="button"
        aria-label={playLabel}
        onClick={() => setPlaying(true)}
        className="relative flex size-[88px] items-center justify-center rounded-full bg-orange text-navy hover:bg-[#ffa64d] focus-visible:ring-3 focus-visible:ring-white"
      >
        <Icon name="play" size={34} />
      </button>
      <span className="absolute start-7 end-7 bottom-6 text-[15px] font-semibold text-white">{caption}</span>
    </>
  );
}
