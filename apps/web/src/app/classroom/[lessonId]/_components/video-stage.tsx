"use client";

import { useRef, useState } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import type { ClassroomLesson } from "../_data";
import { LocalIcon } from "./local-icons";

type Tool = "pen" | "text" | "shape" | "eraser";
const tools: { id: Tool; icon?: IconName }[] = [{ id: "pen", icon: "pen" }, { id: "text" }, { id: "shape", icon: "square" }, { id: "eraser", icon: "eraser" }];

/**
 * Video area of the classroom: remote (teacher) video with self-view picture-in-picture,
 * or the shared whiteboard with both video tiles stacked on the side.
 *
 * ─── Daily.co integration point ───────────────────────────────────────────────
 * TODO(daily): install `@daily-co/daily-js` and mount the call object in an effect here:
 *
 *   const call = Daily.createCallObject();
 *   await call.join({ url: roomUrl, token: meetingToken }); // token minted by apps/api per lesson
 *   call.on("participant-updated", ...) // attach tracks to the <video> elements below
 *   call.setLocalAudio(!micMuted); call.setLocalVideo(!cameraOff);
 *   sharing ? call.startScreenShare() : call.stopScreenShare();
 *   return () => { call.leave(); call.destroy(); };
 *
 * `callContainerRef` marks the element that will host the remote participant's <video>;
 * the initials tiles below are placeholders until real tracks are attached.
 * ──────────────────────────────────────────────────────────────────────────────
 */
export function VideoStage({
  lesson,
  mode,
  micMuted,
  cameraOff,
  sharing,
}: {
  lesson: ClassroomLesson;
  mode: "video" | "board";
  micMuted: boolean;
  cameraOff: boolean;
  sharing: boolean;
}) {
  const t = useTranslations("classroom.stage");
  const callContainerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>("pen");

  if (mode === "board") {
    return (
      <section aria-label={t("whiteboard")} className="relative flex min-h-[460px] flex-1 flex-col overflow-hidden rounded-[20px] bg-white text-navy lg:min-h-0">
        <div role="toolbar" aria-label={t("tools")} className="absolute start-4 top-4 flex gap-1.5 rounded-xl bg-beige p-1.5">
          {tools.map((tl) => (
            <button
              key={tl.id}
              type="button"
              aria-label={t(`tool.${tl.id}`)}
              aria-pressed={tool === tl.id}
              onClick={() => setTool(tl.id)}
              className={cn("flex size-11 items-center justify-center rounded-lg transition-colors", tool === tl.id ? "bg-navy text-white" : "text-navy hover:bg-sand")}
            >
              {tl.icon ? <Icon name={tl.icon} size={20} /> : <span className="font-display text-lg font-bold">T</span>}
            </button>
          ))}
        </div>

        {/* TODO(whiteboard): replace with the collaborative canvas (synced over the Daily app-message channel). */}
        <div className="flex flex-1 flex-col gap-4 px-6 pt-24 pb-6 sm:gap-[22px] lg:ps-[120px] lg:pe-[240px] lg:pt-[110px]">
          <p className="font-display text-[26px] font-bold sm:text-[34px]">{lesson.boardTitle}</p>
          <ul className="flex flex-col gap-4 sm:gap-[22px]">
            {lesson.phrases.map((p) => (
              <li key={p.text} className={cn("flex gap-3 text-lg sm:text-2xl", p.highlight && "text-orange-dark")}>
                <Icon name="chevronRight" size={24} strokeWidth={2.4} className="mt-0.5 shrink-0 sm:mt-1" />
                {p.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex gap-2.5 p-4 pt-0 sm:absolute sm:end-4 sm:top-4 sm:flex-col sm:p-0">
          <Tile name={lesson.teacher.firstName} initials={lesson.teacher.initials} className="h-[100px] flex-1 bg-sky sm:h-[126px] sm:w-[200px] sm:flex-none" />
          <Tile
            name={t("you")}
            initials={lesson.student.initials}
            micMuted={micMuted}
            cameraOff={cameraOff}
            className="h-[100px] flex-1 bg-navy-soft sm:h-[126px] sm:w-[200px] sm:flex-none"
          />
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label={t("videoCall", { name: lesson.teacher.name })}
      className="relative flex min-h-[420px] flex-1 items-center justify-center overflow-hidden rounded-[20px] bg-[#13486b] lg:min-h-0"
    >
      <div className="pointer-events-none absolute -end-[100px] -top-[100px] size-[360px] rounded-full bg-teal opacity-15" aria-hidden="true" />

      {/* Remote participant video mounts here (see Daily.co TODO above). */}
      <div ref={callContainerRef} data-daily-container className="flex items-center justify-center">
        <span
          className="mb-24 flex size-36 items-center justify-center rounded-full bg-teal-100 font-display text-5xl font-bold text-teal-dark sm:mb-0 sm:size-[220px] sm:text-[72px]"
          aria-hidden="true"
        >
          {lesson.teacher.initials}
        </span>
      </div>

      <span className="absolute start-5 top-[18px] text-xs tracking-[1px] text-ink-soft">{t("videoFeed")}</span>
      {sharing && (
        <span role="status" className="absolute end-5 top-3.5 flex items-center gap-2 rounded-full bg-orange px-3 py-1.5 text-xs font-semibold text-navy">
          <Icon name="screen" size={14} />
          {t("sharing")}
        </span>
      )}
      <span className="absolute start-5 bottom-[18px] rounded-full bg-navy-deep/60 px-3 py-1.5 text-sm font-semibold">{t("teacherLabel", { name: lesson.teacher.name })}</span>

      {/* Self-view picture-in-picture */}
      <Tile
        name={t("you")}
        initials={lesson.student.initials}
        micMuted={micMuted}
        cameraOff={cameraOff}
        large
        className="absolute end-4 bottom-16 h-[100px] w-[150px] border-2 border-white/20 bg-navy-soft sm:end-5 sm:bottom-5 sm:h-40 sm:w-[260px]"
      />
    </section>
  );
}

function Tile({
  name,
  initials,
  micMuted,
  cameraOff,
  large,
  className,
}: {
  name: string;
  initials: string;
  micMuted?: boolean;
  cameraOff?: boolean;
  large?: boolean;
  className?: string;
}) {
  const t = useTranslations("classroom.stage");
  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-[14px] font-display font-bold text-white",
        large ? "rounded-2xl text-[28px] sm:text-[34px]" : "text-[28px]",
        className,
      )}
    >
      {cameraOff ? (
        <span className="flex flex-col items-center gap-1 font-sans text-xs font-medium text-ink-soft">
          <LocalIcon name="videoOff" size={24} />
          {t("cameraOff")}
        </span>
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
      <span className="absolute start-2.5 bottom-2 font-sans text-xs font-medium">{name}</span>
      {micMuted && (
        <span className="absolute end-2 top-2 flex size-6 items-center justify-center rounded-full bg-danger text-white" aria-label={t("micMuted")} role="img">
          <LocalIcon name="micOff" size={14} />
        </span>
      )}
    </div>
  );
}
