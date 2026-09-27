"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { useApi } from "@/lib/use-api";
import type { AdminBooking } from "./types";
import { Confirm, Drawer, Fact, StatusBadge, fullName, linkAction, td, th, useBookingType, useFormat } from "./ui";
import { isLive } from "./use-admin-data";

type Mode = "view" | "cancel" | "refund";

/** Cancel (before the lesson) and refund (taught lesson) through the existing API endpoints. */
export function useBookingActions() {
  const { call } = useApi();
  const t = useTranslations("admin.live");
  const guard = () => {
    if (!isLive) throw new Error(t("demoAction"));
  };
  return {
    cancel: async (b: AdminBooking, reason: string) => {
      guard();
      return call<{ status: string; refundCents: number; refundMode?: string }>(`/bookings/${b.id}/cancel`, { method: "POST", body: JSON.stringify(reason ? { reason } : {}) });
    },
    refund: async (b: AdminBooking, reason: string) => {
      guard();
      return call<{ refunded: number }>(`/admin/bookings/${b.id}/refund`, { method: "POST", body: JSON.stringify({ reason }) });
    },
  };
}

/** Bookings table in the overview design, with View / Cancel / Refund actions and a detail drawer. */
export function LiveBookingsTable({ rows, onChanged, caption, empty }: { rows: AdminBooking[]; onChanged: (notice: string) => void; caption: string; empty: string }) {
  const t = useTranslations("admin.bookingsPage");
  const fmt = useFormat();
  const typeLabel = useBookingType();
  const [open, setOpen] = useState<{ id: string; mode: Mode } | null>(null);
  const selected = open ? rows.find((r) => r.id === open.id) : null;
  const label = (b: AdminBooking) => `${fullName(b.student)}, ${fmt.dateTime(b.startsAt)}`;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              <th scope="col" className={th}>
                {t("dateUtc")}
              </th>
              <th scope="col" className={th}>
                {t("student")}
              </th>
              <th scope="col" className={th}>
                {t("teacher")}
              </th>
              <th scope="col" className={th}>
                {t("type")}
              </th>
              <th scope="col" className={th}>
                {t("amount")}
              </th>
              <th scope="col" className={th}>
                {t("status")}
              </th>
              <th scope="col" className={th}>
                {t("payment")}
              </th>
              <th scope="col" className={cn(th, "text-end")}>
                {t("actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className={cn(td, "text-center text-muted")}>
                  {empty}
                </td>
              </tr>
            )}
            {rows.map((b) => (
              <tr key={b.id}>
                <td className={td}>{fmt.dateTime(b.startsAt)}</td>
                <td className={td}>{fullName(b.student)}</td>
                <td className={td}>{fullName(b.teacher)}</td>
                <td className={td}>{typeLabel(b)}</td>
                <td className={td}>{b.amountCents === 0 ? t("free") : fmt.money(b.amountCents)}</td>
                <td className={td}>
                  <span className="inline-flex items-center gap-1.5">
                    <StatusBadge kind="booking" value={b.status} />
                    {b.dispute && (
                      <Badge tone={b.dispute.status === "open" ? "orange" : "neutral"} className="px-2 py-[3px] text-[11px]">
                        <Icon name="shield" size={12} />
                        {t("disputed")}
                      </Badge>
                    )}
                  </span>
                </td>
                <td className={td}>{b.paymentStatus ? <StatusBadge kind="payment" value={b.paymentStatus} /> : <span className="text-muted">—</span>}</td>
                <td className={cn(td, "text-end")}>
                  <span className="inline-flex gap-3.5">
                    <button type="button" className={linkAction} onClick={() => setOpen({ id: b.id, mode: "view" })} aria-label={t("viewAria", { booking: label(b) })}>
                      {t("view")}
                    </button>
                    {b.canCancel && (
                      <button type="button" className={linkAction} onClick={() => setOpen({ id: b.id, mode: "cancel" })} aria-label={t("cancelAria", { booking: label(b) })}>
                        {t("cancel")}
                      </button>
                    )}
                    {b.canRefund && (
                      <button type="button" className={linkAction} onClick={() => setOpen({ id: b.id, mode: "refund" })} aria-label={t("refundAria", { booking: label(b) })}>
                        {t("refund")}
                      </button>
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && open && (
        <BookingDrawer
          key={selected.id}
          booking={selected}
          initialMode={open.mode}
          onClose={() => setOpen(null)}
          onDone={(n) => {
            setOpen(null);
            onChanged(n);
          }}
        />
      )}
    </>
  );
}

export function BookingDrawer({
  booking: b,
  initialMode = "view",
  onClose,
  onDone,
}: {
  booking: AdminBooking;
  initialMode?: Mode;
  onClose: () => void;
  onDone: (notice: string) => void;
}) {
  const t = useTranslations("admin.bookingsPage");
  const fmt = useFormat();
  const typeLabel = useBookingType();
  const actions = useBookingActions();
  const [mode, setMode] = useState<Mode>(initialMode);
  const student = fullName(b.student);

  return (
    <Drawer title={t("drawerTitle", { name: student })} onClose={onClose}>
      <section className="flex flex-col gap-4 rounded-[18px] bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge kind="booking" value={b.status} />
          {b.paymentStatus && <StatusBadge kind="payment" value={b.paymentStatus} />}
          {b.dispute && (
            <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
              {t("disputeLine")}
              <StatusBadge kind="dispute" value={b.dispute.status} />
            </span>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-3.5">
          <Fact label={t("dateUtc")}>{fmt.dateTime(b.startsAt)}</Fact>
          <Fact label={t("duration")}>{t("minutes", { count: b.durationMin })}</Fact>
          <Fact label={t("student")}>
            {student}
            <span className="block text-[13px] text-muted">{b.student.email}</span>
          </Fact>
          <Fact label={t("teacher")}>
            {fullName(b.teacher)}
            <span className="block text-[13px] text-muted">{b.teacher.email}</span>
          </Fact>
          <Fact label={t("type")}>{typeLabel(b)}</Fact>
          <Fact label={t("amount")}>{b.amountCents === 0 ? t("free") : fmt.money(b.amountCents)}</Fact>
          <Fact label={t("bookedOn")}>{fmt.date(b.createdAt)}</Fact>
          <Fact label={t("reference")}>
            <span className="font-mono text-[13px]">{b.id.slice(0, 8)}</span>
          </Fact>
          {b.topic && <Fact label={t("topic")}>{b.topic}</Fact>}
          {b.lessonEndedAt && <Fact label={t("endedAt")}>{fmt.dateTime(b.lessonEndedAt)}</Fact>}
          {b.cancelledBy && <Fact label={t("cancelledBy")}>{t(`by.${b.cancelledBy}`)}</Fact>}
          {b.cancelReason && <Fact label={t("reason")}>{b.cancelReason}</Fact>}
        </dl>
      </section>

      {mode === "cancel" && (
        <Confirm
          question={t("confirmCancel", { name: student, date: fmt.dateTime(b.startsAt) })}
          confirmLabel={t("confirmCancelYes")}
          tone="danger"
          note={{ label: t("reasonLabel"), placeholder: t("reasonPlaceholder"), hint: b.package ? t("cancelHintPackage") : t("cancelHint") }}
          onCancel={() => setMode("view")}
          onConfirm={async (reason) => {
            const r = await actions.cancel(b, reason);
            onDone(
              r.refundCents > 0 && r.refundMode === "money"
                ? t("noticeCancelledRefund", { name: student, amount: fmt.money(r.refundCents) })
                : t("noticeCancelled", { name: student }),
            );
          }}
        />
      )}
      {mode === "refund" && (
        <Confirm
          question={t("confirmRefund", { name: student, amount: fmt.money(b.amountCents) })}
          confirmLabel={t("confirmRefundYes")}
          note={{ label: t("reasonLabel"), placeholder: t("refundPlaceholder"), required: true, hint: t("refundHint") }}
          onCancel={() => setMode("view")}
          onConfirm={async (reason) => {
            const r = await actions.refund(b, reason);
            onDone(t("noticeRefunded", { name: student, amount: fmt.money(r.refunded) }));
          }}
        />
      )}
      {mode === "view" && (b.canCancel || b.canRefund) && (
        <div className="flex flex-wrap gap-2">
          {b.canCancel && (
            <button
              type="button"
              onClick={() => setMode("cancel")}
              className="inline-flex h-10 items-center rounded-full border border-danger bg-white px-4 text-sm font-semibold text-[#a52f22] hover:bg-danger-100"
            >
              {t("cancelBooking")}
            </button>
          )}
          {b.canRefund && (
            <button
              type="button"
              onClick={() => setMode("refund")}
              className="inline-flex h-10 items-center rounded-full bg-teal-dark px-4 text-sm font-semibold text-white hover:bg-[#12665d]"
            >
              {t("refundLesson")}
            </button>
          )}
        </div>
      )}
      {mode === "view" && !b.canCancel && !b.canRefund && <p className="text-[13px] text-muted">{t("noActions")}</p>}
    </Drawer>
  );
}
