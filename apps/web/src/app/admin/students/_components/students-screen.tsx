"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Avatar, type AvatarTone } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { LiveBookingsTable } from "../../_components/live/bookings";
import { sampleStudentDetail, sampleStudents } from "../../_components/live/samples";
import type { AdminStudent, StudentDetail, StudentList } from "../../_components/live/types";
import {
  Confirm,
  Drawer,
  Fact,
  LoadGate,
  Notice,
  PageShell,
  Pagination,
  PillTabs,
  SearchBox,
  StaleError,
  StatusBadge,
  fullName,
  linkAction,
  panel,
  td,
  th,
  useDebounced,
  useFormat,
} from "../../_components/live/ui";
import { isLive, useAdminData } from "../../_components/live/use-admin-data";
import { useApi } from "@/lib/use-api";

type Tab = "all" | "active" | "blocked" | "pending_verification";
const TABS: Tab[] = ["all", "active", "blocked", "pending_verification"];
const TONES: AvatarTone[] = ["teal", "sky", "lilac", "orange", "yellow", "sand"];
const toneOf = (id: string) => TONES[[...id].reduce((n, c) => n + c.charCodeAt(0), 0) % TONES.length];
const initials = (s: AdminStudent) => `${s.firstName.charAt(0)}${s.lastName.charAt(0)}`.toUpperCase() || "?";

