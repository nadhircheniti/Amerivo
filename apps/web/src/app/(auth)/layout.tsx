import { BrandPanel } from "./_components/brand-panel";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white lg:flex-row">
      <BrandPanel />
      {children}
    </div>
  );
}
