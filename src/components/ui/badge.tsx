import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em]",
  {
    variants: {
      variant: {
        default: "border-burgundy-700 bg-burgundy-700 text-white",
        soft: "border-burgundy-800 bg-burgundy-800 text-white dark:border-burgundy-700 dark:bg-burgundy-800 dark:text-white",
        positive: "border-burgundy-200 bg-burgundy-100 text-burgundy-700 dark:border-burgundy-800 dark:bg-burgundy-900/45 dark:text-white",
        negative: "border-zinc-200 bg-zinc-100 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
