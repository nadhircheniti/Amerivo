import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

/** Pages that need a signed-in user. Role checks are done by the API. */
const isProtected = createRouteMatcher([
  "/student",
  "/student/(.*)",
  "/teacher",
  "/teacher/(.*)",
  "/admin",
  "/admin/(.*)",
  "/classroom/(.*)",
  "/onboarding",
  "/onboarding/(.*)",
  "/welcome",
  "/accept-terms",
]);

const withClerk = clerkMiddleware(async (auth, req) => {
  if (!isProtected(req)) return;
  const { userId } = await auth();
  if (!userId) {
    const url = new URL("/login", req.url);
    url.searchParams.set("redirect_url", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
});

/** Demo mode (no Clerk keys): every page stays open. */
export default clerkEnabled ? withClerk : () => NextResponse.next();

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
