import { useTranslations } from "next-intl";
import { RoleGate } from "@/components/layout/role-gate";
import { AppSidebar, type SidebarItem } from "@/components/layout/app-sidebar";
import { currentStudent } from "@/lib/mock-data";

const items = [
  { href: "/student", key: "overview", icon: "home", exact: true },
  { href: "/student/lessons", key: "lessons", icon: "calendar" },
  { href: "/teachers", key: "findTeachers", icon: "search" },
  { href: "/student/messages", key: "messages", icon: "message" },
  { href: "/student/homework", key: "homework", icon: "book" },
  { href: "/student/progress", key: "progress", icon: "chart" },
  { href: "/student/payments", key: "payments", icon: "wallet" },
  { href: "/student/settings", key: "settings", icon: "settings" },
] as const satisfies (Omit<SidebarItem, "label"> & { key: string })[];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("student.nav");
  const sidebarItems: SidebarItem[] = items.map(({ key, ...item }) => ({ ...item, label: t(key) }));
  return (
    <RoleGate space="student">
      <div className="flex min-h-screen bg-beige">
        <AppSidebar
          variant="student"
          items={sidebarItems}
          user={{ name: currentStudent.name, subtitle: t("userSubtitle", { level: currentStudent.level }), initials: currentStudent.initials, tone: currentStudent.tone }}
        />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </RoleGate>
  );
}
