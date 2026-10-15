"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { agreementProse } from "@/components/legal/teacher-agreement";
import { Button, ButtonLink } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";

/** Signed agreement + signature certificate, as e-mailed; "Print / save as PDF". */
export function SignedCopy() {
  const t = useTranslations("company.teacherAgreement");
  const { call, isLoaded, isSignedIn } = useApi();
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    call<{ html: string }>("/teacher/agreement/copy").then(
      (r) => !cancelled && setHtml(r.html),
      (e) => !cancelled && setError(e instanceof ApiError && e.status === 404 ? t("notSigned") : t("loadError")),
    );
    return () => {
      cancelled = true;
    };
  }, [call, isLoaded, isSignedIn, t]);

  return (
    <main className="mx-auto flex w-full max-w-[860px] flex-col gap-5 px-6 py-10 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <ButtonLink href="/teacher" variant="outline" size="sm">
          {t("backToSpace")}
        </ButtonLink>
        {html && (
          <Button variant="teal" size="sm" onClick={() => window.print()}>
            {t("print")}
          </Button>
        )}
      </div>
      {error && <p className="rounded-2xl bg-white px-5 py-4 text-sm text-navy-soft">{error}</p>}
      {!html && !error && (
        <p role="status" className="text-sm text-muted">
          {t("loading")}
        </p>
      )}
      {/* Built by the API from the agreement's text and the signature record, every value escaped. */}
      {html && <article className={`rounded-3xl bg-white p-6 sm:p-10 print:rounded-none print:p-0 ${agreementProse}`} dangerouslySetInnerHTML={{ __html: html }} />}
    </main>
  );
}
