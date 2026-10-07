import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { FocusHeader } from "@/components/layout/focus-header";
import { Icon } from "@/components/ui/icon";
import { Avatar, Card, CheckItem } from "@/components/ui/primitives";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { currentStudent, formatUsd } from "@/lib/mock-data";
import { getTeacherBySlug } from "@/lib/teachers";
import { describeOrder, describeSlot, isLessonType } from "./_lib";
import { CheckoutTotal, DiscountProvider, PromoCodeBox } from "./discount";
import { PaymentForm } from "./payment-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("checkout.page");
  return { title: t("metaTitle") };
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const cityOf = (tz: string) => tz.split("/").pop()?.replace(/_/g, " ") ?? tz;

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-end">{value}</dd>
    </div>
  );
}

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("checkout.page");
  const tOrder = await getTranslations("checkout.order");
  const ts = await getTranslations("common.specialties");
  const teacher = await getTeacherBySlug(first(sp.teacher) ?? "sarah-mitchell");
  if (!teacher) notFound();
  const studentTz = validTz(first(sp.tz)) ?? currentStudent.timezone;
  const rawType = first(sp.type);
  const order = describeOrder(teacher, isLessonType(rawType) ? rawType : "single");
  const slot = describeSlot(first(sp.slot) ?? "Wed, Oct 14 · 18:00", studentTz, teacher.timezone, locale);
  const isPack = order.count > 1;
  const firstName = teacher.name.split(" ")[0];
  const amount = formatUsd(order.total, locale);
  const cta = order.total === 0 ? t("ctaFree") : isPack ? t("ctaPayPackage", { amount }) : t("ctaPayLesson", { amount });
  const specialty = teacher.specialties[0];
  const teacherCity = teacher.city.split(",")[0];

  return (
    <>
      <FocusHeader
        right={
          <span className="flex items-center gap-2 text-sm text-muted">
            <Icon name="lock" size={16} strokeWidth={2} className="shrink-0 text-teal-dark" />
            <span>
              {t("secureCheckout")}
              <span className="hidden sm:inline"> · {t("paymentsByStripe")}</span>
            </span>
          </span>
        }
      />
      <DiscountProvider>
        <main className="mx-auto flex max-w-[1440px] flex-col items-start gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:px-20 lg:py-11">
          <Card className="flex w-full min-w-0 flex-1 flex-col gap-[26px] p-6 sm:p-10">
            <div className="flex flex-col gap-2">
              <Link href={`/teachers/${teacher.slug}`} className="inline-flex items-center gap-1 self-start text-sm font-semibold text-teal-dark hover:text-navy">
                <Icon name="chevronLeft" size={16} strokeWidth={2} />
                {t("backToCalendar", { name: firstName })}
              </Link>
              <h1 className="text-[28px] font-extrabold sm:text-[32px]">{t("title")}</h1>
            </div>
            <PaymentForm
              ctaLabel={cta}
              free={order.total === 0}
              booking={
                slot.iso
                  ? {
                      teacherSlug: teacher.slug,
                      offer: order.type,
                      startsAt: slot.iso,
                    }
                  : null
              }
            />
          </Card>

          <aside className="flex w-full shrink-0 flex-col gap-5 lg:w-[440px]">
            <Card className="flex flex-col gap-5 p-7">
              <h2 className="text-xl font-bold">{t("orderSummary")}</h2>
              <div className="flex items-center gap-3.5">
                <Avatar initials={teacher.initials} tone={teacher.tone} size={60} />
                <div>
                  <p className="text-base font-semibold">{teacher.name}</p>
                  <p className="text-sm text-muted">{specialty && ts.has(specialty as never) ? ts(specialty as never) : specialty}</p>
                </div>
              </div>
              <dl className="flex flex-col gap-3 border-t border-line-soft pt-[18px] text-[15px]">
                <Row label={t("lesson")} value={tOrder(order.type)} />
                <Row label={isPack ? t("firstLesson") : t("date")} value={slot.date} />
                {slot.studentTime && <Row label={t("yourTime")} value={t("timeWithCity", { time: slot.studentTime, city: cityOf(studentTz) })} />}
                {slot.teacherTime && (
                  <Row
                    label={t("teacherTime")}
                    value={
                      slot.teacherDate
                        ? t("dateTimeWithCity", { date: slot.teacherDate, time: slot.teacherTime, city: teacherCity })
                        : t("timeWithCity", { time: slot.teacherTime, city: teacherCity })
                    }
                  />
                )}
              </dl>
              <dl className="flex flex-col gap-3 border-t border-line-soft pt-[18px] text-[15px]">
                <Row
                  label={isPack ? t("unitPrice", { count: order.count, price: formatUsd(teacher.priceUsd, locale) }) : t("lessonPrice")}
                  value={formatUsd(order.subtotal, locale)}
                />
                <Row label={t("packageDiscount")} value={order.discount > 0 ? t("discountValue", { amount: formatUsd(order.discount, locale) }) : "—"} />
                <CheckoutTotal amount={amount} />
              </dl>
              {order.type !== "trial" && slot.iso && <PromoCodeBox teacherSlug={teacher.slug} offer={order.type} />}
            </Card>

            <div className="flex flex-col gap-3 rounded-3xl bg-navy px-7 py-6 text-sm text-white">
              <h2 className="font-display text-[15px] font-bold">{t("afterPayment")}</h2>
              <ul className="flex flex-col gap-3 text-ink-soft">
                <CheckItem className="gap-2.5" iconClassName="text-yellow">
                  {t("afterConfirmed", { name: firstName })}
                </CheckItem>
                <CheckItem className="gap-2.5" iconClassName="text-yellow">
                  {t("afterReminders")}
                </CheckItem>
                <CheckItem className="gap-2.5" iconClassName="text-yellow">
                  {t("afterJoin")}
                </CheckItem>
              </ul>
            </div>
          </aside>
        </main>
      </DiscountProvider>
    </>
  );
}

function validTz(tz: string | undefined) {
  if (!tz) return null;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return null;
  }
}
