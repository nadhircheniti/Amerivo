"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const labels = ["poor", "fair", "good", "veryGood", "excellent"] as const;

export function ReviewForm({ teacherFirstName }: { teacherFirstName: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const shown = hover || rating;
  const t = useTranslations("student.review");

  if (submitted) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl bg-teal-50 p-5" role="status">
        <span className="flex items-center gap-2 font-display text-lg font-bold">
          <Icon name="check" size={20} strokeWidth={2.4} className="text-teal-dark" />
          {t("thanks")}
        </span>
        <p className="text-sm leading-relaxed text-navy-soft">
          {t("rated", { rating })} {review.trim() ? t("willAppear", { name: teacherFirstName }) : t("helps", { name: teacherFirstName })}
        </p>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-[18px]"
      onSubmit={(e) => {
        e.preventDefault();
        if (!rating) return;
        // TODO(api): POST /lessons/:id/review
        setSubmitted(true);
      }}
    >
      <fieldset>
        <legend className="sr-only">{t("legend")}</legend>
        <div className="flex flex-wrap items-center gap-2" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              onMouseEnter={() => setHover(n)}
              className="flex size-[52px] cursor-pointer items-center justify-center rounded-[14px] border border-line-soft bg-white hover:bg-beige has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-teal"
            >
              <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="sr-only" />
              <span className="sr-only">{t("starOption", { count: n, label: t(`labels.${labels[n - 1]}`) })}</span>
              <svg width="30" height="30" viewBox="0 0 24 24" strokeWidth="1.2" aria-hidden="true" className={cn("stroke-orange-dark", n <= shown ? "fill-orange" : "fill-white")}>
                <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
              </svg>
            </label>
          ))}
          <span className="ms-2 text-sm text-muted" aria-hidden="true">
            {shown ? t(`labels.${labels[shown - 1]}`) : t("tapToRate")}
          </span>
        </div>
      </fieldset>

      <Field label={t("writeReview")}>
        <Textarea rows={4} value={review} onChange={(e) => setReview(e.target.value)} placeholder={t("placeholder", { name: teacherFirstName })} className="text-[15px]" />
      </Field>

      <Button type="submit" disabled={!rating} className="h-auto py-[15px]">
        {t("submit")}
      </Button>
    </form>
  );
}
