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
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.25rem] border border-zinc-200 bg-white p-3.5 shadow-soft dark:border-zinc-800 dark:bg-zinc-950 sm:p-4",
        className,
      )}
    >
      <div className="relative flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="font-display text-lg font-black leading-tight tracking-tight text-charcoal dark:text-zinc-100 sm:text-xl">{title}</h1>
          <p className="max-w-3xl text-xs font-medium leading-5 text-charcoal/65 dark:text-zinc-400">{subtitle}</p>
        </div>
        {action ? <div className="w-full sm:w-auto">{action}</div> : null}
      </div>
    </div>
  );
}
