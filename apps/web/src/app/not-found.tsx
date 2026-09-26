import { ComingSoon } from "@/components/layout/coming-soon";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-beige">
      <ComingSoon title="Page not found" description="The page you're looking for doesn't exist or has moved." icon="search" backHref="/" backLabel="Back to home" />
    </div>
  );
}
