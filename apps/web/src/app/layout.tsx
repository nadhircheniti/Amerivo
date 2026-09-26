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

export const metadata: Metadata = {
  title: {
    default: "Amerivo English — Learn English Your Way",
    template: "%s · Amerivo English",
  },
  description:
    "Live one-on-one lessons with vetted American English teachers. Flexible, personalized, global.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
