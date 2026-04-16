import { GrammarTopicsCard } from "../components/GrammarTopicsCard";
import { PageHeader } from "../components/PageHeader";

export function TeacherToolsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Teacher Tools"
        subtitle="Manage grammar materials."
      />

      <GrammarTopicsCard role="teacher" />
    </div>
  );
}
