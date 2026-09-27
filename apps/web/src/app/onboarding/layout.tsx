import { RoleGate } from "@/components/layout/role-gate";

/** The placement questionnaire is for students. */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <RoleGate space="student">{children}</RoleGate>;
}
