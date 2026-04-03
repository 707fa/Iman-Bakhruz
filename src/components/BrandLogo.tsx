import logoImage from "../assets/Iman-behruz.jpg";
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
    <div className={cn("inline-flex min-w-0 items-center gap-3", className)}>
      <img
        src={logoImage}
        alt="Iman | Bekhruz logo"
        className={cn("rounded-2xl object-cover shadow-soft", iconSizeClasses[size])}
      />
      <div className="min-w-0">
        <p className={cn("truncate whitespace-nowrap font-sans font-bold leading-none tracking-tight", titleSizeClasses[size], titleClassName)}>{title}</p>
        {subtitle ? (
          <p className={cn("truncate text-xs font-medium text-charcoal/60 dark:text-zinc-400", subtitleClassName)}>{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
