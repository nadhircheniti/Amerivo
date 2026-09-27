"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { API_URL } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { fullName, useFormat } from "../_lib/format";
import type { StudentBooking } from "../_lib/types";
import { Modal } from "./modal";

export type CancelResult = { status: string; refundCents: number; refundMode?: "none" | "money" | "package_credit" };

/** What cancelling now does, in words (same rules as the API: > 24 h full refund, < 24 h none). */
export function RefundOutcome({ booking, timeZone }: { booking: StudentBooking; timeZone?: string }) {
  const t = useTranslations("student.cancel");
  const f = useFormat(timeZone);
  const c = booking.cancellation;
  if (!c) return null;
  let text: string;
  let tone = "bg-teal-50 text-teal-deep";
  if (booking.status === "pending_payment") text = t("outcome.unpaid");
  else if (c.refundMode === "money") text = t("outcome.money", { amount: f.money(c.refundCents) });
  else if (c.refundMode === "package_credit") text = t("outcome.packageCredit", { name: booking.teacher.firstName });
  else if (booking.priceCents === 0) text = t("outcome.free");
  else {
    text = t("outcome.late");
    tone = "bg-orange-100 text-orange-text";
  }
  return (
    <div className={`flex items-start gap-2.5 rounded-2xl p-4 text-sm ${tone}`}>
      <Icon name={tone.includes("orange") ? "clock" : "check"} size={18} strokeWidth={2.2} className="mt-0.5 shrink-0" />
      <div className="flex flex-col gap-1">
        <p className="font-semibold">{text}</p>
        {c.fullRefund && booking.status === "confirmed" && booking.priceCents > 0 && (
          <p className="text-[13px] font-normal">{t("freeUntil", { date: f.dayShort(c.freeUntil), time: f.time(c.freeUntil) })}</p>
        )}
        {!c.fullRefund && booking.status === "confirmed" && booking.priceCents > 0 && <p className="text-[13px] font-normal">{t("policy")}</p>}
      </div>
    </div>
  );
}

export function CancelLesson({ booking, onCancelled, timeZone, className }: { booking: StudentBooking; onCancelled: (r: CancelResult) => void; timeZone?: string; className?: string }) {
  const t = useTranslations("student.cancel");
  const f = useFormat(timeZone);
  const { call } = useApi();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!booking.canCancel) return null;

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = API_URL
        ? await call<CancelResult>(`/bookings/${booking.id}/cancel`, { method: "POST", body: JSON.stringify(reason.trim() ? { reason: reason.trim() } : {}) })
        : { status: booking.cancellation?.refundMode === "money" ? "refunded" : "cancelled", refundCents: booking.cancellation?.refundCents ?? 0, refundMode: booking.cancellation?.refundMode };
      setOpen(false);
      onCancelled(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button size="sm" variant="dangerOutline" onClick={() => setOpen(true)} className={className}>
        {t("button")}
      </Button>
      <Modal open={open} onClose={() => !busy && setOpen(false)} title={t("title")}>
        <p className="text-[15px] text-navy-soft">
          {t("lesson", { name: fullName(booking.teacher), date: f.dayLong(booking.startsAt), time: f.range(booking.startsAt, booking.endsAt) })}
        </p>
        <RefundOutcome booking={booking} timeZone={timeZone} />
        <Field label={t("reason")}>
          <Textarea rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("reasonPlaceholder")} />
        </Field>
        {error && (
          <p className="text-sm text-danger-text" role="alert">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outlineLight" onClick={() => setOpen(false)} disabled={busy}>
            {t("keep")}
          </Button>
          <Button variant="danger" onClick={confirm} disabled={busy}>
            {busy ? t("cancelling") : t("confirm")}
          </Button>
        </div>
      </Modal>
    </>
  );
}
