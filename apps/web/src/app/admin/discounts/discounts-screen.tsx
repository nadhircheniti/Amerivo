"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/primitives";
import { Confirm, LoadGate, Notice, PageShell, StaleError, control, fullName, panel, td, th, useFormat } from "../_components/live/ui";
import { errorText, isLive, useAdminData } from "../_components/live/use-admin-data";

type Status = "available" | "reserved" | "used" | "disabled" | "expired";
export type DiscountCode = {
  id: string;
  code: string;
  percent: number;
  note: string | null;
  createdAt: string;
  expiresAt: string | null;
  disabledAt: string | null;
  claimedAt: string | null;
  claimedBy: { id: string; firstName: string; lastName: string; email: string } | null;
  status: Status;
};
type DiscountList = { codes: DiscountCode[]; usedCount: number; discountedCents: number };

const TONE: Record<Status, BadgeTone> = { available: "success", reserved: "warning", used: "info", disabled: "neutral", expired: "neutral" };

const sample: DiscountList = {
  codes: [
    { id: "d1", code: "AMV-7KQ2-XH9M", percent: 100, note: "Gift — Maria", createdAt: "2026-10-06T09:00:00Z", expiresAt: null, disabledAt: null, claimedAt: null, claimedBy: null, status: "available" },
    {
      id: "d2",
      code: "WELCOME20",
      percent: 20,
      note: null,
      createdAt: "2026-10-01T09:00:00Z",
      expiresAt: "2026-12-31T23:59:00Z",
      disabledAt: null,
      claimedAt: "2026-10-03T15:20:00Z",
      claimedBy: { id: "s1", firstName: "Lucas", lastName: "Martin", email: "lucas@example.com" },
      status: "used",
    },
  ],
  usedCount: 1,
  discountedCents: 700,
};

