import type { Metadata } from "next";
import Link from "next/link";
import { AuthMain, OrDivider, SignupSteps } from "../_components/auth-ui";
import { SocialButtons } from "../_components/social-buttons";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create your account" };

export default function SignupPage() {
  return (
    <AuthMain
      topRight={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-teal-dark hover:text-navy">
            Log in
          </Link>
        </>
      }
    >
      <SignupSteps current={1} />
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-extrabold sm:text-[34px]">Create your student account</h1>
        <p className="text-base text-navy-soft">It takes less than a minute.</p>
      </div>
      <SocialButtons next="/onboarding/goals" />
      <OrDivider />
      <SignupForm />
      <p className="text-center text-sm text-muted">
        Want to teach?{" "}
        <Link href="/teach/apply" className="font-semibold text-teal-dark hover:text-navy">
          Apply as a teacher
        </Link>
      </p>
    </AuthMain>
  );
}
