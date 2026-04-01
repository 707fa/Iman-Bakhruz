import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em]",
  {
    variants: {
      variant: {
        default: "bg-burgundy-700 text-white",
        soft: "bg-burgundy-50 text-burgundy-700 dark:bg-burgundy-900/40 dark:text-burgundy-200",
        positive: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
        negative: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
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
