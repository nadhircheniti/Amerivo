import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { FocusHeader } from "@/components/layout/focus-header";
import { Icon } from "@/components/ui/icon";
import { Avatar, Card, CheckItem } from "@/components/ui/primitives";
import { currentStudent, formatUsd, getTeacher, teachers } from "@/lib/mock-data";
import { describeOrder, describeSlot, isLessonType } from "./_lib";
import { PaymentForm } from "./payment-form";

export const metadata: Metadata = { title: "Confirm and pay" };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const cityOf = (tz: string) => tz.split("/").pop()?.replace(/_/g, " ") ?? tz;

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const teacher = getTeacher(first(sp.teacher) ?? "sarah-mitchell") ?? teachers[0];
  const rawType = first(sp.type);
  const order = describeOrder(teacher, isLessonType(rawType) ? rawType : "single");
  const slot = describeSlot(first(sp.slot) ?? "Wed, Oct 14 · 18:00", currentStudent.timezone, teacher.timezone);
  const isPack = order.count > 1;
  const firstName = teacher.name.split(" ")[0];
  const cta = order.total === 0 ? "Confirm free trial lesson" : `Pay ${formatUsd(order.total)} and confirm ${isPack ? "package" : "lesson"}`;

  return (
    <>
      <FocusHeader
        right={
          <span className="flex items-center gap-2 text-sm text-muted">
            <Icon name="lock" size={16} strokeWidth={2} className="shrink-0 text-teal-dark" />
            <span>
              Secure checkout<span className="hidden sm:inline"> · Payments by Stripe</span>
            </span>
          </span>
        }
      />
      <main className="mx-auto flex max-w-[1440px] flex-col items-start gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:px-20 lg:py-11">
        <Card className="flex w-full min-w-0 flex-1 flex-col gap-[26px] p-6 sm:p-10">
          <div className="flex flex-col gap-2">
            <Link href={`/teachers/${teacher.slug}`} className="inline-flex items-center gap-1 self-start text-sm font-semibold text-teal-dark hover:text-navy">
              <Icon name="chevronLeft" size={16} strokeWidth={2} />
              Back to {firstName}&apos;s calendar
            </Link>
            <h1 className="text-[28px] font-extrabold sm:text-[32px]">Confirm and pay</h1>
          </div>
          <PaymentForm ctaLabel={cta} />
        </Card>

        <aside className="flex w-full shrink-0 flex-col gap-5 lg:w-[440px]">
          <Card className="flex flex-col gap-5 p-7">
            <h2 className="text-xl font-bold">Order summary</h2>
            <div className="flex items-center gap-3.5">
              <Avatar initials={teacher.initials} tone={teacher.tone} size={60} />
              <div>
                <p className="text-base font-semibold">{teacher.name}</p>
                <p className="text-sm text-muted">{teacher.specialties[0]}</p>
              </div>
            </div>
            <dl className="flex flex-col gap-3 border-t border-line-soft pt-[18px] text-[15px]">
              <Row label="Lesson" value={order.label} />
              <Row label={isPack ? "First lesson" : "Date"} value={slot.date} />
              {slot.studentTime && <Row label="Your time" value={`${slot.studentTime} (${cityOf(currentStudent.timezone)})`} />}
              {slot.teacherTime && <Row label="Teacher's time" value={`${slot.teacherTime} (${teacher.city.split(",")[0]})`} />}
            </dl>
            <dl className="flex flex-col gap-3 border-t border-line-soft pt-[18px] text-[15px]">
              <Row label={isPack ? `${order.count} × ${formatUsd(teacher.priceUsd)}` : "Lesson price"} value={formatUsd(order.subtotal)} />
              <Row label="Package discount" value={order.discount > 0 ? `−${formatUsd(order.discount)}` : "—"} />
              <div className="mt-1.5 flex justify-between font-display text-xl font-extrabold">
                <dt>Total</dt>
                <dd>{formatUsd(order.total)}</dd>
              </div>
            </dl>
            <div className="flex gap-2">
              <label htmlFor="promo" className="sr-only">
                Promo code
              </label>
              <input
                id="promo"
                name="promo"
                placeholder="Promo code"
                className="h-[46px] min-w-0 flex-1 rounded-xl border border-line bg-white px-3.5 text-sm text-navy placeholder:text-muted/80 focus:border-teal-dark focus:outline-none"
              />
              <button type="button" className="h-[46px] rounded-xl border border-navy bg-white px-[18px] font-semibold text-navy hover:bg-beige">
                Apply
              </button>
            </div>
          </Card>

          <div className="flex flex-col gap-3 rounded-3xl bg-navy px-7 py-6 text-sm text-white">
            <h2 className="font-display text-[15px] font-bold">After payment</h2>
            <ul className="flex flex-col gap-3 text-ink-soft">
              <CheckItem className="gap-2.5" iconClassName="text-yellow">
                Booking confirmed for you and {firstName}
              </CheckItem>
              <CheckItem className="gap-2.5" iconClassName="text-yellow">
                Email, SMS and in-app reminders
              </CheckItem>
              <CheckItem className="gap-2.5" iconClassName="text-yellow">
                Join from your dashboard, no download
              </CheckItem>
            </ul>
          </div>
        </aside>
      </main>
    </>
  );
}
