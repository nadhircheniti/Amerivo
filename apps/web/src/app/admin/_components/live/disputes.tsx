"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/use-api";
import type { AdminDispute } from "./types";
import { Confirm, StatusBadge, fullName, useBookingType, useFormat } from "./ui";
import { isLive } from "./use-admin-data";

/** One student report (open or resolved), in the refund-request card design. */
export function DisputeCard({ dispute: d, onResolved, compact = false }: { dispute: AdminDispute; onResolved: (notice: string) => void; compact?: boolean }) {
  const t = useTranslations("admin.disputesPage");
  const tl = useTranslations("admin.live");
  const fmt = useFormat();
  const typeLabel = useBookingType();
  const { call } = useApi();
  const [mode, setMode] = useState<"idle" | "refund" | "reject">("idle");
  const student = fullName(d.student);
  const teacher = fullName(d.teacher);
  const amount = d.amountCents === 0 ? t("free") : fmt.money(d.amountCents);
  const lesson = t("lessonOn", { date: fmt.dateTime(d.lessonDate) });

  const resolve = async (decision: "refund" | "reject", note: string) => {
    if (!isLive) throw new Error(tl("demoAction"));
    await call(`/admin/disputes/${d.id}/resolve`, { method: "POST", body: JSON.stringify(note ? { decision, note } : { decision }) });
    onResolved(decision === "refund" ? t("noticeRefunded", { name: student, amount }) : t("noticeRejected", { name: student }));
  };

  return (
    <article className="flex flex-col gap-2 rounded-[14px] bg-cream p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">
          <strong>{student}</strong> · {lesson} · {amount}
        </p>
        {d.status === "open" ? <span className="text-xs text-muted">{t("age", { hours: d.ageHours })}</span> : <StatusBadge kind="dispute" value={d.status} />}
      </div>
      <p className="text-[13px] text-navy-soft">
        {t("withTeacher", { teacher })} · {typeLabel({ type: d.booking.type, durationMin: d.booking.durationMin, package: null })}
        {d.attendance === "no_show" && <> · {t("markedNoShow")}</>}
      </p>
      <p className="text-[13px] break-words text-orange-text">&ldquo;{d.reason}&rdquo;</p>
      {!compact && (
        <p className="text-xs text-muted">
          {t("reportedOn", { date: fmt.dateTime(d.createdAt) })}
          {d.paymentStatus && (
            <>
              {" · "}
              {t("paymentLabel")} <StatusBadge kind="payment" value={d.paymentStatus} />
            </>
          )}
        </p>
      )}

      {d.status !== "open" ? (
        <p className="text-[13px] text-navy-soft">
          {d.resolvedAt && t("resolvedLine", { date: fmt.dateTime(d.resolvedAt), name: d.resolvedBy ?? "—" })}
          {d.resolution && <span className="mt-1 block break-words">{t("resolutionNote", { note: d.resolution })}</span>}
        </p>
      ) : mode === "refund" ? (
        <Confirm
          question={t("confirmRefund", { name: student, amount })}
          confirmLabel={t("confirmRefundYes")}
          note={{ label: t("noteLabel"), placeholder: t("refundPlaceholder"), hint: t("noteHint") }}
          onCancel={() => setMode("idle")}
          onConfirm={(note) => resolve("refund", note)}
        />
      ) : mode === "reject" ? (
        <Confirm
          question={t("confirmReject", { name: student })}
          confirmLabel={t("confirmRejectYes")}
          tone="danger"
          note={{ label: t("noteLabel"), placeholder: t("rejectPlaceholder"), hint: t("noteHint"), required: true }}
          onCancel={() => setMode("idle")}
          onConfirm={(note) => resolve("reject", note)}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant="teal" size="sm" className="h-[38px] px-3.5 text-[13px]" onClick={() => setMode("refund")}>
            {t("refund", { amount })}
          </Button>
          <Button variant="outlineLight" size="sm" className="h-[38px] px-3.5 text-[13px]" onClick={() => setMode("reject")}>
            {t("reject")}
          </Button>
          <a href={`mailto:${d.student.email}`} className="inline-flex h-[38px] items-center rounded-full border border-line bg-white px-3.5 text-[13px] text-navy hover:bg-beige">
            {t("contact")}
          </a>
        </div>
      )}
    </article>
  );
}
