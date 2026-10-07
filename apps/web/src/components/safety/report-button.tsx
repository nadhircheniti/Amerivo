"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/app/student/_components/modal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { API_URL, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useApi } from "@/lib/use-api";

/** Same list as the API (apps/api/src/modules/moderation/moderation.service.ts → REPORT_REASONS). */
const REASONS = ["harassment", "inappropriate", "contact_sharing", "off_platform", "no_show", "other"] as const;
const MIN_DETAILS = 10;

/**
 * "Report" for students and teachers: inappropriate behavior of the other person of a conversation
 * or a lesson goes to the admins' Safety reports queue (POST /reports).
 */
export function ReportButton({
  reportedUserId,
  name,
  conversationId,
  bookingId,
  tone = "light",
  className,
}: {
  reportedUserId: string;
  name: string;
  conversationId?: string;
  bookingId?: string;
  /** "dark": on the classroom's navy background. */
  tone?: "light" | "dark";
  className?: string;
}) {
  const t = useTranslations("messaging.report");
  const { call } = useApi();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number] | "">("");
  const [details, setDetails] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function close() {
    setOpen(false);
    if (sent) {
      setReason("");
      setDetails("");
      setSent(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!reason || details.trim().length < MIN_DETAILS) return;
    if (!API_URL) return setSent(true); // demo mode
    setPending(true);
    setError(null);
    try {
      await call("/reports", { method: "POST", body: JSON.stringify({ reportedUserId, reason, details: details.trim(), conversationId, bookingId }) });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError && err.status ? err.message : t("error"));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold",
          tone === "dark" ? "bg-white/8 text-white hover:bg-white/15" : "border border-line text-navy-soft hover:bg-beige hover:text-navy",
          className,
        )}
      >
        <Icon name="shield" size={16} />
        {t("button")}
      </button>
      <Modal open={open} onClose={close} title={t("title", { name })}>
        {sent ? (
          <div className="flex flex-col gap-4">
            <p role="status" className="rounded-2xl bg-teal-100 px-4 py-3 text-[15px] leading-relaxed text-teal-deep">
              {t("sent")}
            </p>
            <Button variant="teal" className="self-start" onClick={close}>
              {t("close")}
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <p className="text-sm leading-relaxed text-navy-soft">{t("intro")}</p>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-semibold">{t("reasonLabel")}</legend>
              {REASONS.map((r) => (
                <label key={r} className="flex items-center gap-2.5 text-[15px]">
                  <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} required className="size-[18px]" />
                  {t(`reasons.${r}`)}
                </label>
              ))}
            </fieldset>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              {t("detailsLabel")}
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={4}
                minLength={MIN_DETAILS}
                maxLength={2000}
                required
                placeholder={t("detailsPlaceholder")}
                className="w-full resize-none rounded-xl border border-line px-3 py-2.5 text-[15px] font-normal text-navy focus:border-teal-dark focus:outline-none"
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-danger-text">
                {error}
              </p>
            )}
            <p className="text-xs text-muted">{t("urgent")}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="danger" disabled={pending || !reason || details.trim().length < MIN_DETAILS}>
                {pending ? t("sending") : t("submit")}
              </Button>
              <Button variant="outline" onClick={close}>
                {t("cancel")}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
