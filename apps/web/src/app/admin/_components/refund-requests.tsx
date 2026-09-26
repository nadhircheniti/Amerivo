"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { formatUsd } from "@/lib/mock-data";

type State = "open" | "refunded" | "contacted" | "declined";

export function RefundRequests() {
  const [state, setState] = useState<State>("open");
  const request = { student: "Ana Costa", lesson: "Oct 13 lesson", amount: 35, reason: "Teacher's connection dropped for 20 minutes." };
  const resolved = state === "refunded" || state === "declined";

  return (
    <section aria-labelledby="refunds-heading" className="flex flex-col gap-3 rounded-[20px] bg-white p-5 sm:p-[22px]">
      <div className="flex items-center justify-between gap-2">
        <h2 id="refunds-heading" className="text-base font-bold">
          Refund requests
        </h2>
        <span className="text-xs text-muted">Within 24 h window</span>
      </div>

      <article className="flex flex-col gap-2 rounded-[14px] bg-cream p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm">
            <strong>{request.student}</strong> · {request.lesson} · {formatUsd(request.amount)}
          </p>
          {state === "refunded" && <Badge tone="success">Refunded</Badge>}
          {state === "declined" && <Badge tone="danger">Declined</Badge>}
          {state === "contacted" && <Badge tone="info">Awaiting reply</Badge>}
        </div>
        <p className="text-[13px] text-orange-text">&ldquo;{request.reason}&rdquo;</p>
        <p className="sr-only" aria-live="polite">
          {state === "refunded" && `${formatUsd(request.amount)} refunded to ${request.student}.`}
          {state === "declined" && `Refund request from ${request.student} declined.`}
          {state === "contacted" && `Message sent to ${request.student}.`}
        </p>
        {resolved ? (
          <div className="flex items-center justify-between gap-2 text-[13px] text-navy-soft">
            <span>{state === "refunded" ? `${formatUsd(request.amount)} returned to the original payment method.` : "The student has been notified."}</span>
            <Button variant="ghost" className="text-[13px]" onClick={() => setState("open")}>
              Undo
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button variant="teal" size="sm" className="h-[38px] px-3.5 text-[13px]" onClick={() => setState("refunded")}>
              Refund
            </Button>
            <Button variant="outlineLight" size="sm" className="h-[38px] px-3.5 text-[13px]" onClick={() => setState("contacted")} disabled={state === "contacted"}>
              {state === "contacted" ? "Contacted" : "Contact"}
            </Button>
            <Button variant="outlineLight" size="sm" className="h-[38px] px-3.5 text-[13px]" onClick={() => setState("declined")}>
              Decline
            </Button>
          </div>
        )}
      </article>

      <article className="flex flex-col gap-1.5 rounded-[14px] bg-beige-2 p-3.5">
        <p className="text-sm">
          <strong>Teacher warning</strong> · David K.
        </p>
        <p className="text-[13px] text-navy-soft">3rd cancellation this month — automatic warning sent.</p>
      </article>
    </section>
  );
}
