"use client";

import { useState, type ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { ClassroomLesson } from "../_data";
import { LocalIcon } from "./local-icons";
import { SidePanel } from "./side-panel";
import { VideoStage } from "./video-stage";

/** Stage + call controls + side panel. Owns the media toggle state shared by stage and controls. */
export function ClassroomShell({ lesson }: { lesson: ClassroomLesson }) {
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [board, setBoard] = useState(false);

  return (
    <div className="flex flex-1 flex-col gap-4 px-3 pt-4 sm:px-4 lg:min-h-0 lg:flex-row">
      {/* Stage */}
      <div className="flex min-w-0 flex-1 flex-col gap-3 lg:min-h-0">
        <VideoStage lesson={lesson} mode={board ? "board" : "video"} micMuted={micMuted} cameraOff={cameraOff} sharing={sharing} />

        {/* Controls */}
        <div role="toolbar" aria-label="Call controls" className="flex min-h-[92px] shrink-0 flex-wrap items-center justify-center gap-3 py-3">
          <ToggleControl label="Mute microphone" pressed={micMuted} onToggle={() => setMicMuted((v) => !v)} activeTone="danger">
            {micMuted ? <LocalIcon name="micOff" /> : <Icon name="mic" size={22} />}
          </ToggleControl>
          <ToggleControl label="Turn camera off" pressed={cameraOff} onToggle={() => setCameraOff((v) => !v)} activeTone="danger">
            {cameraOff ? <LocalIcon name="videoOff" /> : <Icon name="video" size={22} />}
          </ToggleControl>
          <ToggleControl label="Share screen" pressed={sharing} onToggle={() => setSharing((v) => !v)} activeTone="accent">
            <Icon name="screen" size={22} />
          </ToggleControl>
          <button
            type="button"
            aria-pressed={board}
            onClick={() => setBoard((v) => !v)}
            className={cn(
              "flex h-14 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors",
              board ? "bg-orange text-navy hover:bg-[#ffa64d]" : "bg-white/12 text-white hover:bg-white/20",
            )}
          >
            <Icon name="pen" size={22} />
            Whiteboard
          </button>
          <span className="mx-1.5 hidden h-9 w-px bg-white/15 sm:block" aria-hidden="true" />
          <ButtonLink href={`/teacher/lessons/${lesson.id}/report`} variant="danger" size="lg" className="px-6">
            <Icon name="phoneOff" size={22} />
            End lesson
          </ButtonLink>
        </div>
      </div>

      <SidePanel lesson={lesson} />
    </div>
  );
}

function ToggleControl({
  label,
  pressed,
  onToggle,
  activeTone,
  children,
}: {
  label: string;
  pressed: boolean;
  onToggle: () => void;
  activeTone: "danger" | "accent";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onToggle}
      title={label}
      className={cn(
        "inline-flex size-14 items-center justify-center rounded-full transition-colors",
        !pressed && "bg-white/12 text-white hover:bg-white/20",
        pressed && activeTone === "danger" && "bg-danger text-white hover:bg-[#a93226]",
        pressed && activeTone === "accent" && "bg-orange text-navy hover:bg-[#ffa64d]",
      )}
    >
      {children}
    </button>
  );
}
