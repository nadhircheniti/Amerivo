"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

const COOLDOWN = 30;

/** Mock "resend" with a 30 s cooldown and a polite live status. */
export function ResendButton() {
  const t = useTranslations("auth.verify");
  const [left, setLeft] = useState(0);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant="outline"
        disabled={left > 0}
        onClick={() => {
          setSent(true);
          setLeft(COOLDOWN);
        }}
      >
        {left > 0 ? t("resendEmailIn", { seconds: left }) : t("resendEmail")}
      </Button>
      <p role="status" className="text-sm text-teal-deep">
        {sent ? t("linkResent") : ""}
      </p>
    </div>
  );
}