/** Admin: one-time discount codes (a percentage off one lesson or package, usable once in total). */
export function DiscountsScreen() {
  const t = useTranslations("admin.discountsPage");
  const f = useFormat();
  const [notice, setNotice] = useState("");
  const [disabling, setDisabling] = useState<DiscountCode | null>(null);
  const { data, error, retrying, reload, call } = useAdminData<DiscountList>("/admin/discount-codes", sample);

  return (
    <PageShell title={t("title")} subtitle={t("subtitle")}>
      <CreateForm
        onCreated={(c) => {
          setNotice(t("created", { code: c.code }));
          reload();
        }}
        call={call}
      />
      <Notice text={notice} />
      <LoadGate data={data} error={error} retrying={retrying} reload={reload} what={t("what")}>
        {(list) => (
          <section className={panel} aria-labelledby="codes-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="codes-heading" className="text-lg font-bold">
                {t("listTitle")}
              </h2>
              <p className="text-sm text-muted">{t("summary", { used: list.usedCount, amount: f.money(list.discountedCents) })}</p>
            </div>
            <StaleError error={error} reload={reload} retrying={retrying} />
            {list.codes.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">{t("empty")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <caption className="sr-only">{t("listTitle")}</caption>
                  <thead>
                    <tr>
                      <th scope="col" className={th}>{t("colCode")}</th>
                      <th scope="col" className={th}>{t("colPercent")}</th>
                      <th scope="col" className={th}>{t("colStatus")}</th>
                      <th scope="col" className={th}>{t("colUsedBy")}</th>
                      <th scope="col" className={th}>{t("colNote")}</th>
                      <th scope="col" className={th}>{t("colCreated")}</th>
                      <th scope="col" className={th}>{t("colExpires")}</th>
                      <th scope="col" className={th}>
                        <span className="sr-only">{t("colActions")}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.codes.map((c) => (
                      <tr key={c.id}>
                        <td className={td}>
                          <code className="font-mono text-[13px] font-bold tracking-wide">{c.code}</code>
                          <CopyButton text={c.code} />
                        </td>
                        <td className={td}>{t("percentValue", { percent: c.percent })}</td>
                        <td className={td}>
                          <Badge tone={TONE[c.status]}>{t(`status.${c.status}`)}</Badge>
                        </td>
                        <td className={td}>{c.claimedBy ? `${fullName(c.claimedBy)} · ${f.date(c.claimedAt!)}` : "—"}</td>
                        <td className={`${td} max-w-[240px] truncate whitespace-normal`}>{c.note ?? "—"}</td>
                        <td className={td}>{f.date(c.createdAt)}</td>
                        <td className={td}>{c.expiresAt ? f.date(c.expiresAt) : t("never")}</td>
                        <td className={td}>
                          {c.status === "available" && (
                            <button type="button" onClick={() => setDisabling(c)} className="font-semibold text-danger-text hover:text-navy">
                              {t("disable")}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {disabling && (
              <Confirm
                tone="danger"
                question={t("disableConfirm", { code: disabling.code })}
                confirmLabel={t("disable")}
                onCancel={() => setDisabling(null)}
                onConfirm={async () => {
                  if (isLive) await call(`/admin/discount-codes/${disabling.id}/disable`, { method: "POST" });
                  setNotice(t("disabled", { code: disabling.code }));
                  setDisabling(null);
                  reload();
                }}
              />
            )}
          </section>
        )}
      </LoadGate>
    </PageShell>
  );
}

function CreateForm({ onCreated, call }: { onCreated: (c: DiscountCode) => void; call: <T>(path: string, init?: RequestInit) => Promise<T> }) {
  const t = useTranslations("admin.discountsPage");
  const [percent, setPercent] = useState("100");
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [expires, setExpires] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ids = { percent: useId(), code: useId(), note: useId(), expires: useId(), hint: useId() };
  const n = Number(percent);
  const validPercent = Number.isInteger(n) && n >= 1 && n <= 100;

  const submit = async () => {
    if (!validPercent) {
      setError(t("percentInvalid"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // The expiry date is the end of that day (UTC).
      const body = { percent: n, code: code.trim() || undefined, note: note.trim() || undefined, expiresAt: expires ? new Date(`${expires}T23:59:59Z`).toISOString() : undefined };
      const created = isLive
        ? await call<DiscountCode>("/admin/discount-codes", { method: "POST", body: JSON.stringify(body) })
        : ({ ...sample.codes[0], id: "new", code: body.code?.toUpperCase() ?? "AMV-DEMO-CODE", percent: n } as DiscountCode);
      onCreated(created);
      setCode("");
      setNote("");
      setExpires("");
    } catch (e) {
      setError(errorText(e, t("createError")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className={panel}
      aria-labelledby="create-heading"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <h2 id="create-heading" className="text-lg font-bold">
        {t("createTitle")}
      </h2>
      <p id={ids.hint} className="text-sm text-muted">
        {t("createHint")}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[140px_1fr_1fr_180px]">
        <label className="flex flex-col gap-1.5 text-sm font-semibold" htmlFor={ids.percent}>
          {t("percentLabel")}
          <span className="flex items-center gap-2">
            <input
              id={ids.percent}
              type="number"
              min={1}
              max={100}
              step={1}
              required
              inputMode="numeric"
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              aria-invalid={!validPercent}
              className={`${control} w-24`}
            />
            <span aria-hidden="true">%</span>
          </span>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold" htmlFor={ids.code}>
          {t("codeLabel")}
          <input
            id={ids.code}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={32}
            placeholder={t("codePlaceholder")}
            autoComplete="off"
            spellCheck={false}
            className={`${control} font-mono uppercase placeholder:font-sans placeholder:normal-case`}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold" htmlFor={ids.note}>
          {t("noteLabel")}
          <input id={ids.note} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder={t("notePlaceholder")} className={control} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold" htmlFor={ids.expires}>
          {t("expiresLabel")}
          <input id={ids.expires} type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className={control} />
        </label>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger-text">
          {error}
        </p>
      )}
      <div>
        <Button type="submit" variant="teal" disabled={busy}>
          {busy ? t("creating") : t("create")}
        </Button>
      </div>
    </form>
  );
}

function CopyButton({ text }: { text: string }) {
  const t = useTranslations("admin.discountsPage");
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="ms-2 text-xs font-semibold text-teal-dark hover:text-navy"
    >
      {copied ? t("copied") : t("copy")}
      <span className="sr-only"> {text}</span>
    </button>
  );
}
