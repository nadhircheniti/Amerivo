import type { Metadata } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/montserrat/800.css";
import "@fontsource/caveat/600.css";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { CLERK_PUBLISHABLE_KEY, clerkEnabled } from "@/lib/auth-config";

export const metadata: Metadata = {
  title: {
    default: "Amerivo English — Learn English Your Way",
    template: "%s · Amerivo English",
  },
  description: "Live one-on-one lessons with vetted American English teachers. Flexible, personalized, global.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const page = (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
  // Without Clerk keys the site runs in demo mode (no provider, forms just navigate).
  return clerkEnabled ? (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY!} signInUrl="/login" signUpUrl="/signup">
      {page}
    </ClerkProvider>
  ) : (
    page
  );
}
