import { PageHeader } from "../components/PageHeader";
import { SupportTicketsCard } from "../components/SupportTicketsCard";
import { Card, CardContent } from "../components/ui/card";
import { useAppStore } from "../hooks/useAppStore";

export function SupportPage() {
  const { state } = useAppStore();
  const role = state.session?.role;

  if (role !== "student" && role !== "teacher") {
    return (
      <div className="space-y-6">
        <PageHeader title="Support" subtitle="Support center is available for students and teachers." />
        <Card>
          <CardContent className="p-6 text-sm text-charcoal/70 dark:text-zinc-300">Support is not available for this account type.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Support" subtitle="Create and manage support requests privately." />
      <SupportTicketsCard role={role} />
    </div>
  );
}
