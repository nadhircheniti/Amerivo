"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { TERMS_VERSION } from "@/lib/legal";
import { safePath } from "@/lib/safe-path";
import { useApi } from "@/lib/use-api";

export function AcceptTermsForm() {
  const t = useTranslations("auth.acceptTerms");
  const router = useRouter();
  const { call } = useApi();
  const [checked, setChecked] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setPending(true);
    setError(null);
    try {
      await call("/me/terms", { method: "POST", body: JSON.stringify({ version: TERMS_VERSION }) });
      router.replace(safePath(new URLSearchParams(window.location.search).get("next"), window.location.origin));
    } catch (e) {
      setError((e as Error).message || t("error"));
      setPending(false);
    }
  }

  return (
    <div className="flex w-full max-w-[600px] flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-extrabold sm:text-[34px]">{t("title")}</h1>
        <p className="text-base leading-relaxed text-navy-soft">{t("intro")}</p>
      </div>
      <ul className="flex list-disc flex-col gap-2 rounded-2xl bg-cream py-4 ps-10 pe-5 text-sm leading-relaxed text-navy">
        <li>{t("points.contact")}</li>
        <li>{t("points.monitoring")}</li>
        <li>{t("points.fees")}</li>
        <li>{t("points.conduct")}</li>
      </ul>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (checked) void accept();
        }}
      >
        <label className="flex items-start gap-2.5 text-sm leading-normal text-navy-soft">
          <input type="checkbox" required checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5 size-[18px] shrink-0" />
          <span>
            {t.rich("checkbox", {
              terms: (c) => (
                <Link href="/terms" target="_blank" className="font-semibold text-teal-dark underline-offset-2 hover:underline">
                  {c}
                </Link>
              ),
              privacy: (c) => (
                <Link href="/privacy" target="_blank" className="font-semibold text-teal-dark underline-offset-2 hover:underline">
                  {c}
                </Link>
              ),
            })}
          </span>
        </label>
        {error && (
          <p role="alert" className="rounded-xl bg-danger-100 px-4 py-3 text-sm font-semibold text-danger-text">
            {error}
          </p>
        )}
        <Button type="submit" variant="teal" disabled={!checked || pending} className="self-start">
          {pending ? t("saving") : t("accept")}
        </Button>
      </form>
    </div>
  );
}
