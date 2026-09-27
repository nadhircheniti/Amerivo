import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { FocusHeader } from "@/components/layout/focus-header";
import { Card } from "@/components/ui/primitives";
import { CompletePayment } from "./complete-payment";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("checkout.complete");
  return { title: t("metaTitle") };
}

/** Stripe sends the student back here after a bank page (3-D Secure, PayPal…). */
export default function CheckoutCompletePage() {
  return (
    <>
      <FocusHeader />
      <main className="mx-auto flex max-w-[720px] px-4 py-12 sm:px-6">
        <Card className="flex w-full flex-col items-center gap-5 p-8 text-center sm:p-12">
          <Suspense>
            <CompletePayment />
          </Suspense>
        </Card>
      </main>
    </>
  );
}
