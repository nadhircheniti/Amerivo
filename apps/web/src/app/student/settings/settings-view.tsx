"use client";

import { useClerk } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { CountrySelect, LanguageSelect } from "@/components/ui/geo-selects";
import { Icon } from "@/components/ui/icon";
import { ApiError, API_URL } from "@/lib/api";
import { clerkEnabled } from "@/lib/auth-config";
import { useApi } from "@/lib/use-api";
import { Modal } from "../_components/modal";
import { Loadable, PageHeader } from "../_components/states";
import { demoProfile } from "../_lib/demo";
import type { Profile } from "../_lib/types";
import { useStudentData } from "../_lib/use-student-data";

const noop = () => () => {};
const useIsBrowser = () => useSyncExternalStore(noop, () => true, () => false);

/** Signs out after the account is deleted (Clerk when enabled; otherwise just leaves the space). */
const useSignOutHome = clerkEnabled
  ? function useClerkSignOutHome() {
      const { signOut } = useClerk();
      return useCallback(() => signOut({ redirectUrl: "/" }), [signOut]);
    }
  : function usePlainSignOutHome() {
      return useCallback(() => {
        window.location.replace("/");
      }, []);
    };

export function SettingsView() {
  const t = useTranslations("student.settings");
  const state = useStudentData<Profile>("/me/profile", () => demoProfile());
  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
      <PageHeader title={t("title")} description={t("description")} />
      <Loadable state={state}>
        {(p) => (
          <>
            <ProfileForm key={p.id} profile={p} onSaved={(next) => state.setData(() => next)} />
            <section className="flex flex-col gap-3 rounded-3xl bg-white p-6 sm:p-8" aria-labelledby="language-title">
              <h2 id="language-title" className="text-[19px] font-bold">
                {t("languageTitle")}
              </h2>
              <p className="text-sm text-navy-soft">{t("languageText")}</p>
              <LanguageSwitcher className="self-start rounded-xl border border-line px-3.5 py-2" />
            </section>
            <DeleteAccount />
          </>
        )}
      </Loadable>
    </div>
  );
}

function TimeZoneSelect({ value, onChange, id }: { value: string; onChange: (v: string) => void; id?: string }) {
  const browser = useIsBrowser();
  const zones = useMemo(() => {
    if (!browser) return [value];
    let list: string[] = [];
    try {
      list = Intl.supportedValuesOf("timeZone");
    } catch {
      list = [];
    }
    return list.includes(value) ? list : [value, ...list];
  }, [browser, value]);
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      {zones.map((z) => (
        <option key={z} value={z}>
          {z.replace(/_/g, " ")}
        </option>
      ))}
    </Select>
  );
}

