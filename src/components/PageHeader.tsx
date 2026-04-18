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
        "surface-grid relative overflow-hidden rounded-[2rem] border border-burgundy-100 bg-white/82 p-5 shadow-soft backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/78 sm:p-6",
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-burgundy-200/50 blur-3xl dark:bg-burgundy-800/30" />
      <div className="pointer-events-none absolute -bottom-24 left-10 h-40 w-40 rounded-full bg-amber-100/60 blur-3xl dark:bg-white/5" />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-2.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-burgundy-100 bg-burgundy-50/80 px-3 py-1 dark:border-zinc-800 dark:bg-zinc-900">
            <span className="h-2 w-2 rounded-full bg-burgundy-700 shadow-[0_0_0_4px_rgba(128,0,32,0.12)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-burgundy-700 dark:text-burgundy-200">Workspace</span>
          </div>
          <h1 className="font-display text-2xl font-black leading-tight tracking-tight text-charcoal dark:text-zinc-100 sm:text-3xl lg:text-[2.35rem]">{title}</h1>
          <p className="max-w-3xl text-sm font-medium leading-6 text-charcoal/65 dark:text-zinc-400 sm:text-[15px]">{subtitle}</p>
        </div>
        {action ? <div className="w-full sm:w-auto">{action}</div> : null}
      </div>
    </div>
  );
}
