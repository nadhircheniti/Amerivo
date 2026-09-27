"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { intlTags } from "@/i18n/config";
import { formatUsd } from "@/lib/mock-data";

type State = "open" | "refunded" | "contacted" | "declined";

export function RefundRequests() {
  const t = useTranslations("admin.refunds");
  const locale = useLocale();
  const [state, setState] = useState<State>("open");
  // Sample request; the reason is written by the student and stays as sent.
  const request = { student: "Ana Costa", lessonDate: "2026-10-13T09:00:00Z", amount: 35, reason: "Teacher's connection dropped for 20 minutes." };
  const lesson = t("lessonOn", {
    date: new Intl.DateTimeFormat(intlTags[locale], { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(request.lessonDate)),
  });
  const amount = formatUsd(request.amount, locale);
  const resolved = state === "refunded" || state === "declined";

  return (
    <section aria-labelledby="refunds-heading" className="flex flex-col gap-3 rounded-[20px] bg-white p-5 sm:p-[22px]">
      <div className="flex items-center justify-between gap-2">
        <h2 id="refunds-heading" className="text-base font-bold">
          {t("title")}
        </h2>
        <span className="text-xs text-muted">{t("window")}</span>
      </div>

      <article className="flex flex-col gap-2 rounded-[14px] bg-cream p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm">
            <strong>{request.student}</strong> · {lesson} · {amount}
          </p>
          {state === "refunded" && <Badge tone="success">{t("refunded")}</Badge>}
          {state === "declined" && <Badge tone="danger">{t("declined")}</Badge>}
          {state === "contacted" && <Badge tone="info">{t("awaitingReply")}</Badge>}
        </div>
        <p className="text-[13px] text-orange-text">&ldquo;{request.reason}&rdquo;</p>
        <p className="sr-only" aria-live="polite">
          {state === "refunded" && t("liveRefunded", { amount, name: request.student })}
          {state === "declined" && t("liveDeclined", { name: request.student })}
          {state === "contacted" && t("liveContacted", { name: request.student })}
        </p>
        {resolved ? (
          <div className="flex items-center justify-between gap-2 text-[13px] text-navy-soft">
            <span>{state === "refunded" ? t("returned", { amount }) : t("notified")}</span>
            <Button variant="ghost" className="text-[13px]" onClick={() => setState("open")}>
              {t("undo")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button variant="teal" size="sm" className="h-[38px] px-3.5 text-[13px]" onClick={() => setState("refunded")}>
              {t("refund")}
            </Button>
            <Button variant="outlineLight" size="sm" className="h-[38px] px-3.5 text-[13px]" onClick={() => setState("contacted")} disabled={state === "contacted"}>
              {state === "contacted" ? t("contacted") : t("contact")}
            </Button>
            <Button variant="outlineLight" size="sm" className="h-[38px] px-3.5 text-[13px]" onClick={() => setState("declined")}>
              {t("decline")}
            </Button>
          </div>
        )}
      </article>

      <article className="flex flex-col gap-1.5 rounded-[14px] bg-beige-2 p-3.5">
        <p className="text-sm">
          <strong>{t("teacherWarning")}</strong> · David K.
        </p>
        <p className="text-[13px] text-navy-soft">{t("warningText", { count: 3 })}</p>
      </article>
    </section>
  );
}
