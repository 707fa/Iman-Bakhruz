import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex touch-manipulation items-center justify-center whitespace-nowrap rounded-2xl text-sm font-semibold transition-[transform,box-shadow,background-color,border-color,color] duration-300 focus-visible:outline-none focus-visible:ring-0 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.985]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-burgundy-500 via-burgundy-600 to-burgundy-700 text-white shadow-soft hover:-translate-y-0.5 hover:from-burgundy-400 hover:via-burgundy-500 hover:to-burgundy-600 hover:shadow-lift",
        secondary:
          "bg-white/95 text-burgundy-700 shadow-soft ring-1 ring-zinc-200/80 hover:-translate-y-0.5 hover:bg-burgundy-50 dark:bg-zinc-900/90 dark:text-zinc-100 dark:ring-zinc-700 dark:hover:bg-zinc-800",
        ghost:
          "text-charcoal/70 hover:bg-burgundy-100/65 hover:text-burgundy-700 dark:text-zinc-300 dark:hover:bg-burgundy-900/40 dark:hover:text-white",
        positive:
          "bg-gradient-to-b from-burgundy-50 to-burgundy-100/70 text-burgundy-700 shadow-soft ring-1 ring-burgundy-200 hover:from-burgundy-100 hover:to-burgundy-200/80 dark:bg-burgundy-900/35 dark:text-white dark:ring-burgundy-800 dark:hover:bg-burgundy-900/55",
        destructive:
          "bg-white text-zinc-900 shadow-soft ring-1 ring-zinc-300/90 hover:-translate-y-0.5 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-700 dark:hover:bg-zinc-800",
      },
      size: {
        default: "h-11 px-4 py-2 text-[15px] sm:h-10 sm:text-sm",
        sm: "h-9 rounded-xl px-3 text-xs",
        lg: "h-12 rounded-2xl px-6 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
