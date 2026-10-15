"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { intlTags, type Locale } from "@/i18n/config";
import { API_URL, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";

export type AgreementText = { version: string; sha256: string; html: string };
export type AgreementSignature = { version: string; fullName: string; signedAt: string; emailedAt: string | null; sha256: string; recordSha256: string };

/** Styles for the agreement's HTML (headings, paragraphs, lists) without a typography plugin. */
export const agreementProse =
  "text-[15px] leading-relaxed text-navy [&_h1]:text-xl [&_h1]:font-extrabold [&_h2]:mt-6 [&_h2]:text-[17px] [&_h2]:font-bold [&_li]:mt-1 [&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:ps-6 [&_p]:mt-2.5 [&_table]:mt-3 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:ps-6";

/**
 * Independent Teacher Agreement: read the text (scroll to the end), tick "I agree", type the full
 * legal name, sign. The API records the signature (exact text, identity check, time, IP) and
 * e-mails the signed copy to the teacher and to Amerivo. Once signed: the signature and the copy.
 */
export function TeacherAgreementPanel({ onSigned }: { onSigned?: (s: AgreementSignature) => void }) {
  const t = useTranslations("company.teacherAgreement");
  const tag = intlTags[useLocale() as Locale];
  const { call, isLoaded, isSignedIn } = useApi();
  const [text, setText] = useState<AgreementText | null>(null);
  const [signature, setSignature] = useState<AgreementSignature | null | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);
  const [readToEnd, setReadToEnd] = useState(false);
  const [agree, setAgree] = useState(false);
  const [fullName, setFullName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const box = useRef<HTMLDivElement>(null);
  const ids = { box: useId(), agree: useId(), name: useId(), hint: useId() };

  useEffect(() => {
    if (!API_URL || !isLoaded || !isSignedIn) return;
    let cancelled = false;
    Promise.all([call<AgreementText>("/legal/teacher-agreement"), call<{ signature: AgreementSignature | null }>("/teacher/agreement")]).then(
      ([txt, status]) => {
        if (cancelled) return;
        setText(txt);
        setSignature(status.signature);
        if (status.signature) onSigned?.(status.signature);
      },
      () => !cancelled && setLoadError(true),
    );
    return () => {
      cancelled = true;
    };
    // onSigned is a notification only: loading once is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call, isLoaded, isSignedIn]);

  // "Read to the end": the box was scrolled to its bottom (or the text fits without scrolling).
  const checkScroll = useCallback(() => {
    const el = box.current;
    if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setReadToEnd(true);
  }, []);
  useEffect(() => {
    if (text) requestAnimationFrame(checkScroll);
  }, [text, checkScroll]);

  const date = (iso: string) => new Intl.DateTimeFormat(tag, { dateStyle: "long", timeStyle: "short" }).format(new Date(iso));

  if (!API_URL) return <p className="rounded-2xl bg-beige px-5 py-4 text-sm text-navy-soft">{t("demo")}</p>;
  if (loadError) return <p role="alert" className="rounded-2xl bg-danger-100 px-5 py-4 text-sm text-danger-text">{t("loadError")}</p>;
  if (!text || signature === undefined) return <p role="status" className="text-sm text-muted">{t("loading")}</p>;

  if (signature) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-2xl bg-teal-50 px-5 py-4 text-teal-deep">
          <Icon name="shieldCheck" size={22} className="mt-0.5 shrink-0" />
          <div className="flex flex-col gap-1 text-sm">
            <p className="text-[15px] font-bold">{t("signedTitle")}</p>
            <p>{t("signedBy", { name: signature.fullName, date: date(signature.signedAt) })}</p>
            <p>{signature.emailedAt ? t("copySent") : t("copyAvailable")}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <Link href="/agreement-copy" target="_blank" className="font-semibold text-teal-dark underline hover:text-navy">
            {t("viewCopy")}
          </Link>
          <button
            type="button"
            disabled={resent === "sending" || resent === "sent"}
            onClick={() => {
              setResent("sending");
              call<{ emailed: boolean }>("/teacher/agreement/resend", { method: "POST" }).then(
                (r) => setResent(r.emailed ? "sent" : "error"),
                () => setResent("error"),
              );
            }}
            className="font-semibold text-navy-soft hover:text-navy disabled:opacity-60"
          >
            {resent === "sent" ? t("resent") : resent === "sending" ? t("resending") : t("resend")}
          </button>
          {resent === "error" && (
            <span role="alert" className="text-danger-text">
              {t("resendError")}
            </span>
          )}
        </div>
      </div>
    );
  }

  const sign = async () => {
    setError(null);
    if (!agree) return setError(t("tickToAgree"));
    if (fullName.trim().length < 3) return setError(t("typeName"));
    setPending(true);
    try {
      const res = await call<{ signature: AgreementSignature }>("/teacher/agreement/sign", {
        method: "POST",
        body: JSON.stringify({ fullName: fullName.trim(), version: text.version, sha256: text.sha256, agree: true }),
      });
      setSignature(res.signature);
      onSigned?.(res.signature);
    } catch (e) {
      setError(e instanceof ApiError && e.message ? e.message : t("signError"));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px] leading-relaxed text-navy-soft">{t("intro")}</p>
      <div
        ref={box}
        id={ids.box}
        tabIndex={0}
        role="document"
        aria-label={t("textLabel")}
        onScroll={checkScroll}
        className={`max-h-[460px] overflow-y-auto rounded-2xl border border-line bg-white p-5 sm:p-6 ${agreementProse}`}
        // The HTML comes from Amerivo's API, built from the agreement's text with every character escaped.
        dangerouslySetInnerHTML={{ __html: text.html }}
      />
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-muted">
        <span>{readToEnd ? t("version", { version: text.version }) : t("scrollToEnd")}</span>
        <Link href="/teacher-agreement" target="_blank" className="font-semibold text-teal-dark underline hover:text-navy">
          {t("openFull")}
        </Link>
      </div>

      <label htmlFor={ids.agree} className={`flex items-start gap-3 rounded-2xl bg-beige px-4 py-3.5 text-sm leading-relaxed ${readToEnd ? "" : "opacity-60"}`}>
        <input id={ids.agree} type="checkbox" className="mt-0.5 size-[18px] shrink-0" disabled={!readToEnd} checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>{t("agreeLabel")}</span>
      </label>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={ids.name} className="text-sm font-semibold">
          {t("nameLabel")}
        </label>
        <input
          id={ids.name}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={!readToEnd}
          autoComplete="name"
          maxLength={120}
          aria-describedby={ids.hint}
          placeholder={t("namePlaceholder")}
          className="h-12 rounded-xl border border-line bg-white px-4 text-[15px] text-navy focus:border-teal-dark focus:outline-none disabled:opacity-60"
        />
        {fullName.trim() && <p className="font-serif text-2xl text-navy italic" aria-hidden="true">{fullName.trim()}</p>}
        <p id={ids.hint} className="text-[13px] leading-normal text-muted">
          {t("nameHint")}
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-danger-100 px-4 py-3 text-sm font-semibold text-danger-text">
          {error}
        </p>
      )}
      <Button type="button" variant="teal" onClick={() => void sign()} disabled={pending || !readToEnd} className="self-start px-7 font-bold">
        {pending ? t("signing") : t("sign")}
      </Button>
    </div>
  );
}
