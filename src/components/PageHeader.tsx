import type { ReactNode } from "react";
import { cn } from "../lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  action?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold leading-tight text-charcoal dark:text-zinc-100 sm:text-3xl lg:text-4xl">{title}</h1>
        <p className="max-w-2xl text-sm text-charcoal/65 dark:text-zinc-400 sm:text-base">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
