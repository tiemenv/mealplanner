"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BookOpen, CalendarDays, Sparkles, UserCog, Users } from "lucide-react";

const links = [
  { href: "/planner", label: "Planner", icon: CalendarDays },
  { href: "/library", label: "Library", icon: BookOpen },
  { href: "/collections", label: "Collections", icon: Sparkles },
  { href: "/group", label: "Group", icon: Users },
  { href: "/account", label: "Account", icon: UserCog },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
