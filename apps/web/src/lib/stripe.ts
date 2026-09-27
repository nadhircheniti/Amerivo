"use client";

import { loadStripe, type Appearance, type Stripe } from "@stripe/stripe-js";
import { API_URL } from "./api";

const RAW_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null;

/**
 * Only a publishable key (pk_…) may reach the browser. A secret key (sk_…/rk_…) set here by mistake is
 * ignored so it is never handed to Stripe.js — roll that secret key in the Stripe dashboard.
 */
export const stripeKeyMisconfigured = !!RAW_KEY && !RAW_KEY.startsWith("pk_");
export const STRIPE_PUBLISHABLE_KEY = stripeKeyMisconfigured ? null : RAW_KEY;
if (stripeKeyMisconfigured && typeof window !== "undefined") {
  console.error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must be a publishable key (pk_…). A secret key must never be used in the website.");
}

/** Real card payments: needs the API and a Stripe publishable key. */
export const stripeEnabled = !!API_URL && !!STRIPE_PUBLISHABLE_KEY;

let stripePromise: Promise<Stripe | null> | null = null;
/** Loads Stripe.js once, only on the payment page. */
export const getStripe = () => (stripePromise ??= STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : Promise.resolve(null));

/** Stripe's payment form in the Amerivo colours. */
export const stripeAppearance: Appearance = {
  theme: "stripe",
  variables: {
    colorPrimary: "#177a70",
    colorText: "#0f3b5b",
    colorDanger: "#8e2a1e",
    colorBackground: "#ffffff",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    borderRadius: "14px",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": { border: "1px solid #d9d2c2", boxShadow: "none", padding: "14px" },
    ".Input:focus": { border: "1px solid #177a70", boxShadow: "0 0 0 3px rgba(47,183,168,.25)" },
    ".Tab": { border: "1px solid #d9d2c2", boxShadow: "none" },
    ".Tab--selected": { border: "2px solid #177a70", backgroundColor: "#f0faf8" },
    ".Label": { fontWeight: "600" },
  },
};
