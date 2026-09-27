import { useTranslations } from "next-intl";
import { RoleGate } from "@/components/layout/role-gate";
import { AppSidebar, type SidebarItem } from "@/components/layout/app-sidebar";
import { currentTeacher } from "@/lib/mock-data";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("teacher.layout");
  const items: SidebarItem[] = [
    { href: "/teacher", label: t("overview"), icon: "home", exact: true },
    { href: "/teacher/availability", label: t("availability"), icon: "calendar" },
    { href: "/teacher/students", label: t("students"), icon: "users" },
    { href: "/teacher/messages", label: t("messages"), icon: "message" },
    { href: "/teacher/earnings", label: t("earnings"), icon: "wallet" },
    { href: "/teacher/profile", label: t("publicProfile"), icon: "user" },
  ];

  return (
    <RoleGate space="teacher">
      <div className="flex min-h-screen bg-beige">
        <AppSidebar
          variant="teacher"
          items={items}
          user={{ name: currentTeacher.name, subtitle: t("approvedTeacher"), initials: currentTeacher.initials, tone: currentTeacher.tone }}
        />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </RoleGate>
  );
}
