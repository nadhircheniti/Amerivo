import type common from "../../messages/en/common.json";
import type marketing from "../../messages/en/marketing.json";
import type auth from "../../messages/en/auth.json";
import type onboarding from "../../messages/en/onboarding.json";
import type checkout from "../../messages/en/checkout.json";
import type student from "../../messages/en/student.json";
import type teacher from "../../messages/en/teacher.json";
import type apply from "../../messages/en/apply.json";
import type admin from "../../messages/en/admin.json";
import type classroom from "../../messages/en/classroom.json";
import type { Locale } from "./config";

/** English files are the reference: t("…") keys are type-checked against them. */
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: {
      common: typeof common;
      marketing: typeof marketing;
      auth: typeof auth;
      onboarding: typeof onboarding;
      checkout: typeof checkout;
      student: typeof student;
      teacher: typeof teacher;
      apply: typeof apply;
      admin: typeof admin;
      classroom: typeof classroom;
    };
  }
}
