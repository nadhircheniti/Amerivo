import type { Metadata } from "next";
import Link from "next/link";
import { AuthMain, OrDivider } from "../_components/auth-ui";
import { SocialButtons } from "../_components/social-buttons";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <AuthMain
      topRight={
        <>
          New to Amerivo?{" "}
          <Link href="/signup" className="font-semibold text-teal-dark hover:text-navy">
            Create an account
          </Link>
        </>
      }
    >
      <div className="flex w-full max-w-[560px] flex-col gap-[26px] lg:mt-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] font-extrabold sm:text-[34px]">Welcome back</h1>
          <p className="text-base text-navy-soft">Log in to book lessons and join your classroom.</p>
        </div>
        <SocialButtons mode="login" />
        <OrDivider />
        <LoginForm />
        <p className="text-center text-sm text-muted">
          Are you a teacher?{" "}
          <Link href="/teacher" className="font-semibold text-teal-dark hover:text-navy">
            Log in
          </Link>
        </p>
      </div>
    </AuthMain>
  );
}
