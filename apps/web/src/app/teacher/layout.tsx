import { AppSidebar, type SidebarItem } from "@/components/layout/app-sidebar";
import { currentTeacher } from "@/lib/mock-data";

const items: SidebarItem[] = [
  { href: "/teacher", label: "Overview", icon: "home", exact: true },
  { href: "/teacher/availability", label: "Schedule & availability", icon: "calendar" },
  { href: "/teacher/students", label: "Students", icon: "users" },
  { href: "/teacher/messages", label: "Messages", icon: "message", badge: { text: "3" } },
  { href: "/teacher/earnings", label: "Earnings", icon: "wallet" },
  { href: `/teachers/${currentTeacher.slug}`, label: "My public profile", icon: "user" },
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-beige">
      <AppSidebar
        variant="teacher"
        items={items}
        user={{ name: currentTeacher.name, subtitle: "Approved teacher", initials: currentTeacher.initials, tone: currentTeacher.tone }}
      />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
