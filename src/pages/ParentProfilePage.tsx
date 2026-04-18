import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { UserAvatar } from "../components/UserAvatar";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useAppStore } from "../hooks/useAppStore";

export function ParentProfilePage() {
  const { currentParent, currentParentStudent } = useAppStore();

  if (!currentParent) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Профиль родителя" subtitle="Данные родительского аккаунта и привязанный ребёнок." />

      <Card className="overflow-hidden border-burgundy-200/80 shadow-lift">
        <CardContent className="grid gap-4 bg-gradient-to-r from-burgundy-900 via-burgundy-800 to-burgundy-700 px-4 py-5 text-white sm:grid-cols-[auto_1fr] sm:px-5 sm:py-6">
          <UserAvatar fullName={currentParent.fullName} avatarUrl={currentParent.avatarUrl} size="lg" />
          <div className="space-y-1">
            <p className="text-lg font-semibold sm:text-2xl">{currentParent.fullName}</p>
            <p className="text-sm text-white/80">{currentParent.phone}</p>
            <p className="text-sm text-white/80">
              Привязанный ребёнок: {currentParentStudent?.fullName ?? "не привязан"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Link to="/parent">
        <Button variant="secondary">Открыть родительский кабинет</Button>
      </Link>
    </div>
  );
}
