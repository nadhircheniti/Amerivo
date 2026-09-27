"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { useApi } from "@/lib/use-api";

type Booking = { id: string; status: string };

/** Asks the API to check the payment with Stripe, a few times while the bank finishes. */
export function CompletePayment() {
  const params = useSearchParams();
  const router = useRouter();
  const t = useTranslations("checkout.complete");
  const { call, isLoaded, isSignedIn } = useApi();
  const bookingId = params.get("booking");
  const failedAtStripe = params.get("redirect_status") === "failed";
  const [state, setState] = useState<"checking" | "failed" | "pending">(failedAtStripe ? "failed" : "checking");
  const started = useRef(false);

  useEffect(() => {
    if (failedAtStripe || !bookingId || !isLoaded || started.current) return;
    if (!isSignedIn) {
      router.replace(`/login?${new URLSearchParams({ redirect_url: window.location.pathname + window.location.search })}`);
      return;
    }
    started.current = true;
    (async () => {
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const b = await call<Booking>(`/bookings/${bookingId}/sync-payment`, { method: "POST" });
          if (b.status === "confirmed") return router.replace(`/student?booked=${bookingId}`);
          if (b.status === "cancelled") return setState("failed");
        } catch {
          /* API waking up — retry */
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      setState("pending");
    })();
  }, [bookingId, call, failedAtStripe, isLoaded, isSignedIn, router]);

  if (!bookingId) {
    return (
      <>
        <h1 className="text-[26px] font-extrabold">{t("nothingTitle")}</h1>
        <ButtonLink href="/teachers">{t("findTeacher")}</ButtonLink>
      </>
    );
  }
  if (state === "checking") {
    return (
      <p role="status" className="text-lg text-navy-soft">
        {t("confirming")}
      </p>
    );
  }
  if (state === "failed") {
    return (
      <>
        <h1 className="text-[26px] font-extrabold">{t("failedTitle")}</h1>
        <p className="text-navy-soft">{t("failedText")}</p>
        <ButtonLink href="/teachers">{t("backToTeachers")}</ButtonLink>
      </>
    );
  }
  return (
    <>
      <h1 className="text-[26px] font-extrabold">{t("processingTitle")}</h1>
      <p className="text-navy-soft">{t("processingText")}</p>
      <ButtonLink href="/student">{t("goToDashboard")}</ButtonLink>
    </>
  );
}
