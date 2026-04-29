import { ChevronDown, Headset, LogOut, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useUi } from "../hooks/useUi";
import { cn } from "../lib/utils";
import { UserAvatar } from "./UserAvatar";

interface UserMenuProps {
  fullName: string;
  avatarUrl?: string;
  profileHref: string;
  supportHref?: string;
  onLogout: () => void;
}

export function UserMenu({ fullName, avatarUrl, profileHref, supportHref, onLogout }: UserMenuProps) {
  const { t } = useUi();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onEsc(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "inline-flex items-center gap-2 rounded-xl border border-burgundy-100 bg-white px-1.5 py-1.5 transition hover:border-burgundy-300 sm:px-2 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-burgundy-700",
          open && "border-burgundy-300 dark:border-burgundy-700",
        )}
      >
        <UserAvatar fullName={fullName} avatarUrl={avatarUrl} size="sm" />
        <span className="hidden max-w-[10rem] truncate text-sm font-semibold sm:inline">{fullName}</span>
        <ChevronDown className={cn("hidden h-4 w-4 text-charcoal/60 transition sm:inline-flex dark:text-zinc-300", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-burgundy-100 bg-white p-1 shadow-lift dark:border-zinc-700 dark:bg-zinc-900">
          <Link
            to={profileHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-charcoal/80 transition hover:bg-burgundy-50 hover:text-burgundy-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <User className="h-4 w-4" />
            {t("menu.profile")}
          </Link>

          {supportHref ? (
            <Link
              to={supportHref}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-charcoal/80 transition hover:bg-burgundy-50 hover:text-burgundy-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <Headset className="h-4 w-4" />
              {t("menu.support")}
            </Link>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-charcoal/85 transition hover:bg-burgundy-50 hover:text-burgundy-700 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            {t("ui.logout")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