export function StudentsScreen() {
  const t = useTranslations("admin.studentsPage");
  const fmt = useFormat();
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [blockMode, setBlockMode] = useState(false);
  const q = useDebounced(search.trim());

  const path = useMemo(() => {
    const p = new URLSearchParams();
    if (tab !== "all") p.set("status", tab);
    if (q) p.set("search", q);
    p.set("page", String(page));
    return `/admin/students?${p}`;
  }, [tab, q, page]);

  const sample = useMemo<StudentList>(() => {
    const items = sampleStudents.items.filter((s) => (tab === "all" || s.status === tab) && (!q || `${fullName(s)} ${s.email}`.toLowerCase().includes(q.toLowerCase())));
    return { ...sampleStudents, items, total: items.length };
  }, [tab, q]);

  const { data, error, retrying, reload } = useAdminData<StudentList>(path, sample);
  const selected = data?.items.find((s) => s.id === openId) ?? null;

  const levelLabel = useLevel();

  return (
    <PageShell
      title={t("title")}
      subtitle={t("subtitle")}
      actions={<SearchBox value={search} onChange={(v) => (setSearch(v), setPage(1))} label={t("search")} placeholder={t("searchPlaceholder")} />}
    >
      <PillTabs
        label={t("statusTabs")}
        value={tab}
        onChange={(v) => (setTab(v), setPage(1))}
        tabs={TABS.map((id) => ({ id, label: t(`tabs.${id}`, { count: data?.counts[id] ?? 0 }) }))}
      />
      <Notice text={notice} />
      <LoadGate data={data} error={error} retrying={retrying} reload={reload} what={t("what")}>
        {(d) => (
          <section className={panel}>
            <StaleError error={error} reload={reload} retrying={retrying} />
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <caption className="sr-only">{t("title")}</caption>
                <thead>
                  <tr>
                    <th scope="col" className={th}>
                      {t("student")}
                    </th>
                    <th scope="col" className={th}>
                      {t("country")}
                    </th>
                    <th scope="col" className={th}>
                      {t("level")}
                    </th>
                    <th scope="col" className={th}>
                      {t("lessons")}
                    </th>
                    <th scope="col" className={th}>
                      {t("totalPaid")}
                    </th>
                    <th scope="col" className={th}>
                      {t("joined")}
                    </th>
                    <th scope="col" className={th}>
                      {t("status")}
                    </th>
                    <th scope="col" className={cn(th, "text-end")}>
                      {t("actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {d.items.length === 0 && (
                    <tr>
                      <td colSpan={8} className={cn(td, "text-center text-muted")}>
                        {q || tab !== "all" ? t("emptyFiltered") : t("empty")}
                      </td>
                    </tr>
                  )}
                  {d.items.map((s) => (
                    <tr key={s.id}>
                      <td className={td}>
                        <span className="flex items-center gap-3">
                          <Avatar initials={initials(s)} tone={toneOf(s.id)} size={36} />
                          <span className="flex flex-col">
                            <span className="font-semibold">{fullName(s)}</span>
                            <span className="text-[13px] text-muted">{s.email}</span>
                          </span>
                        </span>
                      </td>
                      <td className={td}>{s.country ?? <span className="text-muted">—</span>}</td>
                      <td className={td}>{levelLabel(s)}</td>
                      <td className={td}>{fmt.number(s.lessonsCompleted)}</td>
                      <td className={td}>{fmt.money(s.totalPaidCents)}</td>
                      <td className={td}>{fmt.date(s.joinedAt)}</td>
                      <td className={td}>
                        <StatusBadge kind="user" value={s.status} />
                      </td>
                      <td className={cn(td, "text-end")}>
                        <span className="inline-flex gap-3.5">
                          <button type="button" className={linkAction} onClick={() => (setOpenId(s.id), setBlockMode(false))} aria-label={t("viewAria", { name: fullName(s) })}>
                            {t("view")}
                          </button>
                          <button
                            type="button"
                            className={linkAction}
                            onClick={() => (setOpenId(s.id), setBlockMode(true))}
                            aria-label={t(s.status === "blocked" ? "unblockAria" : "blockAria", { name: fullName(s) })}
                          >
                            {s.status === "blocked" ? t("unblock") : t("block")}
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={d.page} pageSize={d.pageSize} total={d.total} onPage={setPage} label={t("pagination")} />
          </section>
        )}
      </LoadGate>
      {selected && (
        <StudentDrawer
          key={selected.id}
          student={selected}
          blockMode={blockMode}
          onClose={() => setOpenId(null)}
          onChanged={(n, close) => {
            setNotice(n);
            if (close) setOpenId(null);
            reload();
          }}
        />
      )}
    </PageShell>
  );
}

function useLevel() {
  const t = useTranslations("admin.studentsPage.selfLevel");
  return (s: Pick<AdminStudent, "cefrLevel" | "selfLevel">) => s.cefrLevel ?? (s.selfLevel && t.has(s.selfLevel as never) ? t(s.selfLevel as never) : "—");
}

function StudentDrawer({
  student: s,
  blockMode,
  onClose,
  onChanged,
}: {
  student: AdminStudent;
  blockMode: boolean;
  onClose: () => void;
  onChanged: (notice: string, close: boolean) => void;
}) {
  const t = useTranslations("admin.studentsPage");
  const tl = useTranslations("admin.live");
  const fmt = useFormat();
  const { call } = useApi();
  const levelLabel = useLevel();
  const [confirming, setConfirming] = useState(blockMode);
  const sample = useMemo(() => sampleStudentDetail(s.id), [s.id]);
  const detail = useAdminData<StudentDetail>(`/admin/students/${s.id}`, sample);
  const name = fullName(s);
  const blocked = s.status === "blocked";
  const tg = useTranslations("admin.studentsPage.goals");

  return (
    <Drawer title={name} onClose={onClose}>
      <section className="flex flex-col gap-4 rounded-[18px] bg-white p-4">
        <div className="flex items-center gap-3">
          <Avatar initials={initials(s)} tone={toneOf(s.id)} size={52} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] text-muted">{s.email}</span>
            <span className="mt-1">
              <StatusBadge kind="user" value={s.status} />
            </span>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-3.5">
          <Fact label={t("country")}>{s.country ?? "—"}</Fact>
          <Fact label={t("timezone")}>{s.timezone}</Fact>
          <Fact label={t("level")}>{levelLabel(s)}</Fact>
          <Fact label={t("goal")}>{s.goal && tg.has(s.goal as never) ? tg(s.goal as never) : "—"}</Fact>
          <Fact label={t("lessons")}>{fmt.number(s.lessonsCompleted)}</Fact>
          <Fact label={t("upcoming")}>{fmt.number(s.upcomingLessons)}</Fact>
          <Fact label={t("totalPaid")}>{fmt.money(s.totalPaidCents)}</Fact>
          <Fact label={t("joined")}>{fmt.date(s.joinedAt)}</Fact>
          {s.phone && <Fact label={t("phone")}>{s.phone}</Fact>}
          {s.lastLessonAt && <Fact label={t("lastLesson")}>{fmt.date(s.lastLessonAt)}</Fact>}
        </dl>
        <a href={`mailto:${s.email}`} className={cn(linkAction, "self-start text-sm")}>
          {t("email")}
        </a>
      </section>

      {confirming ? (
        <Confirm
          question={blocked ? t("confirmUnblock", { name }) : t("confirmBlock", { name })}
          confirmLabel={blocked ? t("confirmUnblockYes") : t("confirmBlockYes")}
          tone={blocked ? "teal" : "danger"}
          onCancel={() => setConfirming(false)}
          onConfirm={async () => {
            if (!isLive) throw new Error(tl("demoAction"));
            await call(`/admin/users/${s.id}/status`, { method: "POST", body: JSON.stringify({ status: blocked ? "active" : "blocked" }) });
            onChanged(blocked ? t("noticeUnblocked", { name }) : t("noticeBlocked", { name }), true);
          }}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className={cn(
              "inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold",
              blocked ? "bg-teal-dark text-white hover:bg-[#12665d]" : "border border-danger bg-white text-[#a52f22] hover:bg-danger-100",
            )}
          >
            {blocked ? t("unblockStudent") : t("blockStudent")}
          </button>
        </div>
      )}
      {!blocked && <p className="text-[13px] text-muted">{t("blockHint")}</p>}

      <section className="flex flex-col gap-2 rounded-[18px] bg-white p-4">
        <h3 className="text-base font-bold">{t("recentBookings")}</h3>
        <LoadGate data={detail.data} error={detail.error} retrying={detail.retrying} reload={detail.reload} what={t("whatDetail")}>
          {(d) => (
            <>
              <LiveBookingsTable rows={d.bookings} caption={t("recentBookings")} empty={t("noBookings")} onChanged={(n) => (onChanged(n, false), detail.reload())} />
              {d.bookingsTotal > d.bookings.length && <p className="text-[13px] text-muted">{t("moreBookings", { count: d.bookingsTotal - d.bookings.length })}</p>}
              {d.disputes.length > 0 && <p className="text-[13px] text-orange-text">{t("disputesCount", { count: d.disputes.length })}</p>}
            </>
          )}
        </LoadGate>
      </section>
    </Drawer>
  );
}
