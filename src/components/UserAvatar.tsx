import { cn } from "../lib/utils";

interface UserAvatarProps {
  fullName: string;
  avatarUrl?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap: Record<NonNullable<UserAvatarProps["size"]>, string> = {
  sm: "h-10 w-10 text-sm",
  md: "h-12 w-12 text-base",
  lg: "h-16 w-16 text-xl",
};

export function UserAvatar({ fullName, avatarUrl, size = "md", className }: UserAvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={fullName}
        className={cn("rounded-full border border-burgundy-200 object-cover dark:border-zinc-600", sizeMap[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "grid place-content-center rounded-full border border-burgundy-200 bg-burgundy-50 font-semibold uppercase text-burgundy-700",
        "dark:border-zinc-600 dark:bg-zinc-800 dark:text-white",
        sizeMap[size],
        className,
      )}
    >
      {fullName.slice(0, 1)}
    </div>
  );
}

