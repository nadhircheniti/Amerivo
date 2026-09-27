import { RoleGate } from "@/components/layout/role-gate";
import { AppSidebar, type SidebarItem } from "@/components/layout/app-sidebar";
import { Icon } from "@/components/ui/icon";
import { useTranslations } from "next-intl";

type NavKey = "analytics" | "teachers" | "students" | "bookings" | "payments" | "disputes" | "settings";
const nav: (Omit<SidebarItem, "label"> & { key: NavKey })[] = [
  { key: "analytics", href: "/admin", icon: "chart", exact: true },
  { key: "teachers", href: "/admin/teachers", icon: "user", badge: { text: "5" } },
  { key: "students", href: "/admin/students", icon: "users" },
  { key: "bookings", href: "/admin/bookings", icon: "calendar" },
  { key: "payments", href: "/admin/payments", icon: "wallet" },
  { key: "disputes", href: "/admin/disputes", icon: "shield", badge: { text: "2", tone: "danger" } },
  { key: "settings", href: "/admin/settings", icon: "settings" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("admin.nav");
  const items: SidebarItem[] = nav.map(({ key, ...item }) => ({ ...item, label: t(key) }));
  return (
    <RoleGate space="admin">
      <div className="flex min-h-screen bg-beige-2">
        <AppSidebar
          variant="admin"
          items={items}
          footer={
            <div className="flex items-center gap-2 rounded-xl bg-beige-2 p-3 text-xs text-muted">
              <Icon name="shieldCheck" size={16} className="text-teal-dark" strokeWidth={2} />
              {t("signedIn2fa")}
            </div>
          }
        />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </RoleGate>
  );
}
