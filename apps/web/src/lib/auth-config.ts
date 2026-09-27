/**
 * Authentication mode of the web app:
 * - "clerk": NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is set → real sign-up / sign-in.
 * - "dev":   local development with NEXT_PUBLIC_DEV_USER (API must run with DEV_AUTH=1).
 * - "demo":  neither → screens work on sample data, forms just navigate.
 */
export const CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || null;
export const clerkEnabled = !!CLERK_PUBLISHABLE_KEY;
export const authMode: "clerk" | "dev" | "demo" = clerkEnabled ? "clerk" : process.env.NEXT_PUBLIC_DEV_USER ? "dev" : "demo";

/** Where each role lands after signing in. */
export const homeForRole = (role: string | undefined) => (role === "teacher" ? "/teacher" : role === "admin" ? "/admin" : "/student");
