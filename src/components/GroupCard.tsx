import { ArrowRight, CalendarDays, Clock3, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useUi } from "../hooks/useUi";
import type { Group, Student } from "../types";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

interface GroupCardProps {
  group: Group;
  students: Student[];
}

export function GroupCard({ group, students }: GroupCardProps) {
  const { t } = useUi();

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="bg-gradient-to-r from-burgundy-800 to-burgundy-700 p-4 text-white sm:p-5">
          <h3 className="text-lg font-semibold sm:text-xl">{group.title}</h3>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-white/85">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-4 w-4" />
              {group.time}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {t(`days.${group.daysPattern}`)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {t("teacher.studentsCount", { count: students.length })}
            </span>
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <Link to={`/teacher/group/${group.id}`}>
            <Button variant="secondary" className="w-full justify-between">
              {t("teacher.openGroup")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
