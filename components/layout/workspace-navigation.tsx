"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface WorkspaceNavItem {
  href: string;
  label: string;
  icon: IconName;
}

type IconName =
  | "home"
  | "spark"
  | "document"
  | "briefcase"
  | "users"
  | "pin"
  | "store"
  | "wrench"
  | "message"
  | "chart"
  | "team"
  | "plan"
  | "settings";

export const WORKSPACE_NAV_ITEMS: WorkspaceNavItem[] = [
  { href: "/command-center", label: "Business Command Center", icon: "home" },
  { href: "/opportunities", label: "Opportunities", icon: "spark" },
  { href: "/quotes", label: "Quotes", icon: "document" },
  { href: "/jobs", label: "Jobs", icon: "briefcase" },
  { href: "/customers", label: "Customers", icon: "users" },
  { href: "/properties", label: "Properties", icon: "pin" },
  { href: "/storefront", label: "Storefront", icon: "store" },
  { href: "/services", label: "Services", icon: "wrench" },
  { href: "/messages", label: "Messages", icon: "message" },
  { href: "/analytics", label: "Analytics", icon: "chart" },
  { href: "/team", label: "Team", icon: "team" },
  { href: "/business-plan", label: "Business Plan", icon: "plan" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export function isWorkspaceRouteActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function WorkspaceNavigation({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className={mobile ? "space-y-1" : "space-y-0.5"}>
      {WORKSPACE_NAV_ITEMS.map((item) => {
        const active = isWorkspaceRouteActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={[
              "group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
              mobile ? "py-2.5" : "py-2",
              active
                ? "bg-emerald-50 text-emerald-800"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
            ].join(" ")}
          >
            <NavIcon name={item.icon} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

function NavIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, string> = {
    home: "M3 10.5 12 3l9 7.5M5.25 9.5V21h13.5V9.5M9 21v-6h6v6",
    spark: "m12 3 1.2 4.2L17 9l-3.8 1.8L12 15l-1.2-4.2L7 9l3.8-1.8L12 3ZM5 16l.7 2.3L8 19l-2.3.7L5 22l-.7-2.3L2 19l2.3-.7L5 16Z",
    document: "M6 3h8l4 4v14H6V3Zm8 0v5h4M9 12h6M9 16h6",
    briefcase: "M4 7h16v13H4V7Zm5 0V4h6v3M4 12h16M10 12v2h4v-2",
    users: "M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7-1a3 3 0 1 0 0-6M2 21a6 6 0 0 1 12 0m1-6a5 5 0 0 1 7 4.6",
    pin: "M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Zm-8 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
    store: "M4 10v11h16V10M3 4h18l-1 6a3 3 0 0 1-5 1 3 3 0 0 1-6 0 3 3 0 0 1-5-1L3 4Zm5 17v-6h8v6",
    wrench: "M14 6a5 5 0 0 0-6 6L3 17l4 4 5-5a5 5 0 0 0 6-6l-3 3-4-4 3-3Z",
    message: "M4 4h16v13H9l-5 4V4Zm4 5h8m-8 4h5",
    chart: "M4 21V10m6 11V3m6 18v-7m5 7H2",
    team: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-1a3 3 0 1 0 0-6M2 21a7 7 0 0 1 14 0m1-6a5 5 0 0 1 5 5",
    plan: "M5 3h14v18H5V3Zm4 5h6m-6 4h6m-6 4h4",
    settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm8-3.5 2-1-2-4-2.2.5L16 5l.2-2.3-4.2-1-1.2 2-3-.1L6.5 1.8 3 4l.5 2.2L2 8l-2.2.2v4.3L2 13l1.5 1.8L3 17l3.5 2.2 1.3-1.8 3 .1 1.2 2 4.2-1 .1-2.3 1.7-2.5 2 .3Z",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 shrink-0"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
