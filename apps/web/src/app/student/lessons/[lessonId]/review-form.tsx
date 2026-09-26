"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const labels = ["Poor", "Fair", "Good", "Very good", "Excellent"];

export function ReviewForm({ teacherFirstName }: { teacherFirstName: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const shown = hover || rating;

  if (submitted) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl bg-teal-50 p-5" role="status">
        <span className="flex items-center gap-2 font-display text-lg font-bold">
          <Icon name="check" size={20} strokeWidth={2.4} className="text-teal-dark" />
          Thanks for your review!
        </span>
        <p className="text-sm leading-relaxed text-navy-soft">
          You rated this lesson {rating} out of 5.{" "}
          {review.trim() ? `Your review will appear on ${teacherFirstName}'s public profile.` : `Your rating helps ${teacherFirstName} and other students.`}
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
        <legend className="sr-only">Rating</legend>
        <div className="flex flex-wrap items-center gap-2" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              onMouseEnter={() => setHover(n)}
              className="flex size-[52px] cursor-pointer items-center justify-center rounded-[14px] border border-line-soft bg-white hover:bg-beige has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-teal"
            >
              <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="sr-only" />
              <span className="sr-only">
                {n} star{n > 1 ? "s" : ""} – {labels[n - 1]}
              </span>
              <svg width="30" height="30" viewBox="0 0 24 24" strokeWidth="1.2" aria-hidden="true" className={cn("stroke-orange-dark", n <= shown ? "fill-orange" : "fill-white")}>
                <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
              </svg>
            </label>
          ))}
          <span className="ml-2 text-sm text-muted" aria-hidden="true">
            {shown ? labels[shown - 1] : "Tap a star to rate"}
          </span>
        </div>
      </fieldset>

      <Field label="Write a review (optional)">
        <Textarea
          rows={4}
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder={`What did you like? This will appear on ${teacherFirstName}'s public profile.`}
          className="text-[15px]"
        />
      </Field>

      <Button type="submit" disabled={!rating} className="h-auto py-[15px]">
        Submit review
      </Button>
    </form>
  );
}
