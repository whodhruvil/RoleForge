"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Workspace" },
  { href: "/history", label: "History" },
  { href: "/generated", label: "Generated" },
  { href: "/settings", label: "Settings" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

type TopNavigationProps = {
  orientation?: "horizontal" | "vertical";
  onNavigate?: () => void;
};

export default function TopNavigation({ orientation = "horizontal", onNavigate }: TopNavigationProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        orientation === "horizontal"
          ? "no-scrollbar flex max-w-[58vw] items-center gap-6 overflow-x-auto sm:max-w-none"
          : "flex flex-col items-stretch gap-1",
      )}
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn("top-nav-link", active && "top-nav-link-active")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
