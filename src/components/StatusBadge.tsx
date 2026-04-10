import { Badge } from "./ui/badge";
import type { StatusBadge as StatusBadgeType } from "../types";

interface StatusBadgeProps {
  status?: StatusBadgeType;
}

const styleMap: Record<StatusBadgeType, string> = {
  red: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  yellow: "bg-burgundy-50 text-burgundy-700 dark:bg-burgundy-900/35 dark:text-white",
  green: "bg-burgundy-100 text-burgundy-700 dark:bg-burgundy-900/45 dark:text-white",
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

