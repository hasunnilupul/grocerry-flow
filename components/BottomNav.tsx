"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDaysIcon,
  ClipboardListIcon,
  HistoryIcon,
  PlusCircleIcon,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Month", Icon: CalendarDaysIcon },
  { href: "/log", label: "Log", Icon: PlusCircleIcon },
  { href: "/plan", label: "Plan", Icon: ClipboardListIcon },
  { href: "/history", label: "History", Icon: HistoryIcon },
];

/** `/log/new` should still light up the "Log" tab, but `/history` must not
 *  light up "Month" just because every path starts with "/". */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function BottomNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-md items-stretch">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="size-5" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
