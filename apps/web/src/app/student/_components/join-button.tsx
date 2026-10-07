"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import { Button, ButtonLink, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { useFormat } from "../_lib/format";
import type { StudentBooking } from "../_lib/types";

export const canJoin = (b: Pick<StudentBooking, "status" | "opensAt" | "closesAt">, now: number | null) =>
  now !== null && b.status === "confirmed" && now >= new Date(b.opensAt).getTime() && now <= new Date(b.closesAt).getTime();

/**
 * "Join classroom": enabled from shortly before the lesson (opensAt, 5 min by default, 15 max) until
 * 30 min after its end; otherwise disabled with a hint saying when it opens.
 */
export function JoinButton({
  booking,
  now,
  size = "sm",
  variant = "teal",
  hintClassName,
  className,
  timeZone,
}: {
  booking: Pick<StudentBooking, "id" | "status" | "opensAt" | "closesAt">;
  now: number | null;
  size?: ButtonSize;
  variant?: ButtonVariant;
  hintClassName?: string;
  className?: string;
  timeZone?: string;
}) {
  const t = useTranslations("student.join");
  const f = useFormat(timeZone);
  const hintId = useId();
  if (booking.status !== "confirmed" || (now !== null && now > new Date(booking.closesAt).getTime())) return null;
  if (canJoin(booking, now)) {
    return (
      <ButtonLink href={`/classroom/${booking.id}`} size={size} variant={variant} className={className}>
        <Icon name="video" size={size === "lg" ? 20 : 16} strokeWidth={2} />
        {t("join")}
      </ButtonLink>
    );
  }
  const opens = new Date(booking.opensAt);
  const sameDay = now !== null && f.dayShort(opens) === f.dayShort(new Date(now));
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button size={size} variant={variant} disabled aria-describedby={hintId} className={className}>
        <Icon name="video" size={size === "lg" ? 20 : 16} strokeWidth={2} />
        {t("join")}
      </Button>
      <span id={hintId} className={cn("text-xs text-muted", hintClassName)}>
        {now === null ? t("opensSoon") : sameDay ? t("opensAt", { time: f.time(opens) }) : t("opensOn", { date: f.dayShort(opens), time: f.time(opens) })}
      </span>
    </span>
  );
}
