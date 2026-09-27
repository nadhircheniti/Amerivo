import { RoleGate } from "@/components/layout/role-gate";
import { AppSidebar, type SidebarItem } from "@/components/layout/app-sidebar";
import { currentStudent } from "@/lib/mock-data";

const items: SidebarItem[] = [
  { href: "/student", label: "Overview", icon: "home", exact: true },
  { href: "/student/lessons", label: "My lessons", icon: "calendar" },
  { href: "/teachers", label: "Find teachers", icon: "search" },
  { href: "/student/messages", label: "Messages", icon: "message", badge: { text: "2" } },
  { href: "/student/homework", label: "Homework", icon: "book" },
  { href: "/student/progress", label: "Progress", icon: "chart" },
  { href: "/student/payments", label: "Payments", icon: "wallet" },
  { href: "/student/settings", label: "Settings", icon: "settings" },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate space="student">
      <div className="flex min-h-screen bg-beige">
        <AppSidebar
          variant="student"
          items={items}
          user={{ name: currentStudent.name, subtitle: `Student · Level ${currentStudent.level}`, initials: currentStudent.initials, tone: currentStudent.tone }}
        />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </RoleGate>
  );
}
