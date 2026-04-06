import { Badge } from "./ui/badge";
import type { StatusBadge as StatusBadgeType } from "../types";

interface StatusBadgeProps {
  status?: StatusBadgeType;
}

const styleMap: Record<StatusBadgeType, string> = {
  red: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  yellow: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
};

const labelMap: Record<StatusBadgeType, string> = {
  red: "Red",
  yellow: "Yellow",
  green: "Green",
};

export function StatusBadge({ status = "yellow" }: StatusBadgeProps) {
  return (
    <Badge className={styleMap[status]}>
      {labelMap[status]}
    </Badge>
  );
}
