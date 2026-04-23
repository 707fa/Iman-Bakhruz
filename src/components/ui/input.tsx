import * as React from "react";
import { cn } from "../../lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-2xl bg-white/96 px-3.5 py-2 text-base text-charcoal shadow-soft ring-1 ring-zinc-200/80 transition-[box-shadow,background-color] duration-200 placeholder:text-charcoal/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burgundy-300 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:text-sm dark:bg-zinc-900/95 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:ring-zinc-700",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
