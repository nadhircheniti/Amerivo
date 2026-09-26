import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "teal" | "navy" | "outline" | "outlineLight" | "ghost" | "danger" | "dangerOutline" | "dashed";
export type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-orange text-navy hover:bg-[#ffa64d] font-bold", // main CTA: always navy text
  teal: "bg-teal-dark text-white hover:bg-[#12665d] font-semibold",
  navy: "bg-navy text-white hover:bg-[#0b2e47] font-semibold",
  outline: "border border-navy text-navy bg-white hover:bg-beige font-semibold",
  outlineLight: "border border-line text-navy bg-white hover:bg-beige",
  ghost: "text-teal-dark hover:text-navy font-semibold",
  danger: "bg-danger text-white hover:bg-[#a93226] font-bold",
  dangerOutline: "border border-danger text-[#a52f22] bg-white hover:bg-danger-100 font-semibold",
  dashed: "border border-dashed border-teal-dark bg-teal-50 text-navy font-semibold hover:bg-teal-100",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-12 px-6 text-[15px]",
  lg: "h-14 px-8 text-base",
};

function classes(variant: ButtonVariant, size: ButtonSize, className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
    variant !== "ghost" && sizes[size],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type="button" className={classes(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  href,
  children,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & { href: string; variant?: ButtonVariant; size?: ButtonSize; children: ReactNode }) {
  return (
    <Link href={href} className={classes(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}

/** Round icon-only button. Always pass an aria-label. */
export function IconButton({
  className,
  tone = "light",
  ...props
}: ComponentProps<"button"> & { "aria-label": string; tone?: "light" | "dark" | "accent" }) {
  const t = {
    light: "border border-sand bg-white text-navy hover:bg-beige",
    dark: "bg-white/12 text-white hover:bg-white/20",
    accent: "bg-orange text-navy hover:bg-[#ffa64d]",
  }[tone];
  return <button type="button" className={cn("inline-flex size-12 items-center justify-center rounded-full", t, className)} {...props} />;
}
