"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { useApi } from "@/lib/use-api";

type Booking = { id: string; status: string };

/** Asks the API to check the payment with Stripe, a few times while the bank finishes. */
export function CompletePayment() {
  const params = useSearchParams();
  const router = useRouter();
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
        <h1 className="text-[26px] font-extrabold">Nothing to confirm</h1>
        <ButtonLink href="/teachers">Find a teacher</ButtonLink>
      </>
    );
  }
  if (state === "checking") {
    return (
      <p role="status" className="text-lg text-navy-soft">
        Confirming your payment…
      </p>
    );
  }
  if (state === "failed") {
    return (
      <>
        <h1 className="text-[26px] font-extrabold">Your payment didn&apos;t go through</h1>
        <p className="text-navy-soft">No money was taken. You can pick your time again and try another payment method.</p>
        <ButtonLink href="/teachers">Back to teachers</ButtonLink>
      </>
    );
  }
  return (
    <>
      <h1 className="text-[26px] font-extrabold">Payment being processed</h1>
      <p className="text-navy-soft">Your bank is still confirming the payment. Your lesson will appear as confirmed in your dashboard within a few minutes.</p>
      <ButtonLink href="/student">Go to my dashboard</ButtonLink>
    </>
  );
}
