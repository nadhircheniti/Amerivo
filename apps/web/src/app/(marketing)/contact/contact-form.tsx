"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { API_URL, apiFetch } from "@/lib/api";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/contact";
import { TOPICS, type Topic } from "./topics";

/** Public contact form → POST /contact (stored in the admin support inbox, copied to the support mailbox). */
export function ContactForm({ initialTopic }: { initialTopic: Topic }) {
  const t = useTranslations("marketing.contact");
  const locale = useLocale();
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(form: HTMLFormElement) {
    const data = new FormData(form);
    const body = {
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      topic: String(data.get("topic") ?? "general"),
      message: String(data.get("message") ?? "").trim(),
      website: String(data.get("website") ?? ""),
      locale,
    };
    if (body.message.length < 10) return setError(t("errors.messageShort"));
    if (!API_URL) {
      // Demo mode (no API): open the visitor's mail app instead.
      window.open(`${CONTACT_MAILTO}?subject=${encodeURIComponent(t(`topics.${body.topic as Topic}`))}&body=${encodeURIComponent(body.message)}`, "_self");
      return;
    }
    setState("sending");
    setError(null);
    try {
      await apiFetch("/contact", { method: "POST", body: JSON.stringify(body) });
      setState("sent");
    } catch (e) {
      setState("idle");
      const status = (e as { status?: number }).status;
      setError(status === 429 ? t("errors.tooMany") : status === 400 ? t("errors.invalid") : t("errors.generic", { email: CONTACT_EMAIL }));
    }
  }

  if (state === "sent") {
    return (
      <div className="flex flex-col items-start gap-4 self-start rounded-[28px] bg-white p-8 lg:p-10" role="status">
        <span className="flex size-14 items-center justify-center rounded-full bg-teal-100 text-teal-dark">
          <Icon name="check" size={26} strokeWidth={2.5} />
        </span>
        <h2 className="font-display text-2xl font-bold">{t("sentTitle")}</h2>
        <p className="text-[15px] leading-relaxed text-navy-soft">{t("sentBody")}</p>
        <Button variant="outline" onClick={() => setState("idle")}>
          {t("sendAnother")}
        </Button>
      </div>
    );
  }

  return (
    <form
      className="relative grid grid-cols-1 gap-5 self-start rounded-[28px] bg-white p-6 sm:grid-cols-2 lg:p-10"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(e.currentTarget);
      }}
    >
      <h2 className="font-display text-2xl font-bold sm:col-span-2">{t("formTitle")}</h2>
      <Field label={t("fields.name")}>
        <Input name="name" autoComplete="name" required minLength={2} maxLength={120} />
      </Field>
      <Field label={t("fields.email")}>
        <Input name="email" type="email" autoComplete="email" required maxLength={200} dir="ltr" />
      </Field>
      <Field label={t("fields.topic")} className="sm:col-span-2">
        <Select name="topic" defaultValue={initialTopic}>
          {TOPICS.map((x) => (
            <option key={x} value={x}>
              {t(`topics.${x}`)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("fields.message")} className="sm:col-span-2" hint={t("fields.messageHint")}>
        <Textarea name="message" rows={7} required minLength={10} maxLength={5000} />
      </Field>
      {/* Honeypot: invisible to people, bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {error && (
        <p role="alert" className="rounded-2xl bg-danger-100 px-5 py-4 text-sm font-semibold text-danger-text sm:col-span-2">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-muted">{t("privacy")}</p>
        <Button type="submit" variant="teal" size="lg" className="font-bold" disabled={state === "sending"}>
          {state === "sending" ? t("sending") : t("send")}
        </Button>
      </div>
    </form>
  );
}
