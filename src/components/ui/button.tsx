import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex touch-manipulation items-center justify-center whitespace-nowrap rounded-2xl text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burgundy-300 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.99]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-burgundy-500 via-burgundy-600 to-burgundy-700 text-white shadow-soft hover:-translate-y-0.5 hover:from-burgundy-400 hover:via-burgundy-500 hover:to-burgundy-600 hover:shadow-lift",
        secondary:
          "border border-burgundy-300/80 bg-white text-burgundy-700 shadow-soft hover:-translate-y-0.5 hover:border-burgundy-400 hover:bg-burgundy-50 dark:border-burgundy-800/70 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800",
        ghost:
          "text-charcoal/70 hover:bg-burgundy-50 hover:text-burgundy-700 dark:text-zinc-300 dark:hover:bg-burgundy-900/35 dark:hover:text-white",
        positive:
          "border border-burgundy-200 bg-gradient-to-b from-burgundy-50 to-burgundy-100/75 text-burgundy-700 hover:border-burgundy-300 hover:from-burgundy-100 hover:to-burgundy-200/80 dark:border-burgundy-800 dark:bg-burgundy-900/35 dark:text-white dark:hover:bg-burgundy-900/55",
        destructive:
          "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800",
      },
      size: {
        default: "h-11 px-4 py-2 text-[15px] sm:h-10 sm:text-sm",
        sm: "h-9 rounded-xl px-3 text-xs",
        lg: "h-11 rounded-xl px-6",
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
