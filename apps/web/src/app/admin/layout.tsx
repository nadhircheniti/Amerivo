import { RoleGate } from "@/components/layout/role-gate";
import { AppSidebar, type SidebarItem } from "@/components/layout/app-sidebar";
import { Icon } from "@/components/ui/icon";

const items: SidebarItem[] = [
  { href: "/admin", label: "Analytics", icon: "chart", exact: true },
  { href: "/admin/teachers", label: "Teachers", icon: "user", badge: { text: "5" } },
  { href: "/admin/students", label: "Students", icon: "users" },
  { href: "/admin/bookings", label: "Bookings", icon: "calendar" },
  { href: "/admin/payments", label: "Payments & payouts", icon: "wallet" },
  { href: "/admin/disputes", label: "Disputes & refunds", icon: "shield", badge: { text: "2", tone: "danger" } },
  { href: "/admin/settings", label: "Settings & audit log", icon: "settings" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate space="admin">
      <div className="flex min-h-screen bg-beige-2">
        <AppSidebar
          variant="admin"
          items={items}
          footer={
            <div className="flex items-center gap-2 rounded-xl bg-beige-2 p-3 text-xs text-muted">
              <Icon name="shieldCheck" size={16} className="text-teal-dark" strokeWidth={2} />
              Signed in with 2FA
            </div>
          }
        />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </RoleGate>
  );
}