function ProfileForm({ profile, onSaved }: { profile: Profile; onSaved: (p: Profile) => void }) {
  const t = useTranslations("student.settings");
  const { call } = useApi();
  const [form, setForm] = useState({
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone ?? "",
    country: profile.country ?? "",
    nativeLanguage: profile.nativeLanguage ?? "",
    timezone: profile.timezone,
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (v: string) => {
    setSaved(false);
    setForm((f) => ({ ...f, [k]: v }));
  };
  const deviceTz = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return null;
    }
  })();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) return setError(t("namesRequired"));
    setBusy(true);
    setError(null);
    try {
      const body = { ...form, firstName: form.firstName.trim(), lastName: form.lastName.trim(), phone: form.phone.trim() };
      const next = API_URL ? await call<Profile>("/me/profile", { method: "PUT", body: JSON.stringify(body) }) : { ...profile, ...body, phone: body.phone || null, country: body.country || null, nativeLanguage: body.nativeLanguage || null };
      onSaved(next);
      setSaved(true);
      // Times across the space are shown in the account's time zone: reload so they all follow.
      if (API_URL && next.timezone !== profile.timezone) window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 rounded-3xl bg-white p-6 sm:p-8" aria-labelledby="profile-title" noValidate>
      <h2 id="profile-title" className="text-[19px] font-bold">
        {t("profileTitle")}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("firstName")}>
          <Input value={form.firstName} onChange={(e) => set("firstName")(e.target.value)} maxLength={80} required autoComplete="given-name" />
        </Field>
        <Field label={t("lastName")}>
          <Input value={form.lastName} onChange={(e) => set("lastName")(e.target.value)} maxLength={80} required autoComplete="family-name" />
        </Field>
        <Field label={t("email")} hint={t("emailHint")}>
          <Input value={profile.email} readOnly aria-readonly="true" className="bg-beige" />
        </Field>
        <Field label={t("phone")}>
          <Input type="tel" value={form.phone} onChange={(e) => set("phone")(e.target.value)} maxLength={30} placeholder="+1 (555) 000-0000" autoComplete="tel" />
        </Field>
        <Field label={t("country")}>
          <CountrySelect value={form.country} onChange={(e) => set("country")(e.target.value)} placeholder={t("countryPlaceholder")} />
        </Field>
        <Field label={t("nativeLanguage")}>
          <LanguageSelect value={form.nativeLanguage} onChange={(e) => set("nativeLanguage")(e.target.value)} placeholder={t("nativeLanguagePlaceholder")} />
        </Field>
        <Field
          label={t("timezone")}
          className="sm:col-span-2"
          hint={
            deviceTz && deviceTz !== form.timezone ? (
              <button type="button" className="font-semibold text-teal-dark underline hover:text-navy" onClick={() => set("timezone")(deviceTz)}>
                {t("useDeviceTz", { tz: deviceTz.replace(/_/g, " ") })}
              </button>
            ) : (
              t("timezoneHint")
            )
          }
        >
          <TimeZoneSelect value={form.timezone} onChange={set("timezone")} />
        </Field>
      </div>
      {error && (
        <p className="text-sm text-danger-text" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={busy}>
          {busy ? t("saving") : t("save")}
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm font-semibold text-teal-dark" role="status">
            <Icon name="check" size={16} strokeWidth={2.4} />
            {t("saved")}
          </span>
        )}
      </div>
    </form>
  );
}

function DeleteAccount() {
  const t = useTranslations("student.settings.delete");
  const { call } = useApi();
  const signOutHome = useSignOutHome();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; lessons: boolean } | null>(null);
  const word = t("confirmWord");
  const ready = understood && typed.trim().toLocaleUpperCase() === word.toLocaleUpperCase();

  const remove = async () => {
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      if (API_URL) await call("/me", { method: "DELETE" });
    } catch (e) {
      const conflict = e instanceof ApiError && e.status === 409;
      setError({ text: conflict ? t("hasLessons") : e instanceof Error ? e.message : String(e), lessons: conflict });
      setBusy(false);
      return;
    }
    // The sign-in identity may already be gone: whatever happens, leave the space.
    try {
      await signOutHome();
    } catch {
      window.location.replace("/");
    }
  };

  return (
    <section className="flex flex-col gap-3 rounded-3xl border border-danger/30 bg-white p-6 sm:p-8" aria-labelledby="delete-title">
      <h2 id="delete-title" className="text-[19px] font-bold text-danger-text">
        {t("title")}
      </h2>
      <p className="text-sm text-navy-soft">{t("text")}</p>
      <Button variant="dangerOutline" className="self-start" onClick={() => setOpen(true)}>
        {t("button")}
      </Button>
      <Modal
        open={open}
        onClose={() => {
          if (busy) return;
          setOpen(false);
          setTyped("");
          setUnderstood(false);
          setError(null);
        }}
        title={t("dialogTitle")}
      >
        <ul className="flex list-disc flex-col gap-1.5 ps-5 text-sm text-navy-soft">
          <li>{t("consequence1")}</li>
          <li>{t("consequence2")}</li>
          <li>{t("consequence3")}</li>
          <li>{t("consequence4")}</li>
        </ul>
        <label className="flex items-start gap-2.5 text-sm">
          <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} className="mt-0.5 size-[18px] shrink-0" />
          {t("understand")}
        </label>
        <Field label={t("typeToConfirm", { word })}>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} />
        </Field>
        {error && (
          <p className="text-sm text-danger-text" role="alert">
            {error.text}{" "}
            {error.lessons && (
              <Link href="/student/lessons" className="font-semibold underline">
                {t("goToLessons")}
              </Link>
            )}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outlineLight" onClick={() => setOpen(false)} disabled={busy}>
            {t("keep")}
          </Button>
          <Button variant="danger" onClick={remove} disabled={!ready || busy}>
            {busy ? t("deleting") : t("confirm")}
          </Button>
        </div>
      </Modal>
    </section>
  );
}
