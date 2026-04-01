import logoImage from "../assets/result-logo.svg";
import { cn } from "../lib/utils";

type LogoSize = "sm" | "md" | "lg";

const iconSizeClasses: Record<LogoSize, string> = {
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-12 w-12",
};

const titleSizeClasses: Record<LogoSize, string> = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-3xl",
};

interface BrandLogoProps {
  title: string;
  subtitle?: string;
  size?: LogoSize;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
}

export function BrandLogo({
  title,
  subtitle,
  size = "md",
  className,
  titleClassName,
  subtitleClassName,
}: BrandLogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <img
        src={logoImage}
        alt="Result logo"
        className={cn("rounded-2xl object-cover shadow-soft", iconSizeClasses[size])}
      />
      <div>
        <p className={cn("font-sans font-bold tracking-tight", titleSizeClasses[size], titleClassName)}>{title}</p>
        {subtitle ? (
          <p className={cn("text-xs font-medium text-charcoal/60 dark:text-zinc-400", subtitleClassName)}>{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
